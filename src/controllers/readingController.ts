import { FastifyRequest, FastifyReply } from 'fastify';
import { Pool } from 'pg';
import { geminiApiRequest } from '../services/geminiService';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

export const uploadReading = async (request: FastifyRequest, reply: FastifyReply) => {
    const { image, customer_code, measure_datetime, measure_type } = request.body as any;

    // Validar se o base64 da imagem é válido
    if (!/^data:image\/(png|jpeg|jpg);base64,/.test(image)) {
        return reply.status(400).send({
            error_code: 'INVALID_DATA',
            error_description: 'Imagem inválida (não é base64 ou tipo não suportado)',
        });
    }

    // Verificar se o cliente já existe na tabela customers
    const customerQuery = `
        SELECT 1 FROM customers WHERE customer_code = $1
    `;
    const customerResult = await pool.query(customerQuery, [customer_code]);

    if (customerResult.rowCount === 0) {
        // Se o cliente não existe, você pode criar um novo registro (opcional)
        const insertCustomerQuery = `
            INSERT INTO customers (customer_code, name, email)
            VALUES ($1, $2, $3) RETURNING customer_code
        `;
        
        // Defina o nome e o email do cliente com base nos dados que você tem ou envie como parâmetros
        const newCustomer = {
            customer_code,
            name: "Nome do Cliente",
            email: "cliente@dominio.com",
        };

        await pool.query(insertCustomerQuery, [
            newCustomer.customer_code,
            newCustomer.name,
            newCustomer.email,
        ]);
    }

    // Verificar se já existe uma leitura para o cliente e o tipo no mesmo mês
    const query = `
        SELECT 1 FROM images 
        WHERE customer_code = $1 
        AND measure_type = $2 
        AND DATE_TRUNC('month', measure_datetime) = DATE_TRUNC('month', $3)
    `;
    
    const queryResult = await pool.query(query, [customer_code, measure_type, measure_datetime]);
    const rowCount = queryResult.rowCount;

    if (rowCount && rowCount > 0) {
        return reply.status(409).send({
            error_code: 'DOUBLE_REPORT',
            error_description: 'Leitura do mês já realizada',
        });
    }

    // Chamar a Gemini API para obter os dados da imagem
    const geminiResult = await geminiApiRequest(image);

    // Inserir a leitura no banco de dados
    const insertQuery = `
        INSERT INTO images (customer_code, image_url, measure_datetime, measure_type, measure_value, measure_uuid)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING measure_uuid
    `;
    const result = await pool.query(insertQuery, [
        customer_code,
        geminiResult.image_url,
        measure_datetime,
        measure_type,
        geminiResult.measure_value,
        geminiResult.measure_uuid,
    ]);

    return reply.status(200).send({
        image_url: geminiResult.image_url,
        measure_value: geminiResult.measure_value,
        measure_uuid: result.rows[0].measure_uuid,
    });
};
