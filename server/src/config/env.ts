import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const developmentJwtFallback = 'development-only-change-this-secret-32-chars-minimum';
const jwtSecret = required('JWT_SECRET', nodeEnv === 'production' ? undefined : developmentJwtFallback);
const databaseUrl = required(
  'DATABASE_URL',
  nodeEnv === 'production' ? undefined : 'postgresql://postgres:postgres@localhost:5432/civicconnect'
);
const cookieSecure = process.env.COOKIE_SECURE === undefined
  ? nodeEnv === 'production'
  : process.env.COOKIE_SECURE === 'true';

if (nodeEnv === 'production') {
  if (jwtSecret.length < 32 || jwtSecret === developmentJwtFallback) {
    throw new Error('Production requires a unique JWT_SECRET of at least 32 characters.');
  }
  if (!cookieSecure) {
    throw new Error('Production requires COOKIE_SECURE=true.');
  }
}

const externalHostname = process.env.RENDER_EXTERNAL_HOSTNAME;
const defaultClientOrigin = externalHostname ? `https://${externalHostname}` : 'http://localhost:5173';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv,
  clientOrigin: process.env.CLIENT_ORIGIN ?? defaultClientOrigin,
  databaseUrl,
  jwtSecret,
  cookieSecure,
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite',
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  slaHighHours: Number(process.env.SLA_HIGH_HOURS ?? 24),
  slaMediumHours: Number(process.env.SLA_MEDIUM_HOURS ?? 72),
  slaLowHours: Number(process.env.SLA_LOW_HOURS ?? 120)
};
