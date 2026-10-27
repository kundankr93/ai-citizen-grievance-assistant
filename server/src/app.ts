import express from 'express';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pool } from './db/pool';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import authRoutes from './routes/auth';
import complaintRoutes from './routes/complaints';
import dashboardRoutes from './routes/dashboard';
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';
import aiQualityRoutes from './routes/aiQuality';
import { aiAvailability } from './services/ai';
import { errorHandler } from './middleware/errors';

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, service: 'CivicConnect AI API', timestamp: new Date().toISOString(), database: 'connected', ai: aiAvailability() });
  } catch {
    res.status(503).json({ ok: false, service: 'CivicConnect AI API', timestamp: new Date().toISOString(), database: 'unavailable', ai: aiAvailability() });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiQualityRoutes);
// RELEASE_STATIC_SPA: API 404s stay JSON; production serves the built React app from the same origin.
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

if (env.nodeEnv === 'production') {
  const clientDistPath = resolve(__dirname, '..', '..', 'client', 'dist');
  if (existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || !req.accepts('html')) { next(); return; }
      res.sendFile(join(clientDistPath, 'index.html'), (error) => { if (error) next(error); });
    });
  }
}

app.use((_req, res) => res.status(404).json({ error: 'Resource not found.' }));
app.use(errorHandler);
export default app;
