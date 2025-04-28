import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';
import { geminiApiRequest } from '../services/gemini';

export const postUploadReading = async (request: FastifyRequest, reply: FastifyReply) => {
  const { image, customer_code, measure_datetime, measure_type } = request.body as any;

  if (!/^data:image\/(png|jpeg|jpg);base64,/.test(image)) {
    return reply.status(400).send({
      error_code: 'INVALID_DATA',
      error_description: 'Imagem inválida (não é base64 ou tipo não suportado)',
    });
  }

  if (!['WATER', 'GAS'].includes(measure_type)) {
    return reply.status(400).send({
      error_code: 'INVALID_DATA',
      error_description: 'Tipo de medida inválido (deve ser WATER ou GAS)',
    });
  }

  const customerCheck = await pool.query(
    `SELECT 1 FROM customers WHERE customer_code = $1`,
    [customer_code]
  );

  if (customerCheck.rowCount === 0) {
    await pool.query(
      `
      INSERT INTO customers (customer_code, name, email)
      VALUES ($1, $2, $3)
    `,
      [customer_code, `Cliente ${customer_code}`, `cliente_${customer_code}@dominio.com`]
    );
  }

  const readingCheck = await pool.query(
    `
      SELECT 1
      FROM images
      WHERE customer_code = $1
        AND measure_type = $2
        AND DATE_TRUNC('month', measure_datetime) = DATE_TRUNC('month', $3::TIMESTAMP)
    `,
    [customer_code, measure_type, measure_datetime]
  );

  if (readingCheck.rowCount && readingCheck.rowCount > 0) {
    return reply.status(409).send({
      error_code: 'DOUBLE_REPORT',
      error_description: 'Leitura do mês já realizada',
    });
  }

  let extractedValue: number;
  try {
    const geminiResult = await geminiApiRequest([
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: image.split(',')[1],
            },
          },
          {
            text: "Extrair apenas o valor numérico da leitura do medidor desta imagem. Responda apenas com o número, sem texto extra.",
          },
        ],
      },
    ]);

    const rawText = geminiResult.trim();
    extractedValue = parseFloat(rawText.replace(/[^\d.]/g, ''));

    if (isNaN(extractedValue)) {
      throw new Error('Valor extraído inválido');
    }
  } catch (error) {
    console.error('Erro ao processar a imagem:', error);
    return reply.status(400).send({
      error_code: 'INVALID_DATA',
      error_description: 'Erro ao interpretar a imagem e extrair o valor',
    });
  }

  const imageUrl = `https://your-temporary-storage.com/images/${uuidv4()}.jpg`;

  const measureUuid = uuidv4();

  await pool.query(
    `
      INSERT INTO images (customer_code, image_url, measure_datetime, measure_type, measure_value, measure_uuid)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [customer_code, imageUrl, measure_datetime, measure_type, extractedValue, measureUuid]
  );

  return reply.status(200).send({
    image_url: imageUrl,
    measure_value: extractedValue,
    measure_uuid: measureUuid,
  });
};