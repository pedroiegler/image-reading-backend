import { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';

export const registerCors = (app: FastifyInstance) => {
  app.register(fastifyCors, { origin: '*' });
};