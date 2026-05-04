import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useAuth } from '../lib/api';
import { formatTHB, formatDate } from '../lib/utils';
import { Spinner } from '../components/UI';
import { Inbox, Clock, CheckCircle, XCircle, AlertTriangle, Truck, Plus, ArrowRight } from 'lucide-react';

const STAGE_CONFIG = [
  { key: 'received',  label: 'Received',  color: 'blue',   bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-200' },
  { key: 'reviewing', label: 'Reviewing', color: 'amber',  bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-200' },
  { key: 'quoted',    label: 'Quoted',    color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-200' },
  { key: 'accepted',  label: 'Accepted',  color: 'green',  bg: 'bg-emerald-50',text: 'text-emerald-700',ring: 'ring-emerald-200' },
  { key: 'delivered', label: 'Delivered', color: 'teal',   bg: 'bg-teal-50',   text: 'text-teal-700',   ring: 'ring-teal-200' },
  { key: 'rejected',  label: 'Rejected',  color: 'red',    bg: 'bg-red-50',    text: 'text-red-600',    ring: 'ring-red-200' },
];

const STATUS_BADGE: Record<string,string> = {
  received:'bg-blue-100 text-blue-700', reviewing:'bg-amber-100 text-amber-700',
  quoted:'bg-indigo-100 text-indigo-700', accepted:'bg-emerald-100 text-emerald-700',
  delivered:'bg-teal-100 text-teal-700', rejected:'bg-red-100 text-red-600',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]       = useState<any>(null);
  const [recent, setRecent]   = useState<any[]>([]);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/reports/summary'),
      api.get('/api/rfqs?limit=6'),
      api.get('/api/rfqs?overdue=1'),
    ]).then(([sum, rfqs, ov]) => {
      setData(sum);
      setRecent(rfqs.rfqs || []);
      setOverdue(ov.rfqs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size={32} /></div>;

  const pipeline = data?.pipeline || {};
  const totals   = data?.totals || {};

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Hello {user?.name?.split(' ')[0]} · RFQ pipeline overview</p>
        </div>
        <button onClick={() => navigate('/rfqs/new')} className="btn-primary">
          <Plus size={16} /> New RFQ
        </button>
      </div>

      {/* Pipeline strip */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGE_CONFIG.map(({ key, label, bg, text, ring }) => {
          const d = pipeline[key] || { count: 0, total_value: 0 };
          return (
            <button key={key}
              onClick={() => navigate(`/rfqs?status=${key}`)}
              className={`card p-4 text-left hover:shadow-md transition-all hover:-translate-y-0.5 ring-0 hover:ring-2 ${ring}`}>
              <p className={`text-2xl font-bold tabular-nums ${text}`}>{d.count}</p>
              <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
              {d.total_value > 0 && (
                <p className={`text-xs tabular-nums mt-1 ${text} opacity-75`}>
                  ฿{formatTHB(d.total_value)}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total RFQs',    value: totals.total_rfqs || 0,   icon: Inbox,       c: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Active',        value: totals.active || 0,        icon: Clock,       c: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: 'Won',           value: totals.won || 0,           icon: CheckCircle, c: 'text-emerald-600',bg: 'bg-emerald-50' },
          { label: 'Overdue',       value: data?.overdue_count || 0,  icon: AlertTriangle,c:'text-red-600',    bg: 'bg-red-50' },
        ].map(({ label, value, icon: Icon, c, bg }) => (
          <div key={label} className="card p-5">
            <div className={`w-9 h-9 rounded-xl ${bg} ${c} flex items-center justify-center mb-3`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="card border-red-200 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-red-50 border-b border-red-200">
            <AlertTriangle size={16} className="text-red-600" />
            <h2 className="text-sm font-semibold text-red-800">
              {overdue.length} Overdue RFQ{overdue.length > 1 ? 's' : ''} — Needs Immediate Attention
            </h2>
          </div>
          <div className="divide-y divide-red-50">
            {overdue.slice(0, 5).map((rfq: any) => (
              <div key={rfq.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-red-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/rfqs/${rfq.id}`)}>
                <div>
                  <p className="text-sm font-semibold text-gray-900 font-mono">{rfq.rfq_number}</p>
                  <p className="text-xs text-gray-500">{rfq.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">
                    {Math.abs(Number(rfq.days_until_due))} days overdue
                  </p>
                  <p className="text-xs text-gray-400">Due {formatDate(rfq.delivery_due_date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent RFQs */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Recent RFQs</h2>
          <button onClick={() => navigate('/rfqs')}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
            View all <ArrowRight size={12} />
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="py-14 text-center">
            <Inbox size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No RFQs yet</p>
            <button onClick={() => navigate('/rfqs/new')} className="btn-primary mt-4 text-sm">
              <Plus size={14} /> Upload First RFQ
            </button>
          </div>
        ) : (
          <table className="table-base">
            <thead><tr>
              <th>RFQ No.</th><th>Customer</th><th>Received</th>
              <th>Due Date</th><th className="text-right">Value</th><th>Status</th>
            </tr></thead>
            <tbody>
              {recent.map((rfq: any) => (
                <tr key={rfq.id} className="cursor-pointer" onClick={() => navigate(`/rfqs/${rfq.id}`)}>
                  <td className="font-mono font-semibold text-blue-600">{rfq.rfq_number}</td>
                  <td className="font-medium max-w-[180px] truncate">{rfq.customer_name}</td>
                  <td className="text-sm text-gray-500">{formatDate(rfq.received_date)}</td>
                  <td>
                    {rfq.delivery_due_date ? (
                      <span className={`text-sm font-medium ${
                        rfq.is_overdue ? 'text-red-600' :
                        Number(rfq.days_until_due) <= 3 ? 'text-amber-600' : 'text-gray-700'
                      }`}>
                        {formatDate(rfq.delivery_due_date)}
                        {rfq.is_overdue && <span className="text-xs ml-1">⚠️</span>}
                        {!rfq.is_overdue && rfq.days_until_due !== null &&
                          <span className="text-xs text-gray-400 ml-1">({rfq.days_until_due}d)</span>
                        }
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="text-right tabular-nums font-semibold">
                    ฿{formatTHB(rfq.total_amount || 0)}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[rfq.status] || 'bg-gray-100 text-gray-600'}`}>
                      {rfq.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
