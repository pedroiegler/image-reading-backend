import { FastifyRequest, FastifyReply } from 'fastify';
import { postUploadReading } from '../controllers/upload';
import { pool } from '../database/connection';
import { geminiApiRequest } from '../services/gemini';
import fs from 'fs';

jest.mock('../database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

jest.mock('../services/gemini', () => ({
  geminiApiRequest: jest.fn(),
}));

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
  },
}));

describe('postUploadReading', () => {
  const mockReply = () => {
    const reply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    return reply as unknown as FastifyReply;
  };

  const mockRequest = (body: any): FastifyRequest => ({
    body,
  } as unknown as FastifyRequest);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar erro 400 para imagem inválida', async () => {
    const request = mockRequest({
      image: 'invalid_base64',
      customer_code: '123',
      measure_datetime: '2024-04-01',
      measure_type: 'WATER',
    });
    const reply = mockReply();

    await postUploadReading(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: 'INVALID_DATA',
      error_description: 'Imagem inválida (não é base64 ou tipo não suportado)',
      example: 'Exemplo válido: data:image/jpg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
    });
  });

  it('deve retornar erro 400 se a imagem base64 estiver mal formatada (sem conteúdo após vírgula)', async () => {
    const request = mockRequest({
      image: 'data:image/jpeg;base64,',
      customer_code: '123',
      measure_datetime: '2024-04-01',
      measure_type: 'WATER',
    });
  
    const reply = mockReply();
  
    await postUploadReading(request, reply);
  
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: 'INVALID_DATA',
      error_description: 'Imagem em base64 mal formatada.',
    });
  });

  it('deve retornar erro 400 se a string base64 não puder ser decodificada', async () => {
    const originalBufferFrom = Buffer.from;
    jest.spyOn(Buffer, 'from').mockImplementationOnce(() => {
      throw new Error('Decoding error');
    });
  
    const request = mockRequest({
      image: 'data:image/jpeg;base64,abc123',
      customer_code: '123',
      measure_datetime: '2024-04-01',
      measure_type: 'WATER',
    });
  
    const reply = mockReply();
  
    await postUploadReading(request, reply);
  
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: 'INVALID_DATA',
      error_description: 'A string base64 não pôde ser decodificada.',
    });
  
    Buffer.from = originalBufferFrom;
  });

  it('deve retornar erro 400 para tipo de medida inválido', async () => {
    const request = mockRequest({
      image: 'data:image/jpeg;base64,abc123',
      customer_code: '123',
      measure_datetime: '2024-04-01',
      measure_type: 'INVALID',
    });
    const reply = mockReply();

    await postUploadReading(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: 'INVALID_DATA',
      error_description: 'Tipo de medida inválido (deve ser WATER ou GAS)',
    });
  });

  it('deve inserir novo cliente se customer_code não existir na base', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({});
  
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

    (geminiApiRequest as jest.Mock).mockResolvedValue('123.45');
  
    const request = mockRequest({
      image: 'data:image/jpeg;base64,aGVsbG8=',
      customer_code: '321',
      measure_datetime: '2024-05-01',
      measure_type: 'WATER',
    });

    const reply = mockReply();

    await postUploadReading(request, reply);

    expect(pool.query).toHaveBeenCalledWith(
      `SELECT 1 FROM customers WHERE customer_code = $1`,
      ['321']
    );
  
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO customers'),
      ['321', 'Cliente 321', 'cliente_321@dominio.com']
    );
  });

  it('deve retornar erro 409 se leitura já foi registrada', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 });

    const request = mockRequest({
      image: 'data:image/jpeg;base64,abc123',
      customer_code: '123',
      measure_datetime: '2024-04-01',
      measure_type: 'WATER',
    });
    const reply = mockReply();

    await postUploadReading(request, reply);

    expect(reply.status).toHaveBeenCalledWith(409);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: 'DOUBLE_REPORT',
      error_description: 'Leitura do mês já realizada',
    });
  });

  it('deve retornar erro 500 ao ocorrer uma falha inesperada', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('Erro inesperado'));

    const request = mockRequest({
      image: 'data:image/jpeg;base64,aGVsbG8=',
      customer_code: 'ERR123',
      measure_datetime: '2025-04-29T00:00:00Z',
      measure_type: 'WATER',
    });

    const reply = mockReply();

    await postUploadReading(request, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: 'INTERNAL_ERROR',
      error_description: 'Ocorreu um erro interno no servidor.',
    });
  });

  it('deve registrar leitura com sucesso, inserindo cliente e retornando status 200', async () => {
    const mockQuery = pool.query as jest.Mock;

    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    mockQuery.mockResolvedValueOnce({});
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    mockQuery.mockResolvedValueOnce({});

    (geminiApiRequest as jest.Mock).mockResolvedValue('123.45');
    
    let port = Number(process.env.PORT) || 3000

    const request = {
      body: {
        image: 'data:image/jpeg;base64,aGVsbG8=',
        customer_code: '123',
        measure_datetime: '2024-04-01',
        measure_type: 'WATER',
      },
      headers: {
        host: `localhost:${port}`,
      },
      protocol: 'http',
    } as any;

    const status = jest.fn().mockReturnThis();
    const send = jest.fn();

    const reply = {
      status,
      send,
    } as any;

    await postUploadReading(request, reply);

    expect(pool.query).toHaveBeenNthCalledWith(1,
      `SELECT 1 FROM customers WHERE customer_code = $1`,
      ['123']
    );

    expect(pool.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining('INSERT INTO customers'),
      expect.arrayContaining(['123'])
    );

    expect(pool.query).toHaveBeenNthCalledWith(3,
      expect.stringContaining('FROM images'),
      ['123', 'WATER', '2024-04-01']
    );

    expect(pool.query).toHaveBeenNthCalledWith(4,
      expect.stringContaining('INSERT INTO images'),
      expect.arrayContaining(['123', expect.stringContaining('localhost'), '2024-04-01', 'WATER', 123.45, 'mocked-uuid'])
    );

    expect(geminiApiRequest).toHaveBeenCalled();

    expect(fs.promises.writeFile).toHaveBeenCalled();

    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      image_url: expect.stringContaining('localhost'),
      measure_value: 123.45,
      measure_uuid: 'mocked-uuid',
    }));
  });
});