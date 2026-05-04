import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function token() { return localStorage.getItem('rfq_token'); }

export async function apiFetch(path: string, options: RequestInit = {}) {
  const t = token();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  get:    (p: string)              => apiFetch(p),
  post:   (p: string, b: any)     => apiFetch(p, { method: 'POST', body: JSON.stringify(b) }),
  patch:  (p: string, b: any)     => apiFetch(p, { method: 'PATCH', body: JSON.stringify(b) }),
  delete: (p: string)             => apiFetch(p, { method: 'DELETE' }),
  upload: (p: string, form: FormData) => apiFetch(p, { method: 'POST', body: form }),
};

interface User { id: string; email: string; name: string; role: string; }
interface Ctx  { user: User|null; login(e:string,p:string):Promise<void>; logout():void; loading:boolean; }

const AuthCtx = createContext<Ctx>({} as Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<User|null>(null);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    const s = localStorage.getItem('rfq_user');
    if (s) { try { setUser(JSON.parse(s)); } catch {} }
    setLoad(false);
  }, []);

  const login = async (email: string, password: string) => {
    const d = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('rfq_token', d.token);
    localStorage.setItem('rfq_user', JSON.stringify(d.user));
    setUser(d.user);
  };

  const logout = () => {
    localStorage.removeItem('rfq_token');
    localStorage.removeItem('rfq_user');
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, login, logout, loading }}>{children}</AuthCtx.Provider>;
}

export function useAuth() { return useContext(AuthCtx); }
