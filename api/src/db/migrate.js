import { query } from './client.js';

const steps = [
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,

  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email         TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT DEFAULT 'staff',
    password_hash TEXT DEFAULT 'demo',
    is_active     INTEGER DEFAULT 1,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Customer RFQs — one row per incoming request
  `CREATE TABLE IF NOT EXISTS customer_rfqs (
    id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfq_number           TEXT NOT NULL,
    customer_name        TEXT NOT NULL,
    customer_contact     TEXT,
    customer_email       TEXT,
    customer_phone       TEXT,
    customer_address     TEXT,
    received_date        DATE DEFAULT CURRENT_DATE,
    delivery_due_date    DATE,
    quote_deadline       DATE,
    status               TEXT DEFAULT 'received',
    pdf_filename         TEXT,
    pdf_text             TEXT,
    notes                TEXT,
    internal_notes       TEXT,
    quoted_total         NUMERIC(15,2),
    vat_pct              NUMERIC(5,2) DEFAULT 7,
    created_by           TEXT,
    created_by_name      TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
  )`,

  // RFQ line items — what the customer wants
  `CREATE TABLE IF NOT EXISTS rfq_items (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfq_id       TEXT NOT NULL REFERENCES customer_rfqs(id) ON DELETE CASCADE,
    item_no      INTEGER NOT NULL,
    description  TEXT NOT NULL,
    quantity     NUMERIC(10,2) DEFAULT 1,
    unit         TEXT DEFAULT 'EA',
    target_price NUMERIC(15,2),
    our_price    NUMERIC(15,2),
    amount       NUMERIC(15,2),
    notes        TEXT
  )`,

  // Full audit log of every status change
  `CREATE TABLE IF NOT EXISTS rfq_status_history (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfq_id          TEXT NOT NULL REFERENCES customer_rfqs(id) ON DELETE CASCADE,
    from_status     TEXT,
    to_status       TEXT NOT NULL,
    comment         TEXT,
    actor_id        TEXT,
    actor_name      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_rfq_status    ON customer_rfqs(status)`,
  `CREATE INDEX IF NOT EXISTS idx_rfq_customer  ON customer_rfqs(customer_name)`,
  `CREATE INDEX IF NOT EXISTS idx_rfq_due       ON customer_rfqs(delivery_due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_rfq_created   ON customer_rfqs(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_rfq_hist      ON rfq_status_history(rfq_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rfq_items     ON rfq_items(rfq_id)`,

  // Safe alterations for existing databases
  `ALTER TABLE customer_rfqs ADD COLUMN IF NOT EXISTS pdf_text TEXT`,
  `ALTER TABLE customer_rfqs ADD COLUMN IF NOT EXISTS quote_deadline DATE`,
  `ALTER TABLE customer_rfqs ADD COLUMN IF NOT EXISTS internal_notes TEXT`,
  `ALTER TABLE customer_rfqs ADD COLUMN IF NOT EXISTS quoted_total NUMERIC(15,2)`,
  `ALTER TABLE customer_rfqs ADD COLUMN IF NOT EXISTS vat_pct NUMERIC(5,2) DEFAULT 7`,
  `ALTER TABLE rfq_items ADD COLUMN IF NOT EXISTS our_price NUMERIC(15,2)`,
  `ALTER TABLE rfq_items ADD COLUMN IF NOT EXISTS notes TEXT`,
];

console.log('Running migrations...');
for (const sql of steps) {
  await query(sql).catch(() => {});
  process.stdout.write('.');
}
console.log('\n✓ Migrations complete');
process.exit(0);
