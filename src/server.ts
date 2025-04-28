import { fastify } from 'fastify';
import { fastifyCors } from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import readingRoutes from './routes/routes';
import dotenv from 'dotenv';

dotenv.config();

const app = fastify()

app.register(fastifyCors, { origin: '*' })

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'API para leitura de imagens',
      version: '1.0.0',
    }
  }
})

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})

app.register(readingRoutes);

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