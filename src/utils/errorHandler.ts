import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const status = error.statusCode || 500;

  if (error.validation && Array.isArray(error.validation)) {
    return reply.status(400).send({
      error_code: 'INVALID_DATA',
      error_description:
        error.validation[0]?.message || 'Dados inválidos na requisição.',
    });
  }

  reply.status(status).send({
    error_code: status === 500 ? 'INTERNAL_ERROR' : 'INVALID_DATA',
    error_description: error.message || 'Erro interno do servidor.',
  });
};