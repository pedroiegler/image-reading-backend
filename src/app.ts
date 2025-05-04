import { fastify } from 'fastify';
import { registerCors } from './plugins/cors';
import { registerSwagger } from './plugins/swagger';
import { registerStatic } from './plugins/static';
import { errorHandler } from './utils/errorHandler';
import dotenv from 'dotenv';
import readingRoutes from './routes/index';

dotenv.config();

const app = fastify();

registerCors(app);
registerSwagger(app);
registerStatic(app);

app.register(readingRoutes);
app.setErrorHandler(errorHandler);

export default app;