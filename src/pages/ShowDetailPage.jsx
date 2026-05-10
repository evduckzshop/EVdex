import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { C } from '../components/ui/FormComponents'

export default function ShowDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [show, setShow] = useState(null)
  const [sales, setSales] = useState([])
  const [buys, setBuys] = useState([])
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('sales')
  const [paymentFilter, setPaymentFilter] = useState('All')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [showRes, salesRes, buysRes, tradesRes] = await Promise.all([
        supabase.from('shows').select('*').eq('id', id).single(),
        supabase.from('sales').select('*').eq('show_id', id).order('created_at', { ascending: false }),
        supabase.from('buys').select('*').eq('show_id', id).order('created_at', { ascending: false }),
        supabase.from('trades').select('*,profiles!created_by(full_name)').eq('show_id', id).order('created_at', { ascending: false }),
      ])
      if (showRes.data) setShow(showRes.data)
      setSales(salesRes.data || [])
      setBuys(buysRes.data || [])
      setTrades(tradesRes.data || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <div style={{ width: 24, height: 24, border: '2px solid rgba(37,99,235,.2)', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      </div>
    )
  }

  if (!show) {
    return (
      <div style={{ paddingTop: 12, textAlign: 'center', color: C.text3 }}>
        <div style={{ fontSize: 14 }}>Show not found</div>
        <div onClick={() => navigate('/shows/manage')} style={{ fontSize: 13, color: '#3B82F6', cursor: 'pointer', marginTop: 12 }}>Back to shows</div>
      </div>
    )
  }

  // Stats — include trade settlement cash in sales/buys
  let totalRevenue = sales.reduce((s, r) => s + Number(r.sale_price || 0), 0)
  let totalSpent = buys.reduce((s, r) => s + Number(r.amount_paid || 0), 0)
  trades.forEach(tr => {
    const paid = Number(tr.amount_paid) || 0
    if (paid > 0) {
      if (tr.delta > 0) totalRevenue += paid
      else if (tr.delta < 0) totalSpent += paid
    }
  })
  const tableFee = Number(show.table_fee || 0)
  const netProfit = totalRevenue - totalSpent - tableFee
  const totalTransactions = sales.length + buys.length + trades.length

  // Payment breakdown
  const paymentBreakdown = {}
  sales.forEach(r => {
    if (r.payment_split?.length === 2) {
      r.payment_split.forEach(sp => {
        paymentBreakdown[sp.method] = (paymentBreakdown[sp.method] || 0) + sp.amount
      })
    } else {
      const method = r.payment || 'Cash'
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + Number(r.sale_price || 0)
    }
  })
  const paymentTotal = Object.values(paymentBreakdown).reduce((s, v) => s + v, 0)
  const paymentMethods = Object.entries(paymentBreakdown).sort((a, b) => b[1] - a[1])

  const paymentColors = {
    Cash: '#10B981',
    Venmo: '#3B82F6',
    Zelle: '#8B5CF6',
  }
  const getPaymentColor = (method) => paymentColors[method] || '#F59E0B'

  // Filtered transactions
  const filteredSales = paymentFilter === 'All'
    ? sales
    : sales.filter(r => {
        if (r.payment_split?.length === 2) {
          return r.payment_split.some(sp => sp.method === paymentFilter)
        }
        return r.payment === paymentFilter
      })

  const filteredBuys = paymentFilter === 'All'
    ? buys
    : buys.filter(r => r.payment === paymentFilter)

  // All unique payment methods for filter chips
  const allPayments = new Set()
  sales.forEach(r => {
    if (r.payment_split?.length === 2) {
      r.payment_split.forEach(sp => allPayments.add(sp.method))
    } else if (r.payment) {
      allPayments.add(r.payment)
    }
  })
  buys.forEach(r => { if (r.payment) allPayments.add(r.payment) })
  const filterOptions = ['All', ...Array.from(allPayments)]

  // Status
  const getStatus = () => {
    if (show.status === 'completed') return { label: 'Completed', color: C.green, bg: 'rgba(16,185,129,.12)' }
    if (show.status === 'in_progress') return { label: 'In Progress', color: '#F59E0B', bg: 'rgba(245,158,11,.12)' }
    if (show.event_date && new Date(show.event_date + 'T23:59:59') < new Date()) return { label: 'Passed', color: '#F87171', bg: 'rgba(248,113,113,.12)' }
    return { label: 'Upcoming', color: '#7F77DD', bg: 'rgba(127,119,221,.12)' }
  }
  const status = getStatus()

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Back + Edit */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div onClick={() => navigate('/shows/manage')} style={{ fontSize: 13, color: '#3B82F6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          All shows
        </div>
        <div onClick={() => navigate(`/shows/manage?id=${id}`)} style={{ fontSize: 12, color: '#3B82F6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M14.5 3.5l2 2M3 17l.5-2L13.5 5l2 2L5.5 17l-2 .5z" stroke="#3B82F6" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Edit
        </div>
      </div>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1a1420,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 14, border: '1px solid rgba(127,119,221,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>{show.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 4 }}>
              {show.event_date ? new Date(show.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
              {show.location ? ` · ${show.location}` : ''}
            </div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: status.bg, color: status.color, flexShrink: 0 }}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <StatCard label="Revenue" value={`$${totalRevenue.toLocaleString()}`} color={C.green} />
        <StatCard label="Spent" value={`$${totalSpent.toLocaleString()}`} color="#F87171" />
        <StatCard label="Net Profit" value={`${netProfit >= 0 ? '' : '-'}$${Math.abs(netProfit).toLocaleString()}`} color={netProfit >= 0 ? C.green : '#F87171'} />
        <StatCard label="Transactions" value={totalTransactions} color="#3B82F6" />
      </div>

      {/* Payment Breakdown - Visual Bar */}
      {paymentMethods.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 14, padding: 14, marginBottom: 14, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Payment breakdown</div>

          {/* Stacked bar */}
          <div style={{ height: 24, borderRadius: 12, overflow: 'hidden', display: 'flex', marginBottom: 12, background: C.surface2 }}>
            {paymentMethods.map(([method, amount]) => {
              const pct = paymentTotal > 0 ? (amount / paymentTotal) * 100 : 0
              if (pct < 1) return null
              return (
                <div
                  key={method}
                  style={{
                    width: `${pct}%`,
                    background: getPaymentColor(method),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'width .3s ease',
                    minWidth: pct > 8 ? 'auto' : 0,
                  }}
                >
                  {pct > 12 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{Math.round(pct)}%</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {paymentMethods.map(([method, amount]) => (
              <div key={method} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: getPaymentColor(method) }} />
                <span style={{ fontSize: 11, color: C.text2 }}>{method}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>${amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Tabs */}
      <div style={{ display: 'flex', gap: 0, background: C.surface, borderRadius: 12, padding: 3, marginBottom: 10, border: `1px solid ${C.border}` }}>
        {[
          { key: 'sales', label: `Sales (${filteredSales.length})` },
          { key: 'buys', label: `Buys (${filteredBuys.length})` },
          { key: 'trades', label: `Trades (${trades.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 10, border: 'none',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              background: tab === t.key ? 'rgba(37,99,235,.15)' : 'transparent',
              color: tab === t.key ? '#3B82F6' : C.text3,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Payment Filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 12, paddingBottom: 2 }}>
        {filterOptions.map(f => (
          <button
            key={f}
            onClick={() => setPaymentFilter(f)}
            style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              border: `1px solid ${paymentFilter === f ? 'rgba(37,99,235,.4)' : C.border2}`,
              background: paymentFilter === f ? 'rgba(37,99,235,.2)' : C.surface,
              color: paymentFilter === f ? '#3B82F6' : C.text2,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {tab === 'sales' && (
        filteredSales.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.text3, padding: 24, fontSize: 13 }}>No sales{paymentFilter !== 'All' ? ` with ${paymentFilter}` : ''}</div>
        ) : (
          filteredSales.map(r => (
            <div key={r.id} onClick={() => navigate(`/sales?edit=${r.id}`)} style={{ cursor: 'pointer' }}>
              <TransactionCard
                description={r.description}
                amount={`+$${Number(r.sale_price).toFixed(2)}`}
                amountColor={C.green}
                payment={r.payment_split?.length === 2 ? r.payment_split.map(sp => sp.method).join('/') : r.payment}
                meta={`${r.buyer || 'Unknown'} · ${new Date(r.created_at).toLocaleDateString()}`}
              />
            </div>
          ))
        )
      )}

      {tab === 'buys' && (
        filteredBuys.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.text3, padding: 24, fontSize: 13 }}>No buys{paymentFilter !== 'All' ? ` with ${paymentFilter}` : ''}</div>
        ) : (
          filteredBuys.map(r => (
            <div key={r.id} onClick={() => navigate(`/buys?edit=${r.id}`)} style={{ cursor: 'pointer' }}>
              <TransactionCard
                description={r.description}
                amount={`-$${Number(r.amount_paid).toFixed(2)}`}
                amountColor="#F87171"
                payment={r.payment}
                meta={`${r.seller || 'Unknown'} · ${new Date(r.created_at).toLocaleDateString()}`}
              />
            </div>
          ))
        )
      )}

      {tab === 'trades' && (
        trades.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.text3, padding: 24, fontSize: 13 }}>No trades</div>
        ) : (
          trades.map(t => (
            <div key={t.id} style={{ cursor: 'default' }}>
              <TransactionCard
                description={t.description || `Trade · ${(t.their_items?.length || 0) + (t.your_items?.length || 0)} items`}
                amount={t.delta > 0 ? `+$${Number(t.amount_paid || 0).toFixed(2)}` : t.delta < 0 ? `-$${Number(t.amount_paid || 0).toFixed(2)}` : 'Even'}
                amountColor={t.delta > 0 ? C.green : t.delta < 0 ? '#F87171' : C.accent2}
                payment={t.payment_method || 'Trade only'}
                meta={`${t.profiles?.full_name || 'Unknown'} · ${new Date(t.created_at).toLocaleDateString()} · Value gained: $${(Number(t.their_total_market) - Number(t.their_total_trade)).toFixed(0)}`}
              />
            </div>
          ))
        )
      )}

      <div style={{ height: 20 }} />
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: C.surface, borderRadius: 14, padding: 14, border: `1px solid ${C.border}`, textAlign: 'center' }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function TransactionCard({ description, amount, amountColor, payment, meta }) {
  return (
    <div style={{ background: C.surface, borderRadius: 14, padding: '12px 14px', marginBottom: 8, border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{description}</div>
          <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{meta}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: amountColor }}>{amount}</div>
          <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>{payment}</div>
        </div>
      </div>
    </div>
  )
}
