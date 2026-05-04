import pg from 'pg';
const { Pool } = pg;

const url = process.env.DATABASE_URL;
if (!url) { console.error('ERROR: DATABASE_URL not set'); process.exit(1); }

const pool = new Pool({
  connectionString: url,
  ssl: url.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  max: 5,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

pool.on('connect', () => console.log('✓ DB connected'));
pool.on('error', e => console.error('DB pool error:', e.message));

export async function query(sql, params = []) {
  const client = await pool.connect();
  try { return (await client.query(sql, params)).rows; }
  finally { client.release(); }
}

export async function queryOne(sql, params = []) {
  return (await query(sql, params))[0] ?? null;
}

export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
}

export default pool;
