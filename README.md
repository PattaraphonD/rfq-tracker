# RFQ Tracker — Customer RFQ Management System
## Pattarapol General Part Limited Partnership

Track every incoming customer RFQ from receipt to delivery.

---

## How It Works

1. **Receive RFQ** — Customer sends PDF (like Microchip Technology RFQ 26/007)
2. **Upload PDF** — Drag & drop on the RFQ list page — system auto-extracts data
3. **Review & Quote** — Move through stages, edit line items, set your price
4. **Track Delivery** — Delivery countdown with overdue alerts
5. **Dashboard** — Pipeline view shows counts at every stage

---

## Status Workflow

```
Received → Reviewing → Quoted → Accepted → Delivered
                              ↘ Rejected (from any stage)
```

---

## Daily Usage (Codespace)

### Step 1 — Open existing Codespace
github.com/YOUR_USERNAME/rfq-tracker → Code → Codespaces → click existing

### Step 2 — Terminal 1: Start API
```bash
cd /workspaces/rfq-tracker/api && npm run dev
```

### Step 3 — Set port 3000 to Public, update frontend URL
Ports tab → port 3000 → Public → copy URL
```bash
printf 'VITE_API_URL=https://YOUR-URL-3000.app.github.dev\nVITE_BASE_PATH=/\n' \
  > /workspaces/rfq-tracker/frontend/.env.local
```

### Step 4 — Terminal 2: Start frontend
```bash
cd /workspaces/rfq-tracker/frontend && npm run dev
```
Open in Browser → Login → done.

---

## First Time Setup

### 1. Install dependencies
```bash
cd api && npm install
cd ../frontend && npm install
```

### 2. Create Railway project & PostgreSQL
```bash
npm install -g @railway/cli
railway login
cd api && railway init
```
Go to railway.app/dashboard → your project → + New → Database → PostgreSQL
Copy DATABASE_PUBLIC_URL from PostgreSQL → Variables tab

### 3. Create .env file
```bash
code /workspaces/rfq-tracker/api/.env
```
Paste:
```
DATABASE_URL=postgresql://postgres:PASS@HOST.rlwy.net:PORT/railway
JWT_SECRET=rfq-system-secret-2026
RESEND_API_KEY=placeholder
PORT=3000
```

### 4. Run migrations & seed
```bash
cd api
npm run db:init
npm run db:seed
```

---

## Deploy to Internet

```bash
cd api
railway variables set JWT_SECRET="rfq-system-secret-2026"
railway variables set NODE_ENV="production"
railway up --detach
railway run npm run db:init
railway run npm run db:seed
railway domain   # copy this URL
```

GitHub repo → Settings → Pages → GitHub Actions
Add secrets: RAILWAY_TOKEN + VITE_API_URL (Railway URL, no trailing slash)

```bash
git add . && git commit -m "Deploy RFQ Tracker" && git push origin main
```

Live at: https://YOUR_USERNAME.github.io/rfq-tracker/

---

## Database Tables

| Table | Purpose |
|---|---|
| customer_rfqs | One row per incoming RFQ — number, customer, dates, status, PDF text |
| rfq_items | Line items (description, qty, target price, our price) |
| rfq_status_history | Full audit log — every status change with who and when |
| users | System users |

---

## Demo Accounts (any password)

| Role | Email |
|---|---|
| Staff | waraporn@pattarapol.co.th |
| Manager | manager@pattarapol.co.th |
| Admin | admin@pattarapol.co.th |
