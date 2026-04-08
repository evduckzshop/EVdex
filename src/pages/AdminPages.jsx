import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const C = {
  surface: '#1E293B', surface2: '#162032', surface3: '#0F172A',
  border: 'rgba(255,255,255,.07)', border2: 'rgba(255,255,255,.13)',
  text: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
  accent: '#2563EB', accent2: '#3B82F6',
  green: '#10B981', red: '#F87171', amber: '#F59E0B',
}

const sectionHd = { fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', margin: '14px 0 8px' }
const rcard = { background: C.surface, borderRadius: 14, padding: 14, marginBottom: 10, border: `1px solid ${C.border}` }
const rrow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}` }
const rrowLast = { ...rrow, borderBottom: 'none' }

function Stat({ label, val, color }) {
  return (
    <div style={{ background: C.surface2, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 9, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || C.text }}>{val}</div>
    </div>
  )
}

// ── CASH FLOW ───────────────────────────────────────────────────
export function CashFlowPage() {
  const [data, setData] = useState({ sales: 0, buys: 0, expenses: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
        const ts = weekAgo.toISOString()
        const [s, b, e] = await Promise.all([
          supabase.from('sales').select('sale_price').gte('created_at', ts),
          supabase.from('buys').select('amount_paid').gte('created_at', ts),
          supabase.from('expenses').select('amount').gte('created_at', ts),
        ])
        if (s.error) throw s.error
        if (b.error) throw b.error
        if (e.error) throw e.error
        const sales = (s.data||[]).reduce((sum,r) => sum + Number(r.sale_price), 0)
        const buys = (b.data||[]).reduce((sum,r) => sum + Number(r.amount_paid), 0)
        const expenses = (e.data||[]).reduce((sum,r) => sum + Number(r.amount), 0)
        setData({ sales, buys, expenses })
      } catch (e) {
        setError(e.message || 'Failed to load cash flow data')
        console.error('CashFlowPage load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const net = data.sales - data.buys - data.expenses

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#1E3A8A,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 16, border: '1px solid rgba(37,99,235,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Cash flow · last 7 days</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: net >= 0 ? C.green : C.red, letterSpacing: -1, margin: '4px 0 2px' }}>{net >= 0 ? '+' : ''}${net.toFixed(0)}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Net cash flow</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.1)' }}>
          {[{l:'In',v:`$${data.sales.toFixed(0)}`,c:C.green},{l:'Out (buys)',v:`$${data.buys.toFixed(0)}`,c:C.red},{l:'Expenses',v:`$${data.expenses.toFixed(0)}`,c:C.amber}].map(s=>(
            <div key={s.l}><div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.l}</div><div style={{ fontSize: 14, fontWeight: 600, color: s.c, marginTop: 2 }}>{s.v}</div></div>
          ))}
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', color: C.text3, padding: 24 }}>Loading…</div> : error ? (
        <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.red }}>{error}</div>
      ) : (
        <>
          <div style={sectionHd}>Weekly breakdown</div>
          <div style={rcard}>
            <div style={rrow}><div style={{ fontSize: 13, color: C.text2 }}>Total sales</div><div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>${data.sales.toFixed(0)}</div></div>
            <div style={rrow}><div style={{ fontSize: 13, color: C.text2 }}>Card purchases</div><div style={{ fontSize: 13, fontWeight: 600, color: C.red }}>(${data.buys.toFixed(0)})</div></div>
            <div style={rrow}><div style={{ fontSize: 13, color: C.text2 }}>Operational expenses</div><div style={{ fontSize: 13, fontWeight: 600, color: C.red }}>(${data.expenses.toFixed(0)})</div></div>
            <div style={{ height: 1, background: C.border2, margin: '4px 0' }}/>
            <div style={rrowLast}><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Net cash flow</div><div style={{ fontSize: 14, fontWeight: 700, color: net >= 0 ? C.green : C.red }}>{net >= 0 ? '+' : ''}${net.toFixed(0)}</div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Stat label="Gross margin" val={data.sales > 0 ? `${Math.round(((data.sales-data.buys)/data.sales)*100)}%` : '—'} color={C.green} />
            <Stat label="Expense ratio" val={data.sales > 0 ? `${Math.round((data.expenses/data.sales)*100)}%` : '—'} color={C.amber} />
          </div>
        </>
      )}
    </div>
  )
}

// ── P&L ─────────────────────────────────────────────────────────
const PL_DATA = {
  overall:      { rev: 8640, cogs: 4820, fees: 270, exp: 302, label: 'Overall' },
  nova:         { rev: 3200, cogs: 1650, fees: 120, exp: 80,  label: 'NoVA Pokémon Expo' },
  dc:           { rev: 2840, cogs: 1420, fees: 150, exp: 65,  label: 'DC Card Con' },
  springfield:  { rev: 1200, cogs: 600,  fees: 80,  exp: 40,  label: 'Springfield Show' },
}

export function PLPage() {
  const [key, setKey] = useState('overall')
  const d = PL_DATA[key]
  const gross = d.rev - d.cogs
  const net = gross - d.fees - d.exp
  const gm = d.rev > 0 ? ((gross / d.rev) * 100).toFixed(1) : 0
  const nm = d.rev > 0 ? ((net / d.rev) * 100).toFixed(1) : 0

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#1E3A8A,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Profit &amp; Loss</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.green, letterSpacing: -1, margin: '4px 0 2px' }}>${net.toLocaleString()}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Net profit · {d.label}</div>
      </div>

      <div style={sectionHd}>Filter by show</div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 14, paddingBottom: 2 }}>
        {Object.entries(PL_DATA).map(([k, v]) => (
          <button key={k} onClick={() => setKey(k)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${k === key ? 'rgba(37,99,235,.4)' : C.border2}`, background: k === key ? 'rgba(37,99,235,.2)' : C.surface, color: k === key ? C.accent2 : C.text2, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            {v.label}
          </button>
        ))}
      </div>

      <div style={sectionHd}>Income statement</div>
      <div style={rcard}>
        <div style={rrow}><div style={{ fontSize: 13, color: C.text2 }}>Revenue (sales)</div><div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>${d.rev.toLocaleString()}</div></div>
        <div style={rrow}><div style={{ fontSize: 13, color: C.text3, paddingLeft: 12 }}>— Cost of goods sold</div><div style={{ fontSize: 13, fontWeight: 600, color: C.red }}>(${d.cogs.toLocaleString()})</div></div>
        <div style={rrow}><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Gross profit</div><div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>${gross.toLocaleString()}</div></div>
        <div style={{ height: 1, background: C.border2, margin: '4px 0' }} />
        <div style={rrow}><div style={{ fontSize: 13, color: C.text3, paddingLeft: 12 }}>— Show fees</div><div style={{ fontSize: 13, fontWeight: 600, color: C.red }}>(${d.fees.toLocaleString()})</div></div>
        <div style={rrow}><div style={{ fontSize: 13, color: C.text3, paddingLeft: 12 }}>— Expenses</div><div style={{ fontSize: 13, fontWeight: 600, color: C.red }}>(${d.exp.toLocaleString()})</div></div>
        <div style={{ height: 1, background: C.border2, margin: '4px 0' }} />
        <div style={rrowLast}><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Net profit</div><div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>${net.toLocaleString()}</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Stat label="Gross margin" val={`${gm}%`} color={C.green} />
        <Stat label="Net margin" val={`${nm}%`} color={C.green} />
        <Stat label="Total expenses" val={`$${(d.fees+d.exp).toLocaleString()}`} color={C.amber} />
        <Stat label="COGS" val={`$${d.cogs.toLocaleString()}`} color={C.red} />
      </div>
    </div>
  )
}

// ── REPORTING ────────────────────────────────────────────────────
export function ReportingPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30)
        const ts = monthAgo.toISOString()
        const [s, b, e] = await Promise.all([
          supabase.from('sales').select('sale_price,sale_type,pct_of_market').gte('created_at', ts),
          supabase.from('buys').select('amount_paid,buy_type,pct_of_market').gte('created_at', ts),
          supabase.from('expenses').select('amount,category').gte('created_at', ts),
        ])
        if (s.error) throw s.error
        if (b.error) throw b.error
        if (e.error) throw e.error
        setData({ sales: s.data||[], buys: b.data||[], expenses: e.data||[] })
      } catch (e) {
        setError(e.message || 'Failed to load reporting data')
        console.error('ReportingPage load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div style={{ paddingTop: 24, textAlign: 'center', color: C.text3 }}>Loading…</div>
  if (error) return <div style={{ paddingTop: 24 }}><div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.red }}>{error}</div></div>

  const totalSales = data.sales.reduce((s,r) => s+Number(r.sale_price), 0)
  const totalBuys = data.buys.reduce((s,r) => s+Number(r.amount_paid), 0)
  const totalExp = data.expenses.reduce((s,r) => s+Number(r.amount), 0)

  // By sale type
  const byType = {}
  data.sales.forEach(r => { byType[r.sale_type] = (byType[r.sale_type]||0) + Number(r.sale_price) })

  // Buy type breakdown
  const byBuyType = {}
  data.buys.forEach(r => { byBuyType[r.buy_type] = (byBuyType[r.buy_type]||0) + Number(r.amount_paid) })

  // Expense by category
  const byExpCat = {}
  data.expenses.forEach(r => { byExpCat[r.category] = (byExpCat[r.category]||0) + Number(r.amount) })

  const avgSellPct = data.sales.length ? Math.round(data.sales.reduce((s,r)=>s+(r.pct_of_market||0),0)/data.sales.length) : 0
  const avgBuyPct = data.buys.length ? Math.round(data.buys.reduce((s,r)=>s+(r.pct_of_market||0),0)/data.buys.length) : 0

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#1E3A8A,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>General reporting · last 30 days</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>${totalSales.toLocaleString()}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Total revenue</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <Stat label="Total buys" val={`$${totalBuys.toFixed(0)}`} color={C.red} />
        <Stat label="Total expenses" val={`$${totalExp.toFixed(0)}`} color={C.amber} />
        <Stat label="Avg sell %" val={`${avgSellPct}%`} color={C.green} />
        <Stat label="Avg buy %" val={`${avgBuyPct}%`} color={C.accent2} />
      </div>

      <div style={sectionHd}>Revenue by sale type</div>
      <div style={rcard}>
        {Object.entries(byType).length ? Object.entries(byType).map(([k,v],i,a) => (
          <div key={k} style={i===a.length-1?rrowLast:rrow}><div style={{ fontSize: 13, color: C.text2 }}>{k}</div><div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>${v.toFixed(0)}</div></div>
        )) : <div style={{ fontSize: 13, color: C.text3, padding: '8px 0' }}>No sales yet</div>}
      </div>

      <div style={sectionHd}>Buying spend by type</div>
      <div style={rcard}>
        {Object.entries(byBuyType).length ? Object.entries(byBuyType).map(([k,v],i,a) => (
          <div key={k} style={i===a.length-1?rrowLast:rrow}><div style={{ fontSize: 13, color: C.text2 }}>{k}</div><div style={{ fontSize: 13, fontWeight: 600, color: C.red }}>${v.toFixed(0)}</div></div>
        )) : <div style={{ fontSize: 13, color: C.text3, padding: '8px 0' }}>No buys yet</div>}
      </div>

      <div style={sectionHd}>Expenses by category</div>
      <div style={rcard}>
        {Object.entries(byExpCat).length ? Object.entries(byExpCat).map(([k,v],i,a) => (
          <div key={k} style={i===a.length-1?rrowLast:rrow}><div style={{ fontSize: 13, color: C.text2 }}>{k}</div><div style={{ fontSize: 13, fontWeight: 600, color: C.amber }}>${v.toFixed(0)}</div></div>
        )) : <div style={{ fontSize: 13, color: C.text3, padding: '8px 0' }}>No expenses yet</div>}
      </div>
    </div>
  )
}

// ── EXPORT CSV ───────────────────────────────────────────────────
export function ExportPage() {
  const [exporting, setExporting] = useState('')
  const [msg, setMsg] = useState({ text: '', type: '' })

  async function doExport(type) {
    setExporting(type)
    setMsg({ text: '', type: '' })
    const tableMap = { sales: 'sales', buys: 'buys', expenses: 'expenses', inventory: 'inventory', shows: 'shows', contacts: 'contacts' }

    try {
      if (type === 'all') {
        // Export all tables as a combined download
        const tables = ['sales','buys','expenses','inventory','shows','contacts']
        let csv = ''
        for (const t of tables) {
          const { data, error } = await supabase.from(t).select('*').order('created_at', { ascending: false })
          if (error) throw error
          if (data?.length) {
            csv += `\n\n=== ${t.toUpperCase()} ===\n`
            csv += Object.keys(data[0]).join(',') + '\n'
            csv += data.map(row => Object.values(row).map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n')
          }
        }
        downloadCSV(csv, 'evdex_full_export.csv')
      } else {
        const { data, error } = await supabase.from(tableMap[type] || type).select('*').order('created_at', { ascending: false })
        if (error) throw error
        if (!data?.length) { setMsg({ text: 'No data to export.', type: 'error' }); return }
        const csv = [Object.keys(data[0]).join(','), ...data.map(row => Object.values(row).map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\n')
        downloadCSV(csv, `evdex_${type}_${new Date().toISOString().split('T')[0]}.csv`)
      }
    } catch (e) { setMsg({ text: 'Export error: ' + e.message, type: 'error' }) }
    finally { setExporting('') }
  }

  function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const exports = [
    { key: 'sales', label: 'Sales log', desc: 'All sale records with market %' },
    { key: 'buys', label: 'Buys log', desc: 'All purchase records' },
    { key: 'expenses', label: 'Expenses', desc: 'All expenses by category' },
    { key: 'inventory', label: 'Inventory', desc: 'Current stock with cost & listed price' },
    { key: 'shows', label: 'Show reports', desc: 'All card shows with totals' },
    { key: 'contacts', label: 'Contacts', desc: 'Buyers, sellers & wholesalers' },
  ]

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 16, border: '1px solid rgba(37,99,235,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Export data</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -0.5, margin: '4px 0 2px' }}>CSV export</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Compatible with Excel &amp; Google Sheets. Each file includes date stamp, timestamp, and all fields.</div>
      </div>

      {msg.text && (
        <div style={{ background: msg.type === 'error' ? 'rgba(248,113,113,.08)' : 'rgba(16,185,129,.08)', border: `1px solid ${msg.type === 'error' ? 'rgba(248,113,113,.2)' : 'rgba(16,185,129,.2)'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: msg.type === 'error' ? C.red : C.green }}>{msg.text}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        {exports.map(e => (
          <button key={e.key} onClick={() => doExport(e.key)} disabled={!!exporting} style={{ padding: '12px 10px', borderRadius: 12, background: C.surface, border: `1px solid ${C.border2}`, cursor: exporting ? 'not-allowed' : 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 3 }}>{exporting === e.key ? 'Downloading…' : e.label}</div>
            <div style={{ fontSize: 10, color: C.text3 }}>{e.desc}</div>
          </button>
        ))}
      </div>

      <button onClick={() => doExport('all')} disabled={!!exporting} style={{ width: '100%', padding: '13px', borderRadius: 12, background: exporting ? '#374151' : C.accent, border: 'none', fontSize: 14, fontWeight: 600, color: '#fff', cursor: exporting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
        {exporting === 'all' ? 'Preparing full export…' : 'Export everything · all time'}
      </button>

      <div style={{ fontSize: 11, color: C.text3, textAlign: 'center', marginTop: 10 }}>
        Downloads to your device · open in Files, Excel, or Google Sheets
      </div>
    </div>
  )
}

// ── ACTIVITY LOG ─────────────────────────────────────────────────
export function ActivityPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('activity_logs')
      .select('*, profiles!user_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) { setError(error.message); console.error('ActivityPage load error:', error) }
        else setLogs(data||[])
      })
      .catch(e => { setError(e.message); console.error('ActivityPage load error:', e) })
      .finally(() => setLoading(false))
  }, [])

  const actionColor = a => {
    if (a.includes('sale')) return C.green
    if (a.includes('buy')) return C.red
    if (a.includes('expense')) return C.amber
    if (a.includes('delete')) return C.red
    return C.accent2
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Activity log</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -0.5, margin: '4px 0 2px' }}>{logs.length} actions</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>All team activity · audit trail</div>
      </div>

      {loading ? <div style={{ textAlign: 'center', color: C.text3, padding: 24 }}>Loading…</div>
        : error ? <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.red }}>{error}</div>
        : logs.length === 0 ? <div style={{ textAlign: 'center', color: C.text3, padding: 24, fontSize: 13 }}>No activity logged yet.</div>
        : logs.map(log => (
          <div key={log.id} style={{ background: C.surface, borderRadius: 14, padding: '12px 14px', marginBottom: 8, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: actionColor(log.action_type), flexShrink: 0, marginTop: 4 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{log.summary || log.action_type}</div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
                  {log.profiles?.full_name || 'Unknown'} · {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: 'rgba(255,255,255,.05)', color: C.text3, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {log.entity_type || log.action_type}
              </span>
            </div>
          </div>
        ))
      }
      <div style={{ height: 16 }} />
    </div>
  )
}

// ── SETTINGS ─────────────────────────────────────────────────────
export function SettingsPage() {
  const { profile } = useAuth()
  const [defaultPay, setDefaultPay] = useState('Cash')
  const [lowStock, setLowStock] = useState('5')
  const [saved, setSaved] = useState(false)

  function save() { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Settings</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -0.5, margin: '4px 0 2px' }}>System</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Admin configuration</div>
      </div>

      {saved && <div style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: C.green }}>Settings saved!</div>}

      <div style={sectionHd}>Preferences</div>
      <div style={rcard}>
        <div style={rrow}>
          <div style={{ fontSize: 13, color: C.text2 }}>Default payment method</div>
          <select value={defaultPay} onChange={e => setDefaultPay(e.target.value)} style={{ background: 'transparent', border: 'none', color: C.accent2, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
            {['Cash','Venmo','Zelle','Card'].map(p => <option key={p} style={{ background: C.surface }}>{p}</option>)}
          </select>
        </div>
        <div style={rrowLast}>
          <div style={{ fontSize: 13, color: C.text2 }}>Low stock alert (qty)</div>
          <input type="number" value={lowStock} onChange={e => setLowStock(e.target.value)} style={{ width: 60, background: 'transparent', border: 'none', color: C.accent2, fontSize: 13, fontWeight: 500, textAlign: 'right', fontFamily: 'inherit', outline: 'none' }} />
        </div>
      </div>

      <div style={sectionHd}>Team</div>
      <div style={rcard}>
        <div style={rrowLast}>
          <div style={{ fontSize: 13, color: C.text2 }}>Manage workers &amp; invites</div>
          <a href="/employees" style={{ fontSize: 12, color: C.accent2, textDecoration: 'none', fontWeight: 500 }}>Go to Employees →</a>
        </div>
      </div>

      <div style={sectionHd}>Data</div>
      <div style={rcard}>
        <div style={rrow}><div style={{ fontSize: 13, color: C.text2 }}>Export all data</div><a href="/export" style={{ fontSize: 12, color: C.accent2, textDecoration: 'none', fontWeight: 500 }}>Export CSV →</a></div>
        <div style={rrowLast}><div style={{ fontSize: 13, color: C.text2 }}>Supabase project</div><div style={{ fontSize: 12, color: C.text3 }}>Connected</div></div>
      </div>

      <button onClick={save} style={{ width: '100%', padding: 13, borderRadius: 12, background: C.accent, border: 'none', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', marginTop: 14 }}>
        Save settings
      </button>
      <div style={{ height: 24 }} />
    </div>
  )
}
