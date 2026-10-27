import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { pool } from './db/pool';
import { runEscalations } from './services/escalation';

const server = app.listen(env.port, '0.0.0.0', () => {
  console.log(`CivicConnect API listening on 0.0.0.0:${env.port}`);
  console.log(`AI mode: ${env.geminiApiKey ? 'Gemini configured (model: ' + env.geminiModel + '; request failures will fall back)' : 'DEMO MODE - rule-based classification'}`);
});

// Run SLA checks at startup and periodically. Previously escalation only ran when
// the dashboard summary endpoint was requested, which could delay escalation.
const escalationTimer = setInterval(() => {
  void runEscalations().catch((error: unknown) => {
    console.error('Scheduled SLA check failed:', error instanceof Error ? error.message : error);
  });
}, 5 * 60 * 1000);
escalationTimer.unref();
void runEscalations().catch((error: unknown) => {
  console.error('Initial SLA check failed:', error instanceof Error ? error.message : error);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down gracefully.`);
  clearInterval(escalationTimer);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
