import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../database/connection';

function isUUID(str: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

export const patchConfirmMeasures = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { measure_uuid, confirmed_value } = request.body as any;

        if (typeof measure_uuid !== 'string' || !isUUID(measure_uuid)) {
            return reply.status(400).send({
                error_code: "INVALID_DATA",
                error_description: "'measure_uuid' deve ser uma string UUID válida."
            });
        }
    
        if (typeof confirmed_value !== 'number' || !Number.isInteger(confirmed_value)) {
            return reply.status(400).send({
                error_code: "INVALID_DATA",
                error_description: "'confirmed_value' deve ser um número inteiro."
            });
        }

        const measureExists = await pool.query(
            `SELECT has_confirmed FROM images WHERE measure_uuid = $1`,
            [measure_uuid]
        );

        if (!measureExists.rowCount || measureExists.rowCount === 0) {
            return reply.status(404).send({
                error_code: "MEASURE_NOT_FOUND",
                error_description: "Leitura do mês não foi encontrada"
            });
        }

        if (measureExists.rows[0].has_confirmed) {
            return reply.status(409).send({
                error_code: "CONFIRMATION_DUPLICATE",
                error_description: "Leitura do mês já foi confirmada"
            });
        }

        await pool.query(
            `UPDATE images SET measure_value = $1, has_confirmed = true WHERE measure_uuid = $2`,
            [confirmed_value, measure_uuid]
        );

        return reply.status(200).send({ 
            success: true 
        });
    } catch (error) {
        console.error(error);
        return reply.status(500).send({
          error_code: "INTERNAL_ERROR",
          error_description: "Ocorreu um erro interno no servidor."
        });
    }
};