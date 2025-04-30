import { patchConfirmMeasures } from '../controllers/confirm';
import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../database/connection';

jest.mock('../database/connection', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('patchConfirmMeasures', () => {
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

  it('deve retornar erro 400 se UUID for inválido', async () => {
    const request = mockRequest({
      measure_uuid: 'invalid-uuid',
      confirmed_value: 100,
    });
    const reply = mockReply();

    await patchConfirmMeasures(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: "INVALID_DATA",
      error_description: "'measure_uuid' deve ser uma string UUID válida."
    });
  });

  it('deve retornar erro 400 se valor confirmado não for número inteiro', async () => {
    const request = mockRequest({
      measure_uuid: '123e4567-e89b-12d3-a456-426614174000',
      confirmed_value: 'abc',
    });
    const reply = mockReply();

    await patchConfirmMeasures(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: "INVALID_DATA",
      error_description: "'confirmed_value' deve ser um número inteiro."
    });
  });

  it('deve retornar erro 404 se medida não existir', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

    const request = mockRequest({
      measure_uuid: '123e4567-e89b-12d3-a456-426614174000',
      confirmed_value: 150,
    });
    const reply = mockReply();

    await patchConfirmMeasures(request, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: "MEASURE_NOT_FOUND",
      error_description: "Leitura do mês não foi encontrada"
    });
  });

  it('deve retornar erro 409 se leitura já foi confirmada', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ has_confirmed: true }],
    });

    const request = mockRequest({
      measure_uuid: '123e4567-e89b-12d3-a456-426614174000',
      confirmed_value: 150,
    });
    const reply = mockReply();

    await patchConfirmMeasures(request, reply);

    expect(reply.status).toHaveBeenCalledWith(409);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: "CONFIRMATION_DUPLICATE",
      error_description: "Leitura do mês já foi confirmada"
    });
  });

  it('deve confirmar medida com sucesso', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ has_confirmed: false }],
      })
      .mockResolvedValueOnce({});

    const request = mockRequest({
      measure_uuid: '123e4567-e89b-12d3-a456-426614174000',
      confirmed_value: 200,
    });
    const reply = mockReply();

    await patchConfirmMeasures(request, reply);

    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ success: true });
  });

  it('deve retornar erro 500 em caso de erro inesperado', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('erro inesperado'));

    const request = mockRequest({
      measure_uuid: '123e4567-e89b-12d3-a456-426614174000',
      confirmed_value: 100,
    });
    const reply = mockReply();

    await patchConfirmMeasures(request, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({
      error_code: "INTERNAL_ERROR",
      error_description: "Ocorreu um erro interno no servidor."
    });
  });
});