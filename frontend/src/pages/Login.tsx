import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/api';
import { FileText, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const DEMOS = [
  { label: 'Staff',   email: 'waraporn@pattarapol.co.th' },
  { label: 'Manager', email: 'manager@pattarapol.co.th' },
  { label: 'Admin',   email: 'admin@pattarapol.co.th' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email, setEmail]     = useState('');
  const [pw, setPw]           = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await login(email, pw); navigate('/'); }
    catch (err: any) { toast.error(err.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <FileText size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">RFQ Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Pattarapol General Part</p>
        </div>

        {/* Demo accounts */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-amber-700 mb-2">Demo Accounts (any password)</p>
          <div className="flex gap-2">
            {DEMOS.map(d => (
              <button key={d.email} onClick={() => { setEmail(d.email); setPw('demo'); }}
                className="flex-1 px-2 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-amber-700 hover:bg-amber-50 font-medium capitalize">
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input className="input pr-10" type={showPw ? 'text' : 'password'}
                value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
