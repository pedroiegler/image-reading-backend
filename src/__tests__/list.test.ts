import { getCustomerMeasures } from '../controllers/list';
import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../database/connection';

jest.mock('../database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('getCustomerMeasures', () => {
  const mockReply = () => {
    const reply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    return reply as unknown as FastifyReply;
  };

  const mockRequest = (params: any, query: any): FastifyRequest => ({
    params,
    query,
  } as unknown as FastifyRequest);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar erro 400 se customer_code não for fornecido', async () => {
    const request = mockRequest({ customer_code: '' }, {});
    const reply = mockReply();

    await getCustomerMeasures(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: 'INVALID_DATA',
      error_description: 'Código do cliente é obrigatório.',
    });
  });

  it('deve retornar erro 400 se tipo de medição for inválido', async () => {
    const request = mockRequest({ customer_code: '123' }, { measure_type: 'INVALIDO' });
    const reply = mockReply();

    await getCustomerMeasures(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: 'INVALID_TYPE',
      error_description: 'Tipo de medição não permitida',
    });
  });

  it('deve retornar erro 404 se nenhuma medida for encontrada', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0, rows: [] });

    const request = mockRequest({ customer_code: '123' }, {});
    const reply = mockReply();

    await getCustomerMeasures(request, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: 'MEASURES_NOT_FOUND',
      error_description: 'Nenhuma leitura encontrada',
    });
  });

  it('deve retornar medidas quando encontradas', async () => {
    const mockData = [
      {
        measure_uuid: 'abc-123',
        measure_datetime: '2024-04-01T12:00:00Z',
        measure_type: 'WATER',
        has_confirmed: true,
        image_url: 'http://image.jpg',
      },
    ];

    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1, rows: mockData });

    const request = mockRequest({ customer_code: '123' }, { measure_type: 'water' });
    const reply = mockReply();

    await getCustomerMeasures(request, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({
      customer_code: '123',
      measures: mockData,
    });
  });

  it('deve retornar erro 500 em caso de exceção', async () => {
    (pool.query as jest.Mock).mockRejectedValue(new Error('erro'));

    const request = mockRequest({ customer_code: '123' }, {});
    const reply = mockReply();

    await getCustomerMeasures(request, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: 'INTERNAL_ERROR',
      error_description: 'Ocorreu um erro interno no servidor.',
    });
  });
});