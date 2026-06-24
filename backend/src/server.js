import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { initFirebase } from './config/firebase.js';
import routes from './routes/index.js';
import { AppError } from './utils/errors.js';
import { seedDatabase } from './utils/seed.js';

const app = express();

initFirebase();

app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));

app.use('/api', routes);

app.use((_req, _res, next) => {
  next(new AppError('Route not found', 404));
});

app.use((err, _req, res, _next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(env.nodeEnv === 'development' && { stack: err.stack }),
  });
});

async function start() {
  // Start the API immediately so login/auth works even if Firestore is briefly
  // unreachable. Seeding only creates default data when collections are empty,
  // so it is best-effort and must never take the whole server down.
  app.listen(env.port, () => {
    console.log(`[Viaduc] API running on http://localhost:${env.port}`);
  });

  try {
    await seedDatabase();
  } catch (err) {
    console.error(
      '[Viaduc] Seeding skipped — could not reach Firestore:',
      err.message
    );
  }
}

start();

export default app;
