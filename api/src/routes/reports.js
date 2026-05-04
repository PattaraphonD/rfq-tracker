import { Hono } from 'hono';
import { query, queryOne } from '../db/client.js';

const r = new Hono();

r.get('/summary', async (c) => {
  const [pipeline, overdue, monthly, topCustomers] = await Promise.all([
    // Count per status
    query(`SELECT status, COUNT(*)::int AS count,
      COALESCE(SUM((SELECT SUM(amount) FROM rfq_items WHERE rfq_id=r.id)),0)::float AS total_value
      FROM customer_rfqs r GROUP BY status`),

    // Overdue count
    queryOne(`SELECT COUNT(*)::int AS count FROM customer_rfqs
      WHERE delivery_due_date < CURRENT_DATE AND status NOT IN ('delivered','rejected')`),

    // Monthly received
    query(`SELECT TO_CHAR(received_date,'YYYY-MM') AS month, COUNT(*)::int AS count,
      COALESCE(SUM((SELECT SUM(amount) FROM rfq_items WHERE rfq_id=r.id)),0)::float AS total
      FROM customer_rfqs r WHERE received_date >= NOW()-INTERVAL '12 months'
      GROUP BY month ORDER BY month ASC`),

    // Top customers
    query(`SELECT customer_name, COUNT(*)::int AS rfq_count,
      COALESCE(SUM((SELECT SUM(amount) FROM rfq_items WHERE rfq_id=r.id)),0)::float AS total_value
      FROM customer_rfqs r GROUP BY customer_name ORDER BY rfq_count DESC LIMIT 10`),
  ]);

  // Build pipeline map
  const stages = ['received','reviewing','quoted','accepted','delivered','rejected'];
  const pipelineMap = Object.fromEntries(stages.map(s => [s, { count: 0, total_value: 0 }]));
  for (const row of pipeline) pipelineMap[row.status] = { count: row.count, total_value: row.total_value };

  return c.json({
    pipeline: pipelineMap,
    overdue_count: overdue?.count || 0,
    monthly,
    top_customers: topCustomers,
    totals: {
      total_rfqs: pipeline.reduce((s,r) => s + r.count, 0),
      active: (pipelineMap.received.count + pipelineMap.reviewing.count + pipelineMap.quoted.count + pipelineMap.accepted.count),
      won: pipelineMap.accepted.count + pipelineMap.delivered.count,
      lost: pipelineMap.rejected.count,
    }
  });
});

r.get('/export', async (c) => {
  const { status, from, to } = c.req.query();
  const where = ['1=1']; const vals = [];
  if (status) { vals.push(status); where.push(`r.status=$${vals.length}`); }
  if (from)   { vals.push(from);   where.push(`r.received_date>=$${vals.length}`); }
  if (to)     { vals.push(to);     where.push(`r.received_date<=$${vals.length}`); }

  const rows = await query(`
    SELECT r.rfq_number, r.customer_name, r.customer_contact, r.status,
      r.received_date, r.delivery_due_date, r.quote_deadline,
      (SELECT COALESCE(SUM(amount),0) FROM rfq_items WHERE rfq_id=r.id) AS total_amount,
      r.quoted_total, r.notes
    FROM customer_rfqs r WHERE ${where.join(' AND ')} ORDER BY r.received_date DESC`, vals);

  const headers = ['RFQ No.','Customer','Contact','Status','Received','Due Date',
    'Quote Deadline','Items Total','Quoted Total','Notes'];
  const csv = [headers.join(','),
    ...rows.map(r => [r.rfq_number,r.customer_name,r.customer_contact||'',r.status,
      r.received_date?.toISOString?.().slice(0,10)||'',
      r.delivery_due_date?.toISOString?.().slice(0,10)||'',
      r.quote_deadline?.toISOString?.().slice(0,10)||'',
      r.total_amount, r.quoted_total||'', r.notes||'']
      .map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))
  ].join('\n');

  return new Response(csv, { headers: {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="rfq-export-${new Date().toISOString().slice(0,10)}.csv"`,
    'Access-Control-Allow-Origin': '*',
  }});
});

export default r;
