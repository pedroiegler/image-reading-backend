import { FastifyInstance } from 'fastify';
import { uploadReading } from '../controllers/upload';
import { getCustomerMeasures } from '../controllers/list';
import { getCustomerMeasuresSchema, uploadReadingSchema } from '../utils/schemas';

export async function readingRoutes(app: FastifyInstance){
  app.post('/upload', { schema: uploadReadingSchema }, uploadReading);
  app.get('/:customer_code/list', { schema: getCustomerMeasuresSchema }, getCustomerMeasures);
};

export default readingRoutes;