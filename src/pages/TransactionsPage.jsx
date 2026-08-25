import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSales, useBuys, useTrades } from '../hooks/useData'
import { C, Input, Select, ChipGroup, RecordCard } from '../components/ui/FormComponents'
import { sumBy, splitTradeCash } from '../lib/finance'

const TYPES = ['All', 'Sales', 'Buys', 'Trades']

export default function TransactionsPage() {
  const { rows: sales, fetch: fetchSales, loading: loadingSales } = useSales()
  const { rows: buys, fetch: fetchBuys, loading: loadingBuys } = useBuys()
  const { rows: trades, fetch: fetchTrades, loading: loadingTrades } = useTrades()
  const navigate = useNavigate()

  const [type, setType] = useState('All')
  const [search, setSearch] = useState('')
  const [payment, setPayment] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { fetchSales(); fetchBuys(); fetchTrades() }, [])

  const loading = loadingSales || loadingBuys || loadingTrades

  // Merge and tag
  const all = [
    ...sales.map(r => ({ ...r, _type: 'sale', _amount: Number(r.sale_price), _date: r.created_at })),
    ...buys.map(r => ({ ...r, _type: 'buy', _amount: Number(r.amount_paid), _date: r.created_at })),
    ...trades.map(r => ({
      ...r, _type: 'trade',
      _amount: Number(r.amount_paid) || 0,
      _date: r.created_at,
      _tradeLabel: r.description || `Trade · ${(r.their_items?.length || 0) + (r.your_items?.length || 0)} items`,
    })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date))

  // Filter
  const filtered = all.filter(r => {
    if (type === 'Sales' && r._type !== 'sale') return false
    if (type === 'Buys' && r._type !== 'buy') return false
    if (type === 'Trades' && r._type !== 'trade') return false
    if (search && !(r.description || r._tradeLabel || '').toLowerCase().includes(search.toLowerCase())) return false
    if (payment && r._type !== 'trade' && r.payment !== payment) return false
    if (payment && r._type === 'trade' && r.payment_method !== payment) return false
    if (dateFrom && r._date < new Date(dateFrom + 'T00:00:00').toISOString()) return false
    if (dateTo && r._date > new Date(dateTo + 'T23:59:59').toISOString()) return false
    return true
  })

  // Partition once, then total. Trade settlement cash counts as sale/buy.
  const byType = { sale: [], buy: [], trade: [] }
  for (const r of filtered) byType[r._type]?.push(r)
  const { inflow, outflow } = splitTradeCash(byType.trade)
  const totalSales = sumBy(byType.sale, '_amount') + inflow
  const totalBuys = sumBy(byType.buy, '_amount') + outflow

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1E3A8A,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Transactions</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>{filtered.length} records</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Sales</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.green, marginTop: 2 }}>${totalSales.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Buys</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.red, marginTop: 2 }}>${totalBuys.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Net</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: totalSales - totalBuys >= 0 ? C.green : C.red, marginTop: 2 }}>${(totalSales - totalBuys).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Type chips */}
      <ChipGroup options={TYPES} value={type} onChange={setType} />

      {/* Search */}
      <div style={{ marginTop: 10 }}>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by description..." />
      </div>

      {/* Filter toggle */}
      <div onClick={() => setShowFilters(!showFilters)} style={{ fontSize: 12, color: '#3B82F6', cursor: 'pointer', marginTop: 8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path d="M3 5h14M5 10h10M7 15h6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {showFilters ? 'Hide filters' : 'More filters'}
      </div>

      {showFilters && (
        <div style={{ background: C.surface, borderRadius: 12, padding: 12, marginTop: 8, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>From</div>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ color: C.text2, padding: '8px 10px', fontSize: 12 }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>To</div>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ color: C.text2, padding: '8px 10px', fontSize: 12 }} />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Payment</div>
            <Select value={payment} onChange={e => setPayment(e.target.value)} style={{ padding: '8px 10px', fontSize: 12 }}>
              <option value="">All methods</option>
              {['Cash','Venmo','Zelle','Card','Wire'].map(p => <option key={p}>{p}</option>)}
            </Select>
          </div>
          {(dateFrom || dateTo || payment) && (
            <div onClick={() => { setDateFrom(''); setDateTo(''); setPayment('') }} style={{ fontSize: 11, color: C.red, cursor: 'pointer', marginTop: 8, textAlign: 'center' }}>
              Clear filters
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', margin: '14px 0 8px' }}>
        {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 24 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 24, fontSize: 13 }}>No transactions found.</div>
      ) : (
        filtered.map(r => (
          <div key={r.id + r._type} onClick={() => {
            if (r._type === 'sale') navigate(`/sales?edit=${r.id}`)
            else if (r._type === 'buy') navigate(`/buys?edit=${r.id}`)
            else navigate('/trade')
          }} style={{ cursor: 'pointer' }}>
            <RecordCard
              item={{ ...r, description: r._type === 'trade' ? r._tradeLabel : r.description }}
              amtColor={r._type === 'sale' ? C.green : r._type === 'buy' ? C.red : C.accent2}
              amt={r._type === 'trade'
                ? (r.delta > 0 ? `+$${r._amount.toFixed(0)}` : r.delta < 0 ? `-$${r._amount.toFixed(0)}` : 'Even')
                : `${r._type === 'sale' ? '+' : '-'}$${r._amount.toFixed(0)}`}
              meta={r._type === 'trade'
                ? `Trade · Value gained: $${(Number(r.their_total_market) - Number(r.their_total_trade)).toFixed(0)} · ${new Date(r._date).toLocaleDateString()}`
                : `${r._type === 'sale' ? (r.buyer || 'Unknown') : (r.source || 'Unknown')} · ${r.pct_of_market ? r.pct_of_market + '% of mkt · ' : ''}${new Date(r._date).toLocaleDateString()}`}
            />
          </div>
        ))
      )}
      <div style={{ height: 16 }} />
    </div>
  )
}
