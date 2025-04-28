import { FastifyInstance } from 'fastify';
import { postUploadReading } from '../controllers/upload';
import { patchConfirmMeasures } from '../controllers/confirm';
import { getCustomerMeasures } from '../controllers/list';
import { postUploadReadingSchema, patchConfirmMeasuresSchema, getCustomerMeasuresSchema } from '../utils/schemas';

export async function readingRoutes(app: FastifyInstance){
  app.post('/upload', { schema: postUploadReadingSchema }, postUploadReading);
  app.patch('/confirm', { schema: patchConfirmMeasuresSchema }, patchConfirmMeasures);
  app.get('/:customer_code/list', { schema: getCustomerMeasuresSchema }, getCustomerMeasures);
};

export default readingRoutes;