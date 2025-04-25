import { FastifyInstance } from 'fastify';
import { uploadReading } from '../controllers/readingController';

const readingRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/upload', uploadReading);
};

export default readingRoutes;