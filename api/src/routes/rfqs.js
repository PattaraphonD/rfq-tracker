import { Hono } from 'hono';
import { query, queryOne, transaction } from '../db/client.js';
import { extractPDFText, parseRFQFromText } from '../lib/pdfParser.js';

const r = new Hono();

// Status workflow
export const STATUSES = [
  { key: 'received',   label: 'Received',   color: 'blue' },
  { key: 'reviewing',  label: 'Reviewing',  color: 'amber' },
  { key: 'quoted',     label: 'Quoted',     color: 'indigo' },
  { key: 'accepted',   label: 'Accepted',   color: 'green' },
  { key: 'delivered',  label: 'Delivered',  color: 'teal' },
  { key: 'rejected',   label: 'Rejected',   color: 'red' },
];

r.get('/statuses', (c) => c.json({ statuses: STATUSES }));

// ── LIST ────────────────────────────────────────────────────────
r.get('/', async (c) => {
  const { status, customer, overdue, limit='100', offset='0' } = c.req.query();
  const where = ['1=1']; const vals = [];

  if (status)   { vals.push(status);   where.push(`r.status=$${vals.length}`); }
  if (customer) { vals.push(`%${customer}%`); where.push(`r.customer_name ILIKE $${vals.length}`); }
  if (overdue==='1') {
    where.push(`r.delivery_due_date < CURRENT_DATE`);
    where.push(`r.status NOT IN ('delivered','rejected')`);
  }

  vals.push(parseInt(limit), parseInt(offset));
  const rows = await query(`
    SELECT r.*,
      CASE WHEN r.delivery_due_date IS NOT NULL AND r.status NOT IN ('delivered','rejected')
           THEN (r.delivery_due_date - CURRENT_DATE) ELSE NULL
      END AS days_until_due,
      CASE WHEN r.delivery_due_date < CURRENT_DATE AND r.status NOT IN ('delivered','rejected')
           THEN true ELSE false
      END AS is_overdue,
      (SELECT COUNT(*)::int FROM rfq_items WHERE rfq_id=r.id) AS item_count,
      (SELECT COALESCE(SUM(amount),0)::float FROM rfq_items WHERE rfq_id=r.id) AS total_amount
    FROM customer_rfqs r
    WHERE ${where.join(' AND ')}
    ORDER BY r.created_at DESC
    LIMIT $${vals.length-1} OFFSET $${vals.length}`, vals);

  const cnt = await queryOne('SELECT COUNT(*)::int AS n FROM customer_rfqs');
  return c.json({ rfqs: rows, total: cnt?.n || 0 });
});

// ── GET ONE ─────────────────────────────────────────────────────
r.get('/:id', async (c) => {
  const id = c.req.param('id');
  const rfq = await queryOne(`
    SELECT r.*,
      CASE WHEN r.delivery_due_date IS NOT NULL AND r.status NOT IN ('delivered','rejected')
           THEN (r.delivery_due_date - CURRENT_DATE) ELSE NULL
      END AS days_until_due,
      CASE WHEN r.delivery_due_date < CURRENT_DATE AND r.status NOT IN ('delivered','rejected')
           THEN true ELSE false
      END AS is_overdue
    FROM customer_rfqs r WHERE r.id=$1`, [id]);
  if (!rfq) return c.json({ error: 'Not found' }, 404);

  const items   = await query('SELECT * FROM rfq_items WHERE rfq_id=$1 ORDER BY item_no', [id]);
  const history = await query('SELECT * FROM rfq_status_history WHERE rfq_id=$1 ORDER BY created_at ASC', [id]);

  return c.json({ rfq: { ...rfq, items, history } });
});

// ── CREATE (manual) ─────────────────────────────────────────────
r.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const {
    rfq_number, customer_name, customer_contact, customer_email,
    customer_phone, customer_address, received_date, delivery_due_date,
    quote_deadline, notes, internal_notes, items = [], status = 'received',
  } = body;

  if (!rfq_number || !customer_name)
    return c.json({ error: 'rfq_number and customer_name required' }, 400);

  const rfq = await transaction(async (client) => {
    const res = await client.query(`
      INSERT INTO customer_rfqs
        (rfq_number,customer_name,customer_contact,customer_email,customer_phone,
         customer_address,received_date,delivery_due_date,quote_deadline,
         notes,internal_notes,status,created_by,created_by_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [rfq_number, customer_name, customer_contact, customer_email, customer_phone,
       customer_address, received_date||null, delivery_due_date||null, quote_deadline||null,
       notes, internal_notes, status, user.sub, user.name]);
    const rfq = res.rows[0];

    for (const item of items) {
      await client.query(`
        INSERT INTO rfq_items (rfq_id,item_no,description,quantity,unit,target_price,our_price,amount,notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [rfq.id, item.item_no, item.description, item.quantity, item.unit||'EA',
         item.target_price||null, item.our_price||null, item.amount||null, item.notes||null]);
    }

    await client.query(`
      INSERT INTO rfq_status_history (rfq_id,from_status,to_status,comment,actor_id,actor_name)
      VALUES ($1,NULL,$2,'RFQ created',$3,$4)`,
      [rfq.id, status, user.sub, user.name]);

    return rfq;
  });

  const saved = await queryOne('SELECT * FROM customer_rfqs WHERE id=$1', [rfq.id]);
  const savedItems = await query('SELECT * FROM rfq_items WHERE rfq_id=$1 ORDER BY item_no', [rfq.id]);
  return c.json({ rfq: { ...saved, items: savedItems, history: [] } }, 201);
});

// ── PDF UPLOAD ───────────────────────────────────────────────────
r.post('/upload', async (c) => {
  const user = c.get('user');

  // Parse multipart form
  const formData = await c.req.formData();
  const file = formData.get('pdf');
  const meta = formData.get('meta');

  if (!file || typeof file === 'string')
    return c.json({ error: 'PDF file required' }, 400);

  // Extract text from PDF
  const buffer = Buffer.from(await file.arrayBuffer());
  const pdfText = await extractPDFText(buffer);
  const parsed  = parseRFQFromText(pdfText);

  // Merge with any manual overrides from form
  const overrides = meta ? JSON.parse(meta) : {};
  const data = { ...parsed, ...overrides };

  const rfq_number    = data.rfq_number    || `RFQ-${Date.now()}`;
  const customer_name = data.customer_name || overrides.customer_name || 'Unknown Customer';
  const received_date = data.received_date || new Date().toISOString().slice(0,10);

  // Calculate delivery due date if delivery_days found
  let delivery_due_date = overrides.delivery_due_date || null;
  if (!delivery_due_date && data.delivery_days) {
    const d = new Date(received_date);
    d.setDate(d.getDate() + data.delivery_days);
    delivery_due_date = d.toISOString().slice(0,10);
  }

  const rfq = await transaction(async (client) => {
    const res = await client.query(`
      INSERT INTO customer_rfqs
        (rfq_number,customer_name,customer_contact,received_date,delivery_due_date,
         pdf_filename,pdf_text,notes,status,created_by,created_by_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'received',$9,$10) RETURNING *`,
      [rfq_number, customer_name, data.customer_contact||null, received_date,
       delivery_due_date, file.name, pdfText,
       overrides.notes||null, user.sub, user.name]);
    const rfq = res.rows[0];

    // Insert parsed items
    const items = data.items || [];
    for (const [idx, item] of items.entries()) {
      await client.query(`
        INSERT INTO rfq_items (rfq_id,item_no,description,quantity,unit,target_price,our_price,amount)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [rfq.id, item.item_no||idx+1, item.description, item.quantity||1,
         item.unit||'EA', item.target_price||null, item.our_price||null, item.amount||null]);
    }

    await client.query(`
      INSERT INTO rfq_status_history (rfq_id,from_status,to_status,comment,actor_id,actor_name)
      VALUES ($1,NULL,'received',$2,$3,$4)`,
      [rfq.id, `PDF uploaded: ${file.name}`, user.sub, user.name]);

    return rfq;
  });

  return c.json({
    rfq,
    parsed: { rfq_number, customer_name, received_date, delivery_due_date, items: data.items||[], pdfText },
    message: `PDF processed. ${(data.items||[]).length} items extracted.`,
  }, 201);
});

// ── UPDATE ───────────────────────────────────────────────────────
r.patch('/:id', async (c) => {
  const id   = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json();

  const allowed = [
    'rfq_number','customer_name','customer_contact','customer_email',
    'customer_phone','customer_address','received_date','delivery_due_date',
    'quote_deadline','notes','internal_notes','quoted_total',
  ];
  const fields = allowed.filter(f => f in body);

  if (fields.length > 0) {
    const set = fields.map((f,i) => `${f}=$${i+1}`).join(',');
    await query(`UPDATE customer_rfqs SET ${set},updated_at=NOW() WHERE id=$${fields.length+1}`,
      [...fields.map(f => body[f]||null), id]);
  }

  // Update items if provided
  if (body.items) {
    await query('DELETE FROM rfq_items WHERE rfq_id=$1', [id]);
    for (const item of body.items) {
      await query(`INSERT INTO rfq_items (rfq_id,item_no,description,quantity,unit,target_price,our_price,amount,notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id,item.item_no,item.description,item.quantity,item.unit||'EA',
         item.target_price||null,item.our_price||null,item.amount||null,item.notes||null]);
    }
  }

  return c.json({ success: true });
});

// ── STATUS CHANGE ────────────────────────────────────────────────
r.post('/:id/status', async (c) => {
  const id   = c.req.param('id');
  const user = c.get('user');
  const { status, comment, delivery_due_date, quoted_total } = await c.req.json();
  if (!status) return c.json({ error: 'status required' }, 400);

  const current = await queryOne('SELECT status FROM customer_rfqs WHERE id=$1', [id]);
  if (!current) return c.json({ error: 'Not found' }, 404);

  const updates: Record<string,any> = { status };
  if (delivery_due_date) updates.delivery_due_date = delivery_due_date;
  if (quoted_total)      updates.quoted_total = quoted_total;

  const setClause = Object.keys(updates).map((k,i) => `${k}=$${i+1}`).join(',');
  await query(`UPDATE customer_rfqs SET ${setClause},updated_at=NOW() WHERE id=$${Object.keys(updates).length+1}`,
    [...Object.values(updates), id]);

  await query(`INSERT INTO rfq_status_history (rfq_id,from_status,to_status,comment,actor_id,actor_name)
    VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, current.status, status, comment||null, user.sub, user.name]);

  const updated = await queryOne(`
    SELECT r.*,
      CASE WHEN r.delivery_due_date IS NOT NULL AND r.status NOT IN ('delivered','rejected')
           THEN (r.delivery_due_date - CURRENT_DATE) ELSE NULL END AS days_until_due,
      CASE WHEN r.delivery_due_date < CURRENT_DATE AND r.status NOT IN ('delivered','rejected')
           THEN true ELSE false END AS is_overdue
    FROM customer_rfqs r WHERE r.id=$1`, [id]);
  const history = await query('SELECT * FROM rfq_status_history WHERE rfq_id=$1 ORDER BY created_at', [id]);
  const items   = await query('SELECT * FROM rfq_items WHERE rfq_id=$1 ORDER BY item_no', [id]);

  return c.json({ rfq: { ...updated, items, history } });
});

// ── DELETE ───────────────────────────────────────────────────────
r.delete('/:id', async (c) => {
  await query('DELETE FROM customer_rfqs WHERE id=$1', [c.req.param('id')]);
  return c.json({ success: true });
});

export default r;
