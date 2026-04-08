import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useShows } from '../hooks/useData'
import { C, ChipGroup } from '../components/ui/FormComponents'

const rcard = { background: C.surface, borderRadius: 14, padding: 14, marginBottom: 10, border: `1px solid ${C.border}` }
const rrow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }
const rrowLast = { ...rrow, borderBottom: 'none' }

export default function ShowComparePage() {
  const { rows: shows, fetch: fetchShows, loading: loadingShows } = useShows()
  const [selectedIds, setSelectedIds] = useState([])
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('cards') // 'cards' or 'chart'

  useEffect(() => { fetchShows() }, [])

  function toggleShow(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  useEffect(() => {
    if (selectedIds.length === 0) { setData({}); return }
    loadData()
  }, [selectedIds])

  async function loadData() {
    setLoading(true)
    try {
      const result = {}
      for (const id of selectedIds) {
        const [s, b, e] = await Promise.all([
          supabase.from('sales').select('sale_price').eq('show_id', id),
          supabase.from('buys').select('amount_paid').eq('show_id', id),
          supabase.from('expenses').select('amount').eq('show_id', id),
        ])
        const show = shows.find(sh => sh.id === id)
        const revenue = (s.data || []).reduce((sum, r) => sum + Number(r.sale_price), 0)
        const cogs = (b.data || []).reduce((sum, r) => sum + Number(r.amount_paid), 0)
        const expenses = (e.data || []).reduce((sum, r) => sum + Number(r.amount), 0)
        const tableFee = Number(show?.table_fee) || 0
        const net = revenue - cogs - expenses - tableFee
        const avgSale = s.data?.length ? revenue / s.data.length : 0
        result[id] = {
          name: show?.name || 'Unknown',
          revenue, cogs, expenses, tableFee, net,
          salesCount: s.data?.length || 0,
          buysCount: b.data?.length || 0,
          avgSale,
          txCount: (s.data?.length || 0) + (b.data?.length || 0),
        }
      }
      setData(result)
    } catch (e) {
      console.error('Show compare error:', e)
    } finally {
      setLoading(false)
    }
  }

  const maxRevenue = Math.max(1, ...Object.values(data).map(d => d.revenue))
  const maxNet = Math.max(1, ...Object.values(data).map(d => Math.abs(d.net)))

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#1a1420,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(127,119,221,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Show comparison</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>{selectedIds.length} selected</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Select shows below to compare</div>
      </div>

      {/* Show selector */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Select shows</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {loadingShows ? <div style={{ color: C.text3, fontSize: 12 }}>Loading…</div> :
          shows.map(s => (
            <button key={s.id} onClick={() => toggleShow(s.id)} style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              border: `1px solid ${selectedIds.includes(s.id) ? 'rgba(127,119,221,.5)' : C.border2}`,
              background: selectedIds.includes(s.id) ? 'rgba(127,119,221,.15)' : C.surface,
              color: selectedIds.includes(s.id) ? '#7F77DD' : C.text2,
            }}>
              {s.name}
            </button>
          ))
        }
      </div>

      {selectedIds.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 24, fontSize: 13 }}>Tap shows above to start comparing</div>
      ) : loading ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 24 }}>Loading…</div>
      ) : (
        <>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 3, width: 'fit-content' }}>
            <button onClick={() => setViewMode('cards')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: viewMode === 'cards' ? 'rgba(37,99,235,.25)' : 'transparent', color: viewMode === 'cards' ? '#3B82F6' : C.text3, fontFamily: 'inherit' }}>Table</button>
            <button onClick={() => setViewMode('chart')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, background: viewMode === 'chart' ? 'rgba(37,99,235,.25)' : 'transparent', color: viewMode === 'chart' ? '#3B82F6' : C.text3, fontFamily: 'inherit' }}>Charts</button>
          </div>

          {viewMode === 'cards' ? (
            /* TABLE / CARD VIEW */
            selectedIds.map(id => {
              const d = data[id]
              if (!d) return null
              return (
                <div key={id} style={rcard}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>{d.name}</div>
                  <div style={rrow}><span style={{ fontSize: 12, color: C.text3 }}>Revenue</span><span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>${d.revenue.toLocaleString()}</span></div>
                  <div style={rrow}><span style={{ fontSize: 12, color: C.text3 }}>COGS (buys)</span><span style={{ fontSize: 12, fontWeight: 600, color: C.red }}>${d.cogs.toLocaleString()}</span></div>
                  <div style={rrow}><span style={{ fontSize: 12, color: C.text3 }}>Expenses</span><span style={{ fontSize: 12, fontWeight: 600, color: C.amber }}>${d.expenses.toLocaleString()}</span></div>
                  <div style={rrow}><span style={{ fontSize: 12, color: C.text3 }}>Table fee</span><span style={{ fontSize: 12, fontWeight: 600, color: C.amber }}>${d.tableFee.toLocaleString()}</span></div>
                  <div style={rrow}><span style={{ fontSize: 12, color: C.text3 }}>Transactions</span><span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{d.txCount}</span></div>
                  <div style={rrow}><span style={{ fontSize: 12, color: C.text3 }}>Avg sale price</span><span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>${d.avgSale.toFixed(0)}</span></div>
                  <div style={rrowLast}><span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Net profit</span><span style={{ fontSize: 14, fontWeight: 700, color: d.net >= 0 ? C.green : C.red }}>{d.net >= 0 ? '' : '-'}${Math.abs(d.net).toLocaleString()}</span></div>
                </div>
              )
            })
          ) : (
            /* CHART VIEW */
            <>
              {/* Revenue bars */}
              <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Revenue</div>
              <div style={rcard}>
                {selectedIds.map(id => {
                  const d = data[id]
                  if (!d) return null
                  const pct = (d.revenue / maxRevenue) * 100
                  return (
                    <div key={id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: C.text, fontWeight: 500 }}>{d.name}</span>
                        <span style={{ color: C.green, fontWeight: 600 }}>${d.revenue.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: C.green, width: `${pct}%`, transition: 'width .3s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Net profit bars */}
              <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Net profit</div>
              <div style={rcard}>
                {selectedIds.map(id => {
                  const d = data[id]
                  if (!d) return null
                  const pct = (Math.abs(d.net) / maxNet) * 100
                  return (
                    <div key={id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: C.text, fontWeight: 500 }}>{d.name}</span>
                        <span style={{ color: d.net >= 0 ? C.green : C.red, fontWeight: 600 }}>{d.net >= 0 ? '' : '-'}${Math.abs(d.net).toLocaleString()}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: d.net >= 0 ? C.green : C.red, width: `${pct}%`, transition: 'width .3s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Transaction count bars */}
              <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Transactions</div>
              <div style={rcard}>
                {selectedIds.map(id => {
                  const d = data[id]
                  if (!d) return null
                  const maxTx = Math.max(1, ...Object.values(data).map(x => x.txCount))
                  const pct = (d.txCount / maxTx) * 100
                  return (
                    <div key={id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: C.text, fontWeight: 500 }}>{d.name}</span>
                        <span style={{ color: C.accent2, fontWeight: 600 }}>{d.txCount}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: C.accent2, width: `${pct}%`, transition: 'width .3s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
      <div style={{ height: 16 }} />
    </div>
  )
}
