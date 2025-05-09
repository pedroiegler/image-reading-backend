import { FastifyRequest, FastifyReply } from 'fastify';
import { GetCustomerMeasuresParams, GetCustomerMeasuresQuery } from '../utils/interfaces';
import { pool } from '../database/connection';

export const getCustomerMeasures = async (request: FastifyRequest, reply: FastifyReply) => {
  const { customer_code } = request.params as GetCustomerMeasuresParams;
  const { measure_type } = request.query as GetCustomerMeasuresQuery;

  if (!customer_code || !customer_code.trim()) {
    return reply.status(400).send({
      error_code: 'INVALID_DATA',
      error_description: 'Código do cliente é obrigatório.',
    });
  }

  if (measure_type && !['WATER', 'GAS'].includes(measure_type.toUpperCase())) {
    return reply.status(400).send({
      error_code: 'INVALID_TYPE',
      error_description: 'Tipo de medição não permitida',
    });
  }

  let query = `
    SELECT measure_uuid, measure_datetime, measure_type, has_confirmed, image_url
    FROM images
    WHERE customer_code = $1
  `;

  const queryParams = [customer_code];

  if (measure_type) {
    query += ` AND measure_type = $2`;
    queryParams.push(measure_type.toUpperCase());
  }

  try {
    const result = await pool.query(query, queryParams);

    if (result.rowCount === 0) {
      return reply.status(404).send({
        error_code: 'MEASURES_NOT_FOUND',
        error_description: 'Nenhuma leitura encontrada',
      });
    }

    return reply.status(200).send({
      customer_code,
      measures: result.rows.map((row: any) => ({
        measure_uuid: row.measure_uuid,
        measure_datetime: row.measure_datetime,
        measure_type: row.measure_type,
        has_confirmed: row.has_confirmed,
        image_url: row.image_url,
      })),
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      error_code: 'INTERNAL_ERROR',
      error_description: 'Ocorreu um erro interno no servidor.',
    });
  }
};