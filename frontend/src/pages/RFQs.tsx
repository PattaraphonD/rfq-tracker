import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatTHB, formatDate } from '../lib/utils';
import { Spinner, EmptyState } from '../components/UI';
import { Plus, Inbox, Search, Upload, FileText, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = [
  { key:'',          label:'All' },
  { key:'received',  label:'Received',  dot:'bg-blue-500' },
  { key:'reviewing', label:'Reviewing', dot:'bg-amber-500' },
  { key:'quoted',    label:'Quoted',    dot:'bg-indigo-500' },
  { key:'accepted',  label:'Accepted',  dot:'bg-emerald-500' },
  { key:'delivered', label:'Delivered', dot:'bg-teal-500' },
  { key:'rejected',  label:'Rejected',  dot:'bg-red-500' },
];

const BADGE: Record<string,string> = {
  received:'bg-blue-100 text-blue-700', reviewing:'bg-amber-100 text-amber-700',
  quoted:'bg-indigo-100 text-indigo-700', accepted:'bg-emerald-100 text-emerald-700',
  delivered:'bg-teal-100 text-teal-700', rejected:'bg-red-100 text-red-600',
};

export default function RFQs() {
  const navigate   = useNavigate();
  const [sp, setSP] = useSearchParams();
  const fileRef    = useRef<HTMLInputElement>(null);
  const [rfqs, setRfqs]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUpload]  = useState(false);
  const [dragging, setDragging] = useState(false);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState(sp.get('status') || '');

  const load = () => {
    setLoading(true);
    const qs = status ? `?status=${status}` : '';
    api.get(`/api/rfqs${qs}`).then(d => { setRfqs(d.rfqs||[]); setLoading(false); });
  };

  useEffect(() => { load(); }, [status]);

  const setFilter = (s: string) => {
    setStatus(s); s ? setSP({status:s}) : setSP({});
  };

  const handlePDF = async (file: File) => {
    if (!file.type.includes('pdf')) return toast.error('Please upload a PDF file');
    setUpload(true);
    toast.loading('Processing PDF…', { id: 'upload' });
    try {
      const form = new FormData();
      form.append('pdf', file);
      const data = await api.upload('/api/rfqs/upload', form);
      toast.success(`RFQ ${data.rfq.rfq_number} created — ${data.message}`, { id: 'upload' });
      navigate(`/rfqs/${data.rfq.id}`);
    } catch (err: any) {
      toast.error(err.message, { id: 'upload' });
      setUpload(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePDF(file);
  };

  const filtered = rfqs.filter(r =>
    !search ||
    r.rfq_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Customer RFQs</h1>
          <p className="text-sm text-gray-400 mt-0.5">Upload PDF or create manually to start tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="btn-secondary" disabled={uploading}>
            <Upload size={15} /> Upload PDF
          </button>
          <button onClick={() => navigate('/rfqs/new')} className="btn-primary">
            <Plus size={15} /> Manual Entry
          </button>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={e => e.target.files?.[0] && handlePDF(e.target.files[0])} />
        </div>
      </div>

      {/* PDF drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-6 mb-6 text-center transition-all cursor-pointer ${
          dragging ? 'border-blue-400 bg-blue-50 scale-[1.01]' :
          uploading ? 'border-blue-300 bg-blue-50' :
          'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
        }`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current?.click()}
      >
        <Upload size={24} className={`mx-auto mb-2 ${uploading ? 'text-blue-500 animate-bounce' : 'text-gray-300'}`} />
        <p className="text-sm font-medium text-gray-600">
          {uploading ? 'Processing PDF — extracting RFQ data…' : 'Drop customer RFQ PDF here to auto-import'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {uploading ? 'Please wait…' : 'Extracts RFQ number, customer info, items, and delivery dates automatically'}
        </p>
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap transition-all ${
              status===s.key ? 'bg-blue-600 text-white border-blue-600' :
              'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {s.dot && <span className={`w-2 h-2 rounded-full ${s.dot}`} />}
            {s.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-72 mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9 text-sm" placeholder="Search RFQ no. or customer…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-10 flex justify-center"><Spinner /></div> :
          filtered.length === 0 ? (
            <EmptyState icon={<Inbox size={36} />} title="No RFQs found"
              description="Upload a PDF or create an RFQ manually"
              action={<button onClick={() => fileRef.current?.click()} className="btn-primary text-sm"><Upload size={14} />Upload PDF</button>} />
          ) : (
            <table className="table-base">
              <thead><tr>
                <th>RFQ No.</th><th>Customer</th><th>Contact</th>
                <th>Received</th><th>Delivery Due</th>
                <th className="text-right">Value</th><th>Status</th>
              </tr></thead>
              <tbody>
                {filtered.map(rfq => (
                  <tr key={rfq.id} className="cursor-pointer group" onClick={() => navigate(`/rfqs/${rfq.id}`)}>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-blue-600">{rfq.rfq_number}</span>
                        {rfq.pdf_filename && <FileText size={11} className="text-gray-300" />}
                      </div>
                    </td>
                    <td className="font-medium max-w-[180px] truncate">{rfq.customer_name}</td>
                    <td className="text-sm text-gray-500">{rfq.customer_contact || '—'}</td>
                    <td className="text-sm text-gray-500">{formatDate(rfq.received_date)}</td>
                    <td>
                      {rfq.delivery_due_date ? (
                        <div className="flex items-center gap-1.5">
                          {rfq.is_overdue && <AlertTriangle size={12} className="text-red-500" />}
                          <span className={`text-sm font-medium ${
                            rfq.is_overdue ? 'text-red-600' :
                            Number(rfq.days_until_due) <= 3 ? 'text-amber-600' : 'text-gray-700'
                          }`}>
                            {formatDate(rfq.delivery_due_date)}
                            {rfq.is_overdue
                              ? <span className="text-xs ml-1 font-bold">({Math.abs(Number(rfq.days_until_due))}d late)</span>
                              : rfq.days_until_due !== null
                                ? <span className="text-xs text-gray-400 ml-1">({rfq.days_until_due}d)</span>
                                : null
                            }
                          </span>
                        </div>
                      ) : <span className="text-gray-300 text-sm">—</span>}
                    </td>
                    <td className="text-right tabular-nums font-semibold">฿{formatTHB(rfq.total_amount||0)}</td>
                    <td>
                      <span className={`badge ${BADGE[rfq.status]||'bg-gray-100 text-gray-600'}`}>
                        {rfq.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      {filtered.length > 0 && (
        <div className="flex justify-between mt-3 px-1 text-xs text-gray-400">
          <span>{filtered.length} RFQ{filtered.length>1?'s':''}</span>
          <span>Total: ฿{formatTHB(filtered.reduce((s,r)=>s+Number(r.total_amount||0),0))}</span>
        </div>
      )}
    </div>
  );
}
