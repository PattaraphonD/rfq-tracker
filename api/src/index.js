import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { requireAuth } from './lib/auth.js';
import authRoutes   from './routes/auth.js';
import rfqRoutes    from './routes/rfqs.js';
import reportRoutes from './routes/reports.js';

const app  = new Hono();
const PORT = parseInt(process.env.PORT || '3000');

app.use('*', logger());

// ── CORS — manual headers, works everywhere ───────────────────
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin',   '*');
  c.header('Access-Control-Allow-Methods',  'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  c.header('Access-Control-Allow-Headers',  'Content-Type,Authorization');
  c.header('Access-Control-Expose-Headers', 'Content-Disposition');
  if (c.req.method === 'OPTIONS') return c.text('', 204);
  await next();
});

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (c) => c.json({
  status: 'ok', service: 'RFQ Tracker API',
  time: new Date().toISOString(),
}));

// ── Public ────────────────────────────────────────────────────
app.route('/api/auth', authRoutes);

// ── Protected ────────────────────────────────────────────────
app.use('/api/rfqs/*',    requireAuth);
app.use('/api/reports/*', requireAuth);

app.route('/api/rfqs',    rfqRoutes);
app.route('/api/reports', reportRoutes);

// ── Fallbacks ────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error('API error:', err.message);
  return c.json({ error: err.message }, 500);
});

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`\n✓ RFQ Tracker API  →  http://localhost:${PORT}`);
  console.log(`  Health            →  http://localhost:${PORT}/api/health`);
  console.log(`  CORS              →  enabled (all origins)\n`);
});
