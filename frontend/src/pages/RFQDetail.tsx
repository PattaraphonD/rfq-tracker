import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatTHB, formatDate } from '../lib/utils';
import { Spinner, Modal, Field } from '../components/UI';
import { ArrowLeft, Clock, CheckCircle, XCircle, Truck, FileText, AlertTriangle, Edit3, Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = [
  { key:'received',  label:'Received',  desc:'RFQ received from customer' },
  { key:'reviewing', label:'Reviewing', desc:'Team is reviewing requirements' },
  { key:'quoted',    label:'Quoted',    desc:'Quotation sent to customer' },
  { key:'accepted',  label:'Accepted',  desc:'Customer accepted the quote' },
  { key:'delivered', label:'Delivered', desc:'Order fulfilled and delivered' },
];

const NEXT: Record<string,{key:string;label:string;color:string}[]> = {
  received:  [{key:'reviewing',label:'Start Reviewing',color:'amber'}],
  reviewing: [{key:'quoted',label:'Mark as Quoted',color:'indigo'},{key:'rejected',label:'Reject',color:'red'}],
  quoted:    [{key:'accepted',label:'Mark Accepted',color:'green'},{key:'rejected',label:'Mark Rejected',color:'red'}],
  accepted:  [{key:'delivered',label:'Mark Delivered',color:'teal'}],
  delivered: [],
  rejected:  [{key:'received',label:'Reopen',color:'blue'}],
};

const BTN: Record<string,string> = {
  amber:'bg-amber-500 hover:bg-amber-600 text-white',
  indigo:'bg-indigo-600 hover:bg-indigo-700 text-white',
  green:'bg-emerald-600 hover:bg-emerald-700 text-white',
  teal:'bg-teal-600 hover:bg-teal-700 text-white',
  red:'bg-red-600 hover:bg-red-700 text-white',
  blue:'bg-blue-600 hover:bg-blue-700 text-white',
};

const HIST_ICON: Record<string,any> = {
  received:Clock, reviewing:Clock, quoted:FileText,
  accepted:CheckCircle, delivered:Truck, rejected:XCircle,
};

export default function RFQDetail() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq]           = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [actionLoading, setAL]  = useState('');
  const [modal, setModal]       = useState<any>(null);
  const [comment, setComment]   = useState('');
  const [dueDate, setDueDate]   = useState('');
  const [quotedTotal, setQT]    = useState('');
  const [editItems, setEditItems] = useState(false);
  const [items, setItems]       = useState<any[]>([]);
  const [showPDFText, setShowPDF] = useState(false);
  const [editDue, setEditDue]   = useState(false);
  const [newDue, setNewDue]     = useState('');

  const load = () => api.get(`/api/rfqs/${id}`).then(d => {
    setRfq(d.rfq); setItems(d.rfq.items || []); setLoading(false);
  });
  useEffect(() => { load(); }, [id]);

  const changeStatus = async () => {
    if (!modal) return;
    setAL(modal.key);
    try {
      const payload: any = { status: modal.key, comment: comment||undefined };
      if (dueDate) payload.delivery_due_date = dueDate;
      if (quotedTotal) payload.quoted_total = parseFloat(quotedTotal);
      await api.post(`/api/rfqs/${id}/status`, payload);
      toast.success(`Status → ${modal.label}`);
      setModal(null); setComment(''); setDueDate(''); setQT('');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setAL(''); }
  };

  const saveItems = async () => {
    await api.patch(`/api/rfqs/${id}`, { items });
    toast.success('Items updated');
    setEditItems(false);
    load();
  };

  const updItem = (idx: number, field: string, val: any) => {
    const next = [...items];
    next[idx] = {...next[idx],[field]:val};
    if (field==='quantity'||field==='our_price') {
      next[idx].amount = +(Number(next[idx].quantity)*Number(next[idx].our_price)).toFixed(2);
    }
    setItems(next);
  };

  if (loading) return <div className="flex justify-center items-center h-96"><Spinner size={32}/></div>;
  if (!rfq)   return <div className="p-8 text-center text-gray-500">RFQ not found</div>;

  const isRejected = rfq.status === 'rejected';
  const steps = isRejected
    ? [...STEPS.slice(0,3), {key:'rejected',label:'Rejected',desc:'Customer rejected / lost'}]
    : STEPS;
  const stepIdx = steps.findIndex(s => s.key === rfq.status);
  const nextActions = NEXT[rfq.status] || [];
  const total = items.reduce((s,i)=>s+Number(i.amount||0),0);
  const vat   = Math.round(total*7)/100;

  // Delivery countdown
  const daysUntil = rfq.days_until_due !== null ? Number(rfq.days_until_due) : null;
  const isOverdue = rfq.is_overdue;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/rfqs')} className="btn-ghost p-2 rounded-lg">
            <ArrowLeft size={18}/>
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-gray-900 font-mono">{rfq.rfq_number}</h1>
              {isOverdue && <span className="badge bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle size={11}/>Overdue</span>}
            </div>
            <p className="text-sm text-gray-400">{rfq.customer_name} · Received {formatDate(rfq.received_date)}</p>
          </div>
        </div>
        {rfq.pdf_filename && (
          <button onClick={() => setShowPDF(!showPDFText)} className="btn-secondary text-xs">
            <FileText size={14}/> {showPDFText ? 'Hide' : 'View'} PDF Text
          </button>
        )}
      </div>

      {/* Status stepper */}
      <div className="card p-5 mb-5">
        <div className="relative flex items-center">
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 z-0"/>
          <div className="absolute top-4 left-4 h-0.5 bg-blue-600 z-0 transition-all"
            style={{ width: stepIdx<=0?'0%':`${(stepIdx/(steps.length-1))*100}%` }}/>
          <div className="relative z-10 flex justify-between w-full">
            {steps.map((step, idx) => {
              const done   = idx < stepIdx;
              const active = idx === stepIdx;
              const Icon   = HIST_ICON[step.key] || Clock;
              return (
                <div key={step.key} className="flex flex-col items-center gap-1.5" style={{flex:1}}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isRejected && step.key==='rejected' ? 'bg-red-500 border-red-500' :
                    active ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200' :
                    done   ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
                  }`}>
                    <Icon size={14} className={done||active?'text-white':'text-gray-300'}/>
                  </div>
                  <p className={`text-center text-xs leading-tight ${
                    active?'font-semibold text-blue-700':done?'text-blue-600':'text-gray-400'
                  }`} style={{maxWidth:64}}>{step.label}</p>
                </div>
              );
            })}
          </div>
        </div>
        {nextActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 w-full mb-1">Next action:</p>
            {nextActions.map(a => (
              <button key={a.key} className={`btn btn-sm ${BTN[a.color]}`}
                disabled={!!actionLoading} onClick={() => setModal(a)}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">

          {/* Delivery countdown */}
          <div className={`card p-5 border-l-4 ${
            isOverdue ? 'border-l-red-500 bg-red-50' :
            daysUntil !== null && daysUntil <= 3 ? 'border-l-amber-500 bg-amber-50' :
            daysUntil !== null ? 'border-l-blue-500' : 'border-l-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Truck size={15} className="text-gray-500"/> Delivery Due Date
              </h2>
              <button onClick={() => { setNewDue(rfq.delivery_due_date||''); setEditDue(true); }}
                className="text-gray-400 hover:text-gray-600 p-1"><Edit3 size={13}/></button>
            </div>
            {rfq.delivery_due_date ? (
              <div className="mt-2">
                <p className={`text-2xl font-bold tabular-nums ${isOverdue?'text-red-600':daysUntil!==null&&daysUntil<=3?'text-amber-600':'text-gray-900'}`}>
                  {formatDate(rfq.delivery_due_date)}
                </p>
                {daysUntil !== null && (
                  <p className={`text-sm font-medium mt-1 ${isOverdue?'text-red-600':daysUntil<=3?'text-amber-600':'text-gray-500'}`}>
                    {isOverdue
                      ? `⚠️ ${Math.abs(daysUntil)} days overdue`
                      : daysUntil === 0 ? '🚨 Due TODAY'
                      : daysUntil <= 3 ? `⏰ ${daysUntil} days remaining`
                      : `📅 ${daysUntil} days remaining`
                    }
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-sm mt-2">No due date set —
                <button onClick={() => setEditDue(true)} className="text-blue-600 ml-1 hover:underline">add one</button>
              </p>
            )}
            {rfq.quote_deadline && (
              <p className="text-xs text-gray-500 mt-2">Quote deadline: {formatDate(rfq.quote_deadline)}</p>
            )}
          </div>

          {/* Customer info */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Customer Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Company',  rfq.customer_name],
                ['Contact',  rfq.customer_contact],
                ['Email',    rfq.customer_email],
                ['Phone',    rfq.customer_phone],
              ].map(([k,v]) => v ? (
                <div key={k}>
                  <p className="text-xs text-gray-400">{k}</p>
                  <p className="font-medium text-gray-800">{v}</p>
                </div>
              ) : null)}
              {rfq.customer_address && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">Address</p>
                  <p className="text-gray-700 text-sm">{rfq.customer_address}</p>
                </div>
              )}
            </div>
            {rfq.notes && (
              <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
                📌 {rfq.notes}
              </div>
            )}
            {rfq.internal_notes && (
              <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800">
                🔒 Internal: {rfq.internal_notes}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">
                Items Requested ({items.length})
              </h2>
              <button onClick={() => editItems ? saveItems() : setEditItems(true)}
                className={editItems ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}>
                {editItems ? <><Save size={13}/> Save Items</> : <><Edit3 size={13}/> Edit</>}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr>
                  <th className="w-8">#</th><th>Description</th>
                  <th className="text-center">Qty</th><th>Unit</th>
                  <th className="text-right">Target ฿</th>
                  <th className="text-right">Our Price ฿</th>
                  <th className="text-right">Amount ฿</th>
                  {editItems && <th className="w-8"></th>}
                </tr></thead>
                <tbody>
                  {items.map((item,i) => (
                    <tr key={item.id||i}>
                      <td className="text-gray-400 text-xs font-mono">{item.item_no}</td>
                      <td className="font-medium">
                        {editItems
                          ? <input className="input py-1 text-sm" value={item.description}
                              onChange={e=>updItem(i,'description',e.target.value)}/>
                          : item.description}
                      </td>
                      <td className="text-center tabular-nums">
                        {editItems
                          ? <input className="input py-1 text-sm text-center w-16" type="number"
                              value={item.quantity} onChange={e=>updItem(i,'quantity',Number(e.target.value))}/>
                          : item.quantity}
                      </td>
                      <td className="text-gray-500 text-xs">{item.unit}</td>
                      <td className="text-right tabular-nums text-gray-500">
                        {item.target_price ? `฿${formatTHB(item.target_price)}` : '—'}
                      </td>
                      <td className="text-right tabular-nums">
                        {editItems
                          ? <input className="input py-1 text-sm text-right w-24" type="number" step={0.01}
                              value={item.our_price||''} onChange={e=>updItem(i,'our_price',Number(e.target.value))}/>
                          : item.our_price ? `฿${formatTHB(item.our_price)}` : '—'}
                      </td>
                      <td className="text-right tabular-nums font-semibold">
                        ฿{formatTHB(item.amount||0)}
                      </td>
                      {editItems && (
                        <td>
                          <button onClick={() => setItems(p=>p.filter((_,j)=>j!==i))}
                            className="text-red-300 hover:text-red-500 p-1"><Trash2 size={13}/></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={editItems?8:7} className="text-right px-4 py-2 text-sm text-gray-500">
                      Subtotal
                    </td>
                  </tr>
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td colSpan={editItems?7:6} className="text-right px-4 py-3 font-bold text-blue-900">
                      Total (excl. VAT)
                    </td>
                    <td className="text-right px-4 py-3 tabular-nums font-bold text-blue-900 text-base">
                      ฿{formatTHB(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {editItems && (
              <div className="px-5 py-3 border-t border-gray-100">
                <button onClick={() => setItems(p=>[...p,{item_no:p.length+1,description:'',quantity:1,unit:'EA',target_price:0,our_price:0,amount:0}])}
                  className="btn-ghost btn-sm"><Plus size={13}/> Add Row</button>
              </div>
            )}
          </div>

          {/* PDF text viewer */}
          {showPDFText && rfq.pdf_text && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText size={14}/> Extracted PDF Text
                <span className="text-xs text-gray-400 font-normal">({rfq.pdf_filename})</span>
              </h2>
              <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">
                {rfq.pdf_text}
              </pre>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Status history */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Activity Log</h3>
            {(rfq.history||[]).length === 0 ? (
              <p className="text-xs text-gray-400">No activity yet</p>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200"/>
                <div className="space-y-4">
                  {[...(rfq.history||[])].reverse().map((h:any) => {
                    const Icon = HIST_ICON[h.to_status] || Clock;
                    return (
                      <div key={h.id} className="flex gap-3 pl-1">
                        <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0 z-10">
                          <Icon size={11} className="text-gray-500"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 capitalize">
                            {h.from_status && <span className="text-gray-400 text-xs">{h.from_status} → </span>}
                            {h.to_status?.replace(/_/g,' ')}
                          </p>
                          {h.comment && <p className="text-xs text-gray-500 mt-0.5 bg-gray-50 rounded px-2 py-1">{h.comment}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {h.actor_name||'System'} · {formatDate(h.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quote summary */}
          {rfq.quoted_total && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Quoted Amount</h3>
              <p className="text-2xl font-bold text-blue-700 tabular-nums">
                ฿{formatTHB(rfq.quoted_total)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Amount sent to customer</p>
            </div>
          )}
        </div>
      </div>

      {/* Status change modal */}
      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal?.label||''} size="sm">
        <div className="space-y-4">
          {modal?.key==='quoted' && (
            <Field label="Quoted Total (฿)">
              <input className="input" type="number" step={0.01} value={quotedTotal}
                onChange={e=>setQT(e.target.value)} placeholder="Total amount quoted to customer" />
            </Field>
          )}
          {(modal?.key==='accepted'||modal?.key==='quoted') && !rfq.delivery_due_date && (
            <Field label="Delivery Due Date">
              <input className="input" type="date" value={dueDate}
                onChange={e=>setDueDate(e.target.value)} />
            </Field>
          )}
          <Field label="Comment / Note (optional)">
            <textarea className="textarea" rows={3} value={comment}
              onChange={e=>setComment(e.target.value)} placeholder="Add a note…"/>
          </Field>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={()=>setModal(null)}>Cancel</button>
            <button className={`btn ${BTN[modal?.color||'blue']}`}
              disabled={!!actionLoading} onClick={changeStatus}>
              {actionLoading===modal?.key?'Updating…':'Confirm'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit due date modal */}
      <Modal open={editDue} onClose={()=>setEditDue(false)} title="Edit Delivery Due Date" size="sm">
        <Field label="Delivery Due Date">
          <input className="input" type="date" value={newDue} onChange={e=>setNewDue(e.target.value)}/>
        </Field>
        <div className="flex gap-3 justify-end mt-4">
          <button className="btn-secondary" onClick={()=>setEditDue(false)}>Cancel</button>
          <button className="btn-primary" onClick={async()=>{
            await api.patch(`/api/rfqs/${id}`,{delivery_due_date:newDue});
            toast.success('Due date updated');
            setEditDue(false); load();
          }}>Save</button>
        </div>
      </Modal>
    </div>
  );
}
