import React, { useEffect, useMemo, useState } from 'react';

const LOW_STOCK_THRESHOLD = 100;
const uid = ()=> Math.random().toString(36).slice(2,10);
const todayStr = ()=> new Date().toISOString().slice(0,10);
const load = (k,f)=> { try{ const v=localStorage.getItem(k); return v? JSON.parse(v): f }catch(e){return f}};
const save = (k,v)=> localStorage.setItem(k,JSON.stringify(v));
const ym = (d)=>{ const dt=new Date(d||Date.now()); const y=dt.getFullYear(); const m=String(dt.getMonth()+1).padStart(2,'0'); return `${y}${m}`; };
const toCSV = (rows)=>{ if(!rows?.length) return ''; const headers = Object.keys(rows[0]); const esc = (x)=> typeof x==='string' && (x.includes(',')||x.includes('\n')||x.includes('"')) ? '"'+x.replaceAll('"','""')+'"' : x; const lines = [headers.join(',')].concat(rows.map(r=>headers.map(h=>esc(r[h]??'')).join(','))); return lines.join('\n'); };
const downloadCSV = (filename, rows)=>{ const blob = new Blob([toCSV(rows)], {type:'text/csv;charset=utf-8;'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); };

export default function App(){
  const [transactions, setTransactions] = useState(()=> load('inv_txns', []));
  const [skuIndex, setSkuIndex] = useState(()=> load('inv_sku_idx', {}));
  const [filters, setFilters] = useState({ q:'', lot:'', godown:'', type:'' });

  useEffect(()=> save('inv_txns', transactions), [transactions]);
  useEffect(()=> save('inv_sku_idx', skuIndex), [skuIndex]);

  const ensureSKU = (lot, godown, date)=>{ const key = `${lot}|${godown}|${ym(date)}`; const next = (skuIndex[key] ?? 0) + 1; const code = `${lot}-${godown}-${ym(date)}-${String(next).padStart(3,'0')}`; setSkuIndex(s=>({...s,[key]:next})); return code; };

  const stock = useMemo(()=>{ const map = new Map(); transactions.forEach(t=>{ const key = `${t.lot}|${t.godown}`; if(!map.has(key)) map.set(key,{ lot:t.lot, godown:t.godown, qty:0, amount:0, inQty:0, outQty:0 }); const row = map.get(key); if(t.type==='purchase'){ row.qty += Number(t.qty); row.inQty += Number(t.qty); row.amount += Number(t.qty) * Number(t.rate ?? 0);} else if(t.type==='sale'){ row.qty -= Number(t.qty); row.outQty += Number(t.qty);} map.set(key,row); }); return Array.from(map.values()).map(r=>({...r, avgRate: r.inQty ? r.amount / r.inQty : 0, sku: `${r.lot}-${r.godown}`})); }, [transactions]);

  const totals = useMemo(()=>{ let purchaseQty=0, saleQty=0, purchaseAmt=0, saleAmt=0; transactions.forEach(t=>{ if(t.type==='purchase'){ purchaseQty += Number(t.qty); purchaseAmt += Number(t.qty) * Number(t.rate ?? 0);} else if(t.type==='sale'){ saleQty += Number(t.qty); saleAmt += Number(t.qty) * Number(t.rate ?? 0);} }); return { purchaseQty, saleQty, purchaseAmt, saleAmt }; }, [transactions]);

  const filteredTxns = useMemo(()=>{ const q = filters.q.toLowerCase(); return transactions.filter(t=>{ const matchesQ = !q || `${t.billNo}`.toLowerCase().includes(q) || `${t.party}`.toLowerCase().includes(q) || `${t.lot}`.toLowerCase().includes(q) || `${t.godown}`.toLowerCase().includes(q); const matchesLot = !filters.lot || t.lot.toLowerCase().includes(filters.lot.toLowerCase()); const matchesGodown = !filters.godown || t.godown.toLowerCase().includes(filters.godown.toLowerCase()); const matchesType = !filters.type || t.type === filters.type; return matchesQ && matchesLot && matchesGodown && matchesType; }); }, [transactions, filters]);

  const onAddPurchase = (row)=>{ const id = uid(); const sku = ensureSKU(row.lot, row.godown, row.date); setTransactions(tx=> [{ id, type:'purchase', sku, ...row, qty: Number(row.qty), rate: Number(row.rate) }, ...tx]); };
  const onAddSale = (row)=>{ const key = `${row.lot}|${row.godown}`; const stk = stock.find(s=>`${s.lot}|${s.godown}`===key); const available = stk?.qty ?? 0; const want = Number(row.qty); if(want > available){ alert(`Insufficient stock in Lot ${row.lot}, Godown ${row.godown}. Available: ${available}, Requested: ${want}`); return; } const id = uid(); setTransactions(tx=> [{ id, type:'sale', ...row, qty: Number(row.qty), rate: Number(row.rate) }, ...tx]); };

  const resetAll = ()=>{ if(!confirm('This will permanently delete all data. Continue?')) return; localStorage.removeItem('inv_txns'); localStorage.removeItem('inv_sku_idx'); setTransactions([]); setSkuIndex({}); };

  const exportStock = ()=>{ const rows = stock.map(s=>({ Lot: s.lot, Godown: s.godown, SKU: s.sku, Quantity: s.qty, AvgRate: s.avgRate.toFixed(2), AmountValueAtAvgRate: (s.qty * s.avgRate).toFixed(2) })); downloadCSV(`stock_${todayStr()}.csv`, rows); };
  const exportTxns = ()=>{ const rows = transactions.map(t=>({ ID: t.id, Type: t.type, Date: t.date, BillNo: t.billNo, Party: t.party, Lot: t.lot, Godown: t.godown, SKU: t.sku ?? '', Qty: t.qty, Rate: t.rate, Amount: (Number(t.qty) * Number(t.rate ?? 0)).toFixed(2) })); downloadCSV(`transactions_${todayStr()}.csv`, rows); };

  return (
    <div style={{padding:20}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1 style={{fontSize:22}}>Sock Management Portal</h1>
        <div style={{display:'flex',gap:8}}>
          <button onClick={exportStock}>Export Stock CSV</button>
          <button onClick={exportTxns}>Export Txns CSV</button>
          <button onClick={resetAll} style={{background:'#ff6b6b'}}>Factory Reset</button>
        </div>
      </header>

      <main style={{marginTop:16}}>
        <section style={{display:'flex',gap:16,marginBottom:16}}>
          <div style={{flex:1,padding:12,borderRadius:12,background:'#fff'}}> 
            <h3>Purchase Entry</h3>
            <PurchaseForm onSubmit={onAddPurchase} />
          </div>
          <div style={{flex:1,padding:12,borderRadius:12,background:'#fff'}}>
            <h3>Sale Entry</h3>
            <SaleForm onSubmit={onAddSale} />
          </div>
        </section>

        <section style={{marginBottom:16}}>
          <h3>Stock (Lot-wise & Godown-wise)</h3>
          <StockTable rows={stock} />
        </section>

        <section style={{marginBottom:16}}>
          <h3>Transactions</h3>
          <TxnTable rows={filteredTxns} onDelete={(id)=> setTransactions(tx=> tx.filter(t=>t.id!==id))} />
        </section>
      </main>
      <footer style={{marginTop:20,fontSize:12,color:'#666'}}>Made for lot-wise, godown-wise sock stock billing • Local data only</footer>
    </div>
  );
}

// UI components (simple)
function TextInput({label,value,onChange,placeholder,type='text'}){ return (<label style={{display:'block',fontSize:13,marginBottom:6}}>{label}<input type={type} value={value} onChange={e=>onChange?.(e.target.value)} placeholder={placeholder} style={{width:'100%',padding:8,marginTop:6,borderRadius:8,border:'1px solid #ddd'}} /></label>); }
function NumberInput({label,value,onChange,step=1}){ return (<label style={{display:'block',fontSize:13,marginBottom:6}}>{label}<input type='number' step={step} value={value} onChange={e=>onChange?.(e.target.value)} style={{width:'100%',padding:8,marginTop:6,borderRadius:8,border:'1px solid #ddd'}} /></label>); }

function PurchaseForm({onSubmit}) {
  const [date,setDate]=useState(todayStr()), [billNo,setBillNo]=useState(''), [party,setParty]=useState(''), [lot,setLot]=useState(''), [godown,setGodown]=useState(''), [qty,setQty]=useState(''), [rate,setRate]=useState('');
  const clear=()=>{ setBillNo(''); setParty(''); setLot(''); setGodown(''); setQty(''); setRate(''); };
  const submit=(e)=>{ e.preventDefault(); if(!date||!billNo||!party||!lot||!godown||!qty){ alert('Please fill required fields'); return;} onSubmit?.({ date, billNo, party, lot, godown, qty: Number(qty), rate: Number(rate || 0) }); clear(); };
  return (<form onSubmit={submit}><TextInput label="Date" type="date" value={date} onChange={setDate}/><TextInput label="Bill No." value={billNo} onChange={setBillNo}/><TextInput label="Party" value={party} onChange={setParty}/><TextInput label="Lot No." value={lot} onChange={setLot}/><TextInput label="Godown" value={godown} onChange={setGodown}/><NumberInput label="Quantity (kg)" value={qty} onChange={setQty} step={0.01}/><NumberInput label="Rate (₹/kg)" value={rate} onChange={setRate} step={0.01}/><div style={{marginTop:8}}><button type="submit">Add Purchase</button> <button type="button" onClick={clear} style={{marginLeft:8}}>Clear</button></div></form>);
}

function SaleForm({onSubmit}) {
  const [date,setDate]=useState(todayStr()), [billNo,setBillNo]=useState(''), [party,setParty]=useState(''), [lot,setLot]=useState(''), [godown,setGodown]=useState(''), [qty,setQty]=useState(''), [rate,setRate]=useState('');
  const clear=()=>{ setBillNo(''); setParty(''); setLot(''); setGodown(''); setQty(''); setRate(''); };
  const submit=(e)=>{ e.preventDefault(); if(!date||!billNo||!party||!lot||!godown||!qty){ alert('Please fill required fields'); return;} onSubmit?.({ date, billNo, party, lot, godown, qty: Number(qty), rate: Number(rate || 0) }); clear(); };
  return (<form onSubmit={submit}><TextInput label="Date" type="date" value={date} onChange={setDate}/><TextInput label="Bill No." value={billNo} onChange={setBillNo}/><TextInput label="Party" value={party} onChange={setParty}/><TextInput label="Lot No." value={lot} onChange={setLot}/><TextInput label="Godown" value={godown} onChange={setGodown}/><NumberInput label="Quantity (kg)" value={qty} onChange={setQty} step={0.01}/><NumberInput label="Rate (₹/kg)" value={rate} onChange={setRate} step={0.01}/><div style={{marginTop:8}}><button type="submit">Add Sale</button> <button type="button" onClick={clear} style={{marginLeft:8}}>Clear</button></div></form>);
}

function StockTable({rows}) {
  const [q,setQ]=useState('');
  const filtered = rows.filter(r=> !q || `${r.lot}`.toLowerCase().includes(q.toLowerCase()) || `${r.godown}`.toLowerCase().includes(q.toLowerCase()));
  const totalQty = filtered.reduce((a,b)=>a+Number(b.qty),0);
  const totalValue = filtered.reduce((a,b)=>a + Number(b.qty) * Number(b.avgRate ?? 0), 0);
  return (<div style={{background:'#fff',padding:12,borderRadius:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><input placeholder="Search lot/godown..." value={q} onChange={e=>setQ(e.target.value)} style={{padding:8,borderRadius:8,border:'1px solid #ddd'}} /><div>{filtered.length} rows</div></div><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr style={{textAlign:'left',color:'#555'}}><th>Lot</th><th>Godown</th><th>SKU</th><th style={{textAlign:'right'}}>Qty (kg)</th><th style={{textAlign:'right'}}>Avg Rate (₹/kg)</th><th style={{textAlign:'right'}}>Value (₹)</th><th>Status</th></tr></thead><tbody>{filtered.map((r,idx)=>(<tr key={idx} style={{borderTop:'1px solid #f0f0f0'}}><td>{r.lot}</td><td>{r.godown}</td><td><code style={{background:'#f3f4f6',padding:'4px 8px',borderRadius:6}}>{r.sku}</code></td><td style={{textAlign:'right'}}>{Number(r.qty).toFixed(2)}</td><td style={{textAlign:'right'}}>{Number(r.avgRate).toFixed(2)}</td><td style={{textAlign:'right'}}>{(r.qty * r.avgRate).toFixed(2)}</td><td>{r.qty<=0? 'Out': r.qty<LOW_STOCK_THRESHOLD? 'Low':'OK'}</td></tr>))}</tbody><tfoot><tr style={{background:'#fafafa',borderTop:'1px solid #eee'}}><td colSpan={3}><strong>Total</strong></td><td style={{textAlign:'right'}}><strong>{totalQty.toFixed(2)}</strong></td><td></td><td style={{textAlign:'right'}}><strong>{totalValue.toFixed(2)}</strong></td><td></td></tr></tfoot></table></div>);
}

function TxnTable({rows,onDelete}) {
  return (<div style={{background:'#fff',padding:12,borderRadius:12}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr style={{textAlign:'left',color:'#555'}}><th>Type</th><th>Date</th><th>Bill No.</th><th>Party</th><th>Lot</th><th>Godown</th><th style={{textAlign:'right'}}>Qty</th><th style={{textAlign:'right'}}>Rate</th><th style={{textAlign:'right'}}>Amount</th><th>Action</th></tr></thead><tbody>{rows.map(t=>(<tr key={t.id} style={{borderTop:'1px solid #f0f0f0'}}><td>{t.type}</td><td>{t.date}</td><td>{t.billNo}</td><td>{t.party}</td><td>{t.lot}</td><td>{t.godown}</td><td style={{textAlign:'right'}}>{Number(t.qty).toFixed(2)}</td><td style={{textAlign:'right'}}>{Number(t.rate ?? 0).toFixed(2)}</td><td style={{textAlign:'right'}}>{(Number(t.qty) * Number(t.rate ?? 0)).toFixed(2)}</td><td><button onClick={()=> onDelete?.(t.id)} style={{background:'#fde2e2',padding:'6px',borderRadius:6}}>Delete</button></td></tr>))}</tbody></table></div>);
}
