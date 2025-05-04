import { fastify } from 'fastify';
import { fastifyCors } from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import readingRoutes from './routes';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = fastify();

app.register(fastifyCors, { origin: '*' });

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'API para leitura de imagens',
      version: '1.0.0',
    }
  }
});

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
});

app.register(fastifyStatic, {
  root: path.join(__dirname, 'assets', 'images'),
  prefix: '/images/',
});

app.register(readingRoutes);

app.setErrorHandler((error, request, reply) => {
  const status = error.statusCode || 500;

  if (error.validation && Array.isArray(error.validation)) {
    return reply.status(400).send({
      error_code: 'INVALID_DATA',
      error_description:
        error.validation[0]?.message || 'Dados inválidos na requisição.',
    });
  }

  reply.status(status).send({
    error_code: status === 500 ? 'INTERNAL_ERROR' : 'INVALID_DATA',
    error_description: error.message || 'Erro interno do servidor.',
  });
});

const start = async () => {
  let port = Number(process.env.PORT) || 3000
  try {
    await app.listen({ port: port, host: '0.0.0.0' });
    console.log(`Servidor rodando na porta ${port}`);
  } catch (err) {
    console.log(err);
    app.log.error(err);
    process.exit(1);
  }
};

start();