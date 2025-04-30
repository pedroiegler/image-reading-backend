import { FastifyRequest, FastifyReply } from 'fastify';
import { postUploadReading } from '../controllers/upload';
import { pool } from '../database/connection';
import { geminiApiRequest } from '../services/gemini';

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
    });
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

  it('deve criar o cliente se ele não existir e salvar a medida', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 0 }) 
      .mockResolvedValueOnce({ rowCount: 0 }) 
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    (geminiApiRequest as jest.Mock).mockResolvedValue('456.78');

    const request = mockRequest({
      image: 'data:image/png;base64,abc123',
      customer_code: '999',
      measure_datetime: '2024-05-01',
      measure_type: 'GAS',
    });
    const reply = mockReply();

    await postUploadReading(request, reply);

    expect(pool.query).toHaveBeenCalledTimes(4);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO customers'),
      ['999', 'Cliente 999', 'cliente_999@dominio.com']
    );

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({
      image_url: expect.stringContaining('https://your-temporary-storage.com/images/'),
      measure_value: 456.78,
      measure_uuid: 'mocked-uuid',
    });
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

  it('deve retornar erro 400 se gemini retornar valor inválido', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 0 });

    (geminiApiRequest as jest.Mock).mockResolvedValue('resultado inválido');

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
      error_description: 'Erro ao interpretar a imagem e extrair o valor',
    });
  });

  it('deve salvar medida e retornar sucesso 200', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({});

    (geminiApiRequest as jest.Mock).mockResolvedValue('123.45');

    const request = mockRequest({
      image: 'data:image/jpeg;base64,abc123',
      customer_code: '123',
      measure_datetime: '2024-04-01',
      measure_type: 'WATER',
    });
    const reply = mockReply();

    await postUploadReading(request, reply);

    expect(pool.query).toHaveBeenCalledTimes(3);
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({
      image_url: expect.stringContaining('https://your-temporary-storage.com/images/'),
      measure_value: 123.45,
      measure_uuid: 'mocked-uuid',
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
});