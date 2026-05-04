import crypto from 'crypto';
const SECRET = process.env.JWT_SECRET || 'dev-secret';

export function createJWT(payload) {
  const h = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const now = Math.floor(Date.now()/1000);
  const b = Buffer.from(JSON.stringify({...payload,iat:now,exp:now+86400*7})).toString('base64url');
  const s = crypto.createHmac('sha256',SECRET).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${s}`;
}

export function verifyJWT(token) {
  try {
    const [h,b,s] = token.split('.');
    const exp = crypto.createHmac('sha256',SECRET).update(`${h}.${b}`).digest('base64url');
    if (s!==exp) return null;
    const p = JSON.parse(Buffer.from(b,'base64url').toString());
    return p.exp < Math.floor(Date.now()/1000) ? null : p;
  } catch { return null; }
}

export function hashPw(pw) {
  return crypto.createHash('sha256').update(pw+'rfq-salt-2026').digest('hex');
}

export function requireAuth(c, next) {
  const auth = c.req.header('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return c.json({error:'Unauthorized'},401);
  const p = verifyJWT(auth.slice(7));
  if (!p) return c.json({error:'Invalid or expired token'},401);
  c.set('user', p);
  return next();
}
