import Fastify from 'fastify';
import dotenv from 'dotenv';
import readingRoutes from './routes/readingRoutes';

dotenv.config();

const fastify = Fastify({ logger: true });

fastify.register(readingRoutes);

const start = async () => {
  try {
    await fastify.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
    console.log(`🚀 Servidor rodando`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();