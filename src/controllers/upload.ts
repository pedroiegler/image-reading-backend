import fs from 'fs';
import path from 'path';
import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';
import { geminiApiRequest } from '../gemini';

export const postUploadReading = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { image, customer_code, measure_datetime, measure_type } = request.body as any;

    const match = image.match(/^data:image\/(png|jpeg|jpg);base64,/);

    if (!/^data:image\/(png|jpeg|jpg);base64,/.test(image) || !match) {
      return reply.status(400).send({
        error_code: 'INVALID_DATA',
        error_description: 'Imagem inválida (não é base64 ou tipo não suportado)',
        example: 'Exemplo válido: data:image/jpg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...'
      });
    }

    const base64Part = image.split(',')[1];

    if (!base64Part) {
      return reply.status(400).send({
        error_code: 'INVALID_DATA',
        error_description: 'Imagem em base64 mal formatada.',
      });
    }

    try {
      Buffer.from(base64Part, 'base64');
    } catch {
      return reply.status(400).send({
        error_code: 'INVALID_DATA',
        error_description: 'A string base64 não pôde ser decodificada.',
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

    const imageType = match[1];

    let extractedValue: number;
    const geminiResult = await geminiApiRequest([
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: `image/${imageType}`,
              data: image.split(',')[1].trim(),
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

    const measureUuid = uuidv4();

    const filename = `${measureUuid}.${imageType}`;

    await saveBase64Image(image, filename);

    const imageUrl = `${request.protocol}://${request.headers.host}/images/temp_uploads/${filename}`;

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
  } catch (error) {
    console.error('Erro interno ao processar upload:', error);
    return reply.status(500).send({
      error_code: 'INTERNAL_ERROR',
      error_description: 'Ocorreu um erro interno no servidor.',
    });
  }
};

export const saveBase64Image = async (base64: string, filename: string): Promise<string> => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const filePath = path.join(__dirname, '..', 'assets', 'images', 'temp_uploads', filename);
  await fs.promises.writeFile(filePath, buffer);
  return filePath;
};