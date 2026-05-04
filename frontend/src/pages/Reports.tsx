import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatTHB } from '../lib/utils';
import { Spinner } from '../components/UI';
import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS: Record<string,string> = {
  received:'#3b82f6', reviewing:'#f59e0b', quoted:'#6366f1',
  accepted:'#10b981', delivered:'#14b8a6', rejected:'#ef4444',
};

export default function Reports() {
  const [data, setData]   = useState<any>(null);
  const [loading, setL]   = useState(true);
  const [from, setFrom]   = useState('');
  const [to, setTo]       = useState('');
  const [status, setSt]   = useState('');

  useEffect(() => {
    api.get('/api/reports/summary').then(d => { setData(d); setL(false); });
  }, []);

  const doExport = async () => {
    const qs = new URLSearchParams();
    if (from)   qs.set('from', from);
    if (to)     qs.set('to', to);
    if (status) qs.set('status', status);
    const base  = (import.meta.env.VITE_API_URL||'').replace(/\/$/,'');
    const token = localStorage.getItem('rfq_token');
    const res = await fetch(`${base}/api/reports/export?${qs}`, { headers:{Authorization:`Bearer ${token}`} });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rfq-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size={32}/></div>;

  const pipeline    = data?.pipeline || {};
  const monthly     = data?.monthly  || [];
  const topCust     = data?.top_customers || [];
  const totals      = data?.totals || {};
  const stages = ['received','reviewing','quoted','accepted','delivered','rejected'];
  const pieData = stages.map(k => ({ name: k, value: pipeline[k]?.count||0 })).filter(d=>d.value>0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">Reports & Analytics</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total RFQs',   value: totals.total_rfqs||0 },
          { label:'Active',       value: totals.active||0 },
          { label:'Won',          value: totals.won||0 },
          { label:'Overdue Now',  value: data?.overdue_count||0 },
        ].map(({label,value}) => (
          <div key={label} className="card p-5">
            <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline bar */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline by Stage</h2>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {stages.map(k => {
            const d = pipeline[k]||{count:0,total_value:0};
            return (
              <div key={k} className="text-center p-3 rounded-xl bg-gray-50">
                <p className="text-xl font-bold tabular-nums" style={{color:COLORS[k]}}>{d.count}</p>
                <p className="text-xs text-gray-500 capitalize mt-0.5">{k}</p>
                {d.total_value > 0 && <p className="text-xs tabular-nums text-gray-400 mt-0.5">฿{formatTHB(d.total_value)}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Monthly */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly RFQs Received</h2>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly}>
                <XAxis dataKey="month" tick={{fontSize:11}}/>
                <YAxis tick={{fontSize:11}}/>
                <Tooltip/>
                <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 py-10 text-center">No data yet</p>}
        </div>

        {/* Status pie */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Status Breakdown</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {pieData.map(e => <Cell key={e.name} fill={COLORS[e.name]||'#9ca3af'}/>)}
                </Pie>
                <Legend formatter={v=><span style={{fontSize:12,textTransform:'capitalize'}}>{v}</span>}/>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 py-10 text-center">No data yet</p>}
        </div>
      </div>

      {/* Top customers */}
      {topCust.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Customers by RFQ Count</h2>
          <div className="space-y-3">
            {topCust.map((c:any) => {
              const pct = (c.rfq_count / topCust[0].rfq_count) * 100;
              return (
                <div key={c.customer_name} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-64 truncate">{c.customer_name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{width:`${pct}%`}}/>
                  </div>
                  <span className="text-sm font-medium w-16 text-right tabular-nums">{c.rfq_count} RFQs</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Export to CSV</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className="label">From</label><input className="input w-36" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div>
          <div><label className="label">To</label><input className="input w-36" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div>
          <div>
            <label className="label">Status</label>
            <select className="select w-32" value={status} onChange={e=>setSt(e.target.value)}>
              <option value="">All</option>
              {stages.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={doExport}><Download size={15}/> Export CSV</button>
        </div>
      </div>
    </div>
  );
}
