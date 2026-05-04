import { Hono } from 'hono';
import { query, queryOne } from '../db/client.js';
import { createJWT, hashPw } from '../lib/auth.js';

const r = new Hono();

r.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({error:'Email and password required'},400);
  const user = await queryOne('SELECT * FROM users WHERE email=$1 AND is_active=1',[email.toLowerCase()]);
  if (!user) return c.json({error:'Invalid credentials'},401);
  // Demo: any password works if hash='demo'; production: compare hash
  const valid = user.password_hash==='demo' || hashPw(password)===user.password_hash;
  if (!valid) return c.json({error:'Invalid credentials'},401);
  const token = createJWT({sub:user.id,email:user.email,name:user.name,role:user.role});
  return c.json({token,user:{id:user.id,email:user.email,name:user.name,role:user.role}});
});

r.post('/register', async (c) => {
  const {email,password,name,role='staff'} = await c.req.json();
  if (!email||!password||!name) return c.json({error:'All fields required'},400);
  if (await queryOne('SELECT id FROM users WHERE email=$1',[email])) return c.json({error:'Email taken'},409);
  const rows = await query(
    'INSERT INTO users (email,name,role,password_hash) VALUES ($1,$2,$3,$4) RETURNING id,email,name,role',
    [email.toLowerCase(),name,role,hashPw(password)]);
  const user = rows[0];
  return c.json({token:createJWT({sub:user.id,...user}),user},201);
});

r.get('/me', async (c) => c.json({user:c.get('user')}));

export default r;
