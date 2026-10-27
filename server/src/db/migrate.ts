import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pool } from './pool';

async function migrate() {
  const sql = await readFile(join(__dirname, 'schema.sql'), 'utf8').catch(async () =>
    readFile(join(process.cwd(), 'src', 'db', 'schema.sql'), 'utf8')
  );
  await pool.query(sql);
  console.log('✅ Database schema applied successfully.');
  await pool.end();
}

migrate().catch(async (error: unknown) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  await pool.end();
  process.exit(1);
});
