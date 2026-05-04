import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatTHB } from '../lib/utils';
import { Field } from '../components/UI';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Item {
  item_no: number; description: string; quantity: number;
  unit: string; target_price: number; our_price: number; amount: number; notes: string;
}

export default function NewRFQ() {
  const navigate  = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    rfq_number: '', customer_name: '', customer_contact: '',
    customer_email: '', customer_phone: '', customer_address: '',
    received_date: new Date().toISOString().slice(0,10),
    delivery_due_date: '', quote_deadline: '',
    notes: '', internal_notes: '', status: 'received',
  });
  const [items, setItems] = useState<Item[]>([
    { item_no:1, description:'', quantity:1, unit:'EA', target_price:0, our_price:0, amount:0, notes:'' },
  ]);

  const set = (k: string, v: any) => setForm(f => ({...f,[k]:v}));

  const updItem = (idx: number, field: string, val: any) => {
    const next = [...items];
    next[idx] = {...next[idx],[field]:val};
    if (field==='quantity'||field==='our_price') {
      next[idx].amount = +(Number(next[idx].quantity)*Number(next[idx].our_price)).toFixed(2);
    }
    setItems(next);
  };

  const addItem = () => setItems(p=>[...p,{item_no:p.length+1,description:'',quantity:1,unit:'EA',target_price:0,our_price:0,amount:0,notes:''}]);
  const removeItem = (idx: number) => setItems(p=>p.filter((_,i)=>i!==idx).map((it,i)=>({...it,item_no:i+1})));

  const total = items.reduce((s,i)=>s+Number(i.amount),0);
  const vat   = Math.round(total*7)/100;

  const handleSave = async () => {
    if (!form.rfq_number)     return toast.error('RFQ number required');
    if (!form.customer_name)  return toast.error('Customer name required');
    if (items.some(i=>!i.description)) return toast.error('All items need a description');
    setSaving(true);
    try {
      const data = await api.post('/api/rfqs', {...form, items});
      toast.success(`RFQ ${data.rfq.rfq_number} created`);
      navigate(`/rfqs/${data.rfq.id}`);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2 rounded-lg"><ArrowLeft size={18}/></button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">New Customer RFQ</h1>
          <p className="text-sm text-gray-400">Manual entry — or use the PDF upload on the list page</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-5">

          {/* Customer info */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              Customer & RFQ Info
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="RFQ Number" required>
                <input className="input font-mono" value={form.rfq_number}
                  onChange={e=>set('rfq_number',e.target.value)} placeholder="e.g. 26/007" />
              </Field>
              <Field label="Received Date">
                <input className="input" type="date" value={form.received_date}
                  onChange={e=>set('received_date',e.target.value)} />
              </Field>
              <div className="col-span-2">
                <Field label="Customer Name" required>
                  <input className="input" value={form.customer_name}
                    onChange={e=>set('customer_name',e.target.value)}
                    placeholder="Microchip Technology (Thailand) Co., Ltd." />
                </Field>
              </div>
              <Field label="Contact Person">
                <input className="input" value={form.customer_contact}
                  onChange={e=>set('customer_contact',e.target.value)} placeholder="K. Waraporn M" />
              </Field>
              <Field label="Email">
                <input className="input" type="email" value={form.customer_email}
                  onChange={e=>set('customer_email',e.target.value)} />
              </Field>
              <Field label="Phone">
                <input className="input" value={form.customer_phone}
                  onChange={e=>set('customer_phone',e.target.value)} />
              </Field>
              <Field label="Initial Status">
                <select className="select" value={form.status} onChange={e=>set('status',e.target.value)}>
                  <option value="received">Received</option>
                  <option value="reviewing">Reviewing</option>
                </select>
              </Field>
              <div className="col-span-2">
                <Field label="Customer Address">
                  <textarea className="textarea" rows={2} value={form.customer_address}
                    onChange={e=>set('customer_address',e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              Deadlines
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Delivery Due Date">
                <input className="input" type="date" value={form.delivery_due_date}
                  onChange={e=>set('delivery_due_date',e.target.value)} />
              </Field>
              <Field label="Quote Submission Deadline">
                <input className="input" type="date" value={form.quote_deadline}
                  onChange={e=>set('quote_deadline',e.target.value)} />
              </Field>
              <div className="col-span-2">
                <Field label="Customer Notes">
                  <textarea className="textarea" rows={2} value={form.notes}
                    onChange={e=>set('notes',e.target.value)}
                    placeholder="Notes from the customer RFQ document…" />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Internal Notes">
                  <textarea className="textarea" rows={2} value={form.internal_notes}
                    onChange={e=>set('internal_notes',e.target.value)}
                    placeholder="Internal tracking notes (not shared with customer)…" />
                </Field>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                Items Requested
              </h2>
              <button onClick={addItem} className="btn-secondary btn-sm"><Plus size={13}/> Add Row</button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500">
                    <th className="px-3 py-2.5 text-left w-8">#</th>
                    <th className="px-3 py-2.5 text-left">Description</th>
                    <th className="px-3 py-2.5 text-center w-16">Qty</th>
                    <th className="px-3 py-2.5 text-center w-14">Unit</th>
                    <th className="px-3 py-2.5 text-right w-24">Target ฿</th>
                    <th className="px-3 py-2.5 text-right w-24">Our Price ฿</th>
                    <th className="px-3 py-2.5 text-right w-24">Amount ฿</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item,idx)=>(
                    <tr key={idx} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2 text-gray-400 text-xs">{idx+1}</td>
                      <td className="px-3 py-2">
                        <input className="input py-1.5 text-sm" value={item.description}
                          onChange={e=>updItem(idx,'description',e.target.value)} placeholder="Item…" />
                      </td>
                      <td className="px-3 py-2">
                        <input className="input py-1.5 text-sm text-center" type="number" min={0}
                          value={item.quantity} onChange={e=>updItem(idx,'quantity',Number(e.target.value))} />
                      </td>
                      <td className="px-3 py-2">
                        <input className="input py-1.5 text-sm text-center" value={item.unit}
                          onChange={e=>updItem(idx,'unit',e.target.value)} />
                      </td>
                      <td className="px-3 py-2">
                        <input className="input py-1.5 text-sm text-right tabular-nums" type="number" min={0} step={0.01}
                          value={item.target_price} onChange={e=>updItem(idx,'target_price',Number(e.target.value))} />
                      </td>
                      <td className="px-3 py-2">
                        <input className="input py-1.5 text-sm text-right tabular-nums" type="number" min={0} step={0.01}
                          value={item.our_price} onChange={e=>updItem(idx,'our_price',Number(e.target.value))} />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold pr-4">
                        ฿{formatTHB(item.amount)}
                      </td>
                      <td className="px-3 py-2">
                        {items.length>1&&(
                          <button onClick={()=>removeItem(idx)}
                            className="text-red-300 hover:text-red-500 p-1 transition-colors">
                            <Trash2 size={13}/>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar summary */}
        <div>
          <div className="card p-5 sticky top-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Summary</h2>
            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between text-gray-500">
                <span>Items</span><span className="font-medium text-gray-800">{items.length}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span className="tabular-nums">฿{formatTHB(total)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>VAT 7%</span><span className="tabular-nums">฿{formatTHB(vat)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2.5 flex justify-between font-bold text-base">
                <span>Grand Total</span>
                <span className="text-blue-700 tabular-nums">฿{formatTHB(total+vat)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <button className="btn-primary w-full justify-center" disabled={saving} onClick={handleSave}>
                {saving?'Saving…':'Save RFQ'}
              </button>
              <button className="btn-secondary w-full justify-center" onClick={()=>navigate(-1)}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
