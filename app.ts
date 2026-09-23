import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { buildRouter } from './routes';
import { optionalAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp(): express.Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.dataMode === 'demo' ? true : (envCORS() as never),
      credentials: false,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  if (!env.isProd) app.use(morgan('dev'));

  // Basic abuse protection on auth endpoints
  app.use(
    ['/auth/login', '/auth/register'],
    rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false })
  );

  // Attach req.authUser when a token is present (never rejects)
  app.use(optionalAuth);

  app.use('/api', buildRouter());
  app.use('/', buildRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

function envCORS(): string[] | true {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || raw === '*') return true;
  return raw.split(',').map((s) => s.trim());
}
