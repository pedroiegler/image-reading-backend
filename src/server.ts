import app from './app';

const port = Number(process.env.PORT) || 80;

const start = async () => {
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Servidor rodando na porta ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();