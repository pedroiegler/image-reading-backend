import { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';

export const registerStatic = async (app: FastifyInstance) => {
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'assets', 'images'),
    prefix: '/images/',
  });
};