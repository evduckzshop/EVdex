import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNav } from '../context/NavigationContext'
import { useActiveShow } from '../context/ShowContext'
import { supabase, logActivity } from '../lib/supabase'
import PullToRefresh from '../components/ui/PullToRefresh'

const C = {
  surface: '#1E293B', surface2: '#162032', surface3: '#0F172A',
  border: 'rgba(255,255,255,.07)', border2: 'rgba(255,255,255,.13)',
  text: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
  accent: '#2563EB', accent2: '#3B82F6',
  green: '#10B981', red: '#F87171', amber: '#F59E0B',
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: C.surface2, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 9, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || C.text }}>{value}</div>
    </div>
  )
}

function ActivityCard({ item, onTap }) {
  const isSale = item.type === 'sale'
  const isBuy = item.type === 'buy'
  const isTrade = item.type === 'trade'
  const color = isSale ? C.green : isBuy ? C.red : isTrade ? C.accent2 : C.amber
  const tagLabel = isSale ? 'Sale' : isBuy ? 'Buy' : isTrade ? 'Trade' : 'Expense'
  const tagBg = isSale ? 'rgba(16,185,129,.12)' : isBuy ? 'rgba(248,113,113,.12)' : isTrade ? 'rgba(37,99,235,.12)' : 'rgba(245,158,11,.12)'
  const amt = isTrade
    ? `+$${Number(item.amount).toFixed(0)}`
    : isSale
      ? `+$${Number(item.amount).toFixed(0)}`
      : `-$${Number(item.amount).toFixed(0)}`

  return (
    <div onClick={() => onTap(item)} style={{ background: C.surface, borderRadius: 14, padding: '12px 14px', marginBottom: 8, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.description || (isTrade ? `Trade · ${(item.their_items?.length || 0) + (item.your_items?.length || 0)} items` : '—')}
          </div>
          <div style={{ fontSize: 10, color: C.text3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: tagBg, color, marginRight: 4 }}>
              {tagLabel}
            </span>
            {item.who && `${item.who} · `}
            {item.pct ? `${item.pct}% of mkt · ` : ''}
            {new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color, whiteSpace: 'nowrap' }}>{amt}</div>
      </div>
    </div>
  )
}

function ActivityDetail({ item, onClose, isAdmin, onDelete, navigate }) {
  if (!item) return null
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [photoExpanded, setPhotoExpanded] = useState(false)
  const isSale = item.type === 'sale'
  const isBuy = item.type === 'buy'
  const isExpense = item.type === 'expense'
  const color = isSale ? C.green : isBuy ? C.red : C.amber
  const typeLabel = isSale ? 'Sale' : isBuy ? 'Buy' : 'Expense'

  const rows = []
  if (isSale) {
    rows.push({ label: 'Item', value: item.description })
    rows.push({ label: 'Sale type', value: item.sale_type || '—' })
    rows.push({ label: 'Sale price', value: `$${Number(item.sale_price).toFixed(2)}`, color: C.green })
    if (item.market_value) rows.push({ label: 'Market value', value: `$${Number(item.market_value).toFixed(2)}` })
    if (item.pct_of_market) rows.push({ label: '% of market', value: `${item.pct_of_market}%` })
    if (item.cost_basis) rows.push({ label: 'Cost basis', value: `$${Number(item.cost_basis).toFixed(2)}` })
    if (item.cost_basis && item.sale_price) {
      const profit = Number(item.sale_price) - Number(item.cost_basis)
      rows.push({ label: 'Profit', value: `${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`, color: profit >= 0 ? C.green : C.red })
    }
    rows.push({ label: 'Buyer', value: item.buyer || '—' })
    rows.push({ label: 'Payment', value: item.payment || '—' })
  } else if (isBuy) {
    rows.push({ label: 'Item', value: item.description })
    rows.push({ label: 'Buy type', value: item.buy_type || '—' })
    rows.push({ label: 'Amount paid', value: `$${Number(item.amount_paid).toFixed(2)}`, color: C.red })
    if (item.market_value) rows.push({ label: 'Market value', value: `$${Number(item.market_value).toFixed(2)}` })
    if (item.pct_of_market) rows.push({ label: '% of market', value: `${item.pct_of_market}%` })
    if (item.qty) rows.push({ label: 'Qty', value: item.qty })
    if (item.condition) rows.push({ label: 'Condition', value: item.condition })
    rows.push({ label: 'Source', value: item.source || '—' })
    rows.push({ label: 'Payment', value: item.payment || '—' })
    if (item.notes) rows.push({ label: 'Notes', value: item.notes })
  } else {
    rows.push({ label: 'Description', value: item.description })
    rows.push({ label: 'Category', value: item.category || '—' })
    rows.push({ label: 'Amount', value: `$${Number(item.amount).toFixed(2)}`, color: C.amber })
    if (item.payment) rows.push({ label: 'Payment', value: item.payment })
  }
  rows.push({ label: 'Logged by', value: item.who || '—' })
  rows.push({ label: 'Time', value: new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) })

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      const table = isSale ? 'sales' : isBuy ? 'buys' : 'expenses'
      const { error } = await supabase.from(table).delete().eq('id', item.id)
      if (error) throw error
      await logActivity({
        actionType: `delete_${table.replace(/s$/, '')}`,
        entityType: table,
        entityId: item.id,
        summary: `Deleted ${table.replace(/s$/, '')}: ${item.description}`,
        beforeData: item,
      })
      onDelete(item.id)
      onClose()
    } catch (e) {
      console.error('Delete failed:', e)
      setDeleteError('Delete failed: ' + (e.message || 'Unknown error'))
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300 }} />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 390, zIndex: 301,
        background: '#0F172A', borderRadius: '20px 20px 0 0',
        padding: '16px 18px max(20px, env(safe-area-inset-bottom))',
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.15)', margin: '0 auto 14px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{typeLabel} details</div>
          </div>
          <div onClick={onClose} style={{ fontSize: 12, color: C.text3, cursor: 'pointer', padding: '4px 10px', background: 'rgba(255,255,255,.05)', borderRadius: 8 }}>Close</div>
        </div>

        {/* Photo */}
        {item.photo_url && (
          <div onClick={() => setPhotoExpanded(!photoExpanded)} style={{ marginBottom: 12, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, cursor: 'pointer', position: 'relative' }}>
            <img src={item.photo_url} alt={item.description} style={{ width: '100%', maxHeight: photoExpanded ? 'none' : 200, objectFit: photoExpanded ? 'contain' : 'cover', display: 'block', background: '#0F172A' }} />
            {!photoExpanded && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 0 6px', background: 'linear-gradient(transparent, rgba(0,0,0,.6))', textAlign: 'center' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 500 }}>Tap to expand</span>
              </div>
            )}
          </div>
        )}

        {/* Full-screen photo overlay */}
        {item.photo_url && photoExpanded && (
          <>
            <div onClick={() => setPhotoExpanded(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <img src={item.photo_url} alt={item.description} style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
              <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 13, color: '#fff', background: 'rgba(255,255,255,.15)', padding: '6px 14px', borderRadius: 20, cursor: 'pointer' }}>Close</div>
            </div>
          </>
        )}

        {/* Amount hero */}
        <div style={{ background: C.surface2, borderRadius: 14, padding: 14, marginBottom: 12, textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
            {isSale ? 'Sale price' : isBuy ? 'Amount paid' : 'Expense amount'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: -1 }}>
            {isSale ? '+' : '-'}${Number(item.amount).toFixed(2)}
          </div>
        </div>

        {/* Detail rows */}
        <div style={{ background: C.surface, borderRadius: 14, padding: '4px 14px', border: `1px solid ${C.border}` }}>
          {rows.map((r, i) => (
            <div key={r.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{ fontSize: 13, color: C.text3 }}>{r.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: r.color || C.text, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>{r.value}</div>
            </div>
          ))}
        </div>

        {/* Edit button */}
        {(isSale || isBuy) && (
          <button
            onClick={() => { onClose(); navigate(isSale ? `/sales?edit=${item.id}` : `/buys?edit=${item.id}`) }}
            style={{
              width: '100%', padding: 13, borderRadius: 12, marginTop: 14,
              background: 'rgba(37,99,235,.1)', border: '1px solid rgba(37,99,235,.2)',
              fontSize: 14, fontWeight: 600, color: '#3B82F6', cursor: 'pointer',
            }}
          >
            Edit this record
          </button>
        )}

        {/* Admin delete */}
        {deleteError && (
          <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, padding: '10px 14px', marginTop: 12, fontSize: 13, color: C.red }}>{deleteError}</div>
        )}
        {isAdmin && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              width: '100%', padding: 13, borderRadius: 12, marginTop: 14,
              background: confirmDelete ? '#DC2626' : 'rgba(248,113,113,.08)',
              border: confirmDelete ? 'none' : '1px solid rgba(248,113,113,.15)',
              fontSize: 14, fontWeight: 600,
              color: confirmDelete ? '#fff' : C.red,
              cursor: deleting ? 'not-allowed' : 'pointer',
            }}
          >
            {deleting ? 'Deleting...' : confirmDelete ? 'Tap again to confirm delete' : 'Delete this record'}
          </button>
        )}
      </div>
    </>
  )
}

export default function HomePage() {
  const { isAdmin, profile } = useAuth()
  const navigate = useNavigate()
  const { navTo, navFade } = useNav()
  const { activeShowId, selectShow, clearShow } = useActiveShow()
  const [stats, setStats] = useState({ todaySales: 0, todayBuys: 0, todayExpenses: 0, txCount: 0, weekSales: 0, weekBuys: 0 })
  const [activity, setActivity] = useState([])
  const [shows, setShows] = useState([])
  const [liveShow, setLiveShow] = useState({ sales: 0, buys: 0, fee: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showCustomize, setShowCustomize] = useState(false)

  // Customizable preferences
  const userId = profile?.id || 'default'
  const prefKey = `evdex_dash_${userId}`
  const defaultPrefs = { quickActions: ['sales', 'buys', 'shows', 'contacts'], heroStat: 'today_revenue' }
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(prefKey)) || defaultPrefs } catch { return defaultPrefs }
  })
  function savePrefs(p) { setPrefs(p); localStorage.setItem(prefKey, JSON.stringify(p)) }

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const ts = todayStart.toISOString()

      const [salesRes, buysRes, expRes, showsRes, tradesRes] = await Promise.all([
        supabase.from('sales').select('id,description,sale_type,sale_price,market_value,pct_of_market,cost_basis,buyer,payment,photo_url,created_at,profiles!created_by(full_name)').gte('created_at', ts).order('created_at', { ascending: false }),
        supabase.from('buys').select('id,description,buy_type,amount_paid,market_value,pct_of_market,qty,condition,source,payment,notes,photo_url,created_at,profiles!created_by(full_name)').gte('created_at', ts).order('created_at', { ascending: false }),
        supabase.from('expenses').select('id,description,category,amount,payment,created_at,profiles!created_by(full_name)').gte('created_at', ts).order('created_at', { ascending: false }),
        supabase.from('shows').select('*').in('status', ['upcoming','in_progress']).order('event_date', { ascending: true }),
        supabase.from('trades').select('id,description,their_total_trade,their_total_market,your_total,delta,amount_paid,payment_method,their_items,your_items,created_at,profiles!created_by(full_name)').gte('created_at', ts).order('created_at', { ascending: false }),
      ])

      const sales = salesRes.data || []
      const buys = buysRes.data || []
      const expenses = expRes.data || []
      const showData = showsRes.data || []
      const trades = tradesRes.data || []

      const todaySales = sales.reduce((s, r) => s + Number(r.sale_price), 0)
      const todayBuys = buys.reduce((s, r) => s + Number(r.amount_paid), 0)
      const todayExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0)

      // Also fetch week data for dashboard options
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
      const wts = weekAgo.toISOString()
      const [wSales, wBuys] = await Promise.all([
        supabase.from('sales').select('sale_price').gte('created_at', wts),
        supabase.from('buys').select('amount_paid').gte('created_at', wts),
      ])
      const weekSales = (wSales.data || []).reduce((s, r) => s + Number(r.sale_price), 0)
      const weekBuys = (wBuys.data || []).reduce((s, r) => s + Number(r.amount_paid), 0)

      setStats({ todaySales, todayBuys, todayExpenses, txCount: sales.length + buys.length + expenses.length, weekSales, weekBuys })
      setShows(showData)

      // Merge into activity feed — include all fields for detail view
      const merged = [
        ...sales.map(r => ({ ...r, type: 'sale', amount: r.sale_price, pct: r.pct_of_market, who: r.profiles?.full_name })),
        ...buys.map(r => ({ ...r, type: 'buy', amount: r.amount_paid, pct: r.pct_of_market, who: r.profiles?.full_name })),
        ...expenses.map(r => ({ ...r, type: 'expense', amount: r.amount, who: r.profiles?.full_name })),
        ...trades.map(r => ({ ...r, type: 'trade', amount: Number(r.their_total_trade) + (r.delta > 0 ? (Number(r.amount_paid) || 0) : 0), who: r.profiles?.full_name })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setActivity(merged)
    } catch (e) {
      console.error('Failed to load dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadShowStats(id) {
    const show = shows.find(s => s.id === id)
    if (!show) return
    try {
      const [s, b] = await Promise.all([
        supabase.from('sales').select('sale_price').eq('show_id', id),
        supabase.from('buys').select('amount_paid').eq('show_id', id),
      ])
      const salesTotal = (s.data || []).reduce((sum, r) => sum + Number(r.sale_price), 0)
      const buysTotal = (b.data || []).reduce((sum, r) => sum + Number(r.amount_paid), 0)
      setLiveShow({ sales: salesTotal, buys: buysTotal, fee: Number(show.table_fee) || 0 })
    } catch (e) {
      console.error('Failed to load show stats:', e)
    }
  }

  function handleSelectShow(id) {
    const show = shows.find(s => s.id === id)
    selectShow(id, show?.name)
    if (activeShowId !== id) loadShowStats(id)
  }

  // Refresh show stats when page loads (e.g. coming back from logging a sale)
  useEffect(() => {
    if (activeShowId && shows.length > 0) loadShowStats(activeShowId)
  }, [activeShowId, shows])

  const activeShow = shows.find(s => s.id === activeShowId)
  const liveNet = liveShow.sales - liveShow.buys - liveShow.fee

  const showParam = activeShowId ? `?show=${activeShowId}` : ''
  const ALL_ACTIONS = {
    sales:      { label: 'Log sale',   path: `/sales${showParam}`,   bg: 'rgba(16,185,129,.12)',  color: '#10B981',  icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="#10B981" strokeWidth="1.5"/><path d="M9 5.5v7M6 9h6" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    buys:       { label: 'Log buy',    path: `/buys${showParam}`,    bg: 'rgba(248,113,113,.1)',   color: '#F87171',  icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M3 3h2.5l2.5 8.5h7L16 6H6" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="15" r="1" fill="#F87171"/><circle cx="14" cy="15" r="1" fill="#F87171"/></svg> },
    shows:      { label: 'Shows',      path: '/shows/manage', bg: 'rgba(245,158,11,.1)',   color: '#F59E0B',  icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="11" rx="2" stroke="#F59E0B" strokeWidth="1.5"/><path d="M2 7h14M6 2v4M12 2v4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    contacts:   { label: 'Contacts',   path: '/contacts',     bg: 'rgba(37,99,235,.12)',   color: '#60A5FA',  icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><circle cx="7" cy="6" r="3" stroke="#60A5FA" strokeWidth="1.5"/><path d="M2 15c0-2.8 2.2-5 5-5" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 11v5M11.5 13.5h5" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    expenses:   { label: 'Expenses',   path: '/expenses',     bg: 'rgba(245,158,11,.08)',  color: '#D97706',  icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M9 1v16M5 4.5C5 3 7 2 9 2s4 1 4 2.5S11 7 9 7 5 8.5 5 10s2 3.5 4 3.5 4-1.5 4-3" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round"/></svg> },
    inventory:  { label: 'Inventory',  path: '/inventory',    bg: 'rgba(37,99,235,.08)',   color: '#60A5FA',  icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="2" stroke="#60A5FA" strokeWidth="1.3"/><path d="M2 7h14" stroke="#60A5FA" strokeWidth="1.3"/></svg> },
    transactions:{ label: 'Transactions', path: '/transactions', bg: 'rgba(16,185,129,.08)', color: '#10B981', icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M3 5h12M3 9h12M3 13h8" stroke="#10B981" strokeWidth="1.3" strokeLinecap="round"/></svg> },
    quicklog:   { label: 'Quick log',  path: `/sales${showParam}?quick=1`, bg: 'rgba(124,58,237,.12)', color: '#A78BFA', icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M12 1l-3 7h5l-5 9 1-6H5l4-10z" stroke="#A78BFA" strokeWidth="1.2" strokeLinejoin="round"/></svg> },
    trade:      { label: 'Trade',      path: '/trade',            bg: 'rgba(37,99,235,.12)',   color: '#3B82F6',  icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M4 6h10M14 6l-3-3M4 12h10M4 12l3 3" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  }
  const QUICK_ACTIONS = prefs.quickActions.map(k => ALL_ACTIONS[k]).filter(Boolean)

  const HERO_OPTIONS = {
    today_revenue: { label: "Today's revenue", val: `$${stats.todaySales.toLocaleString()}`, sub: `${stats.txCount} transactions today` },
    today_net: { label: "Today's net", val: `$${(stats.todaySales - stats.todayBuys - stats.todayExpenses).toLocaleString()}`, sub: `Revenue minus buys & expenses` },
    week_revenue: { label: "This week's revenue", val: `$${stats.weekSales.toLocaleString()}`, sub: `Last 7 days` },
    week_net: { label: "This week's net", val: `$${(stats.weekSales - stats.weekBuys).toLocaleString()}`, sub: `Last 7 days revenue minus buys` },
  }
  const heroData = HERO_OPTIONS[prefs.heroStat] || HERO_OPTIONS.today_revenue

  return (
    <PullToRefresh onRefresh={loadData}>
    <div style={{ paddingTop: 12 }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#1E3A8A,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{heroData.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>{heroData.val}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>{heroData.sub}</div>
          </div>
          <div onClick={() => setShowCustomize(true)} style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', cursor: 'pointer', padding: '4px 8px', background: 'rgba(255,255,255,.06)', borderRadius: 6 }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M11.5 3.5l5 5M4 13l-1 4 4-1 9.5-9.5-3-3L4 13z" stroke="rgba(255,255,255,.5)" strokeWidth="1.3" strokeLinejoin="round"/></svg>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.1)' }}>
          {[
            { label: 'Spent (buys)', val: `$${stats.todayBuys.toFixed(0)}`, color: C.red },
            { label: 'Expenses', val: `$${stats.todayExpenses.toFixed(0)}`, color: C.amber },
            { label: 'Net', val: `$${(stats.todaySales - stats.todayBuys - stats.todayExpenses).toFixed(0)}`, color: C.green },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: s.color, marginTop: 2 }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Show in progress bar */}
      {shows.length > 0 && (
        <div style={{ background: C.surface2, borderRadius: 14, padding: '12px 14px', marginBottom: 10, border: '1px solid rgba(245,158,11,.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase' }}>Show in progress</div>
            {activeShowId && (
              <div onClick={() => clearShow()} style={{ fontSize: 10, fontWeight: 600, color: C.red, cursor: 'pointer', padding: '3px 9px', background: 'rgba(248,113,113,.08)', borderRadius: 7 }}>
                End show
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {shows.map(show => (
              <div
                key={show.id}
                onClick={() => handleSelectShow(show.id)}
                style={{
                  flexShrink: 0, padding: '8px 12px', borderRadius: 10, cursor: 'pointer', minWidth: 130,
                  background: activeShowId === show.id ? 'rgba(245,158,11,.06)' : C.surface,
                  border: `1px solid ${activeShowId === show.id ? 'rgba(245,158,11,.5)' : C.border2}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeShowId === show.id && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, display: 'inline-block', marginRight: 5, verticalAlign: 'middle', animation: 'pulse 1.5s infinite' }} />}
                  {show.name}
                </div>
                <div style={{ fontSize: 9, color: C.text3, marginTop: 1 }}>
                  {show.event_date ? new Date(show.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'} · {show.location || '—'}
                </div>
              </div>
            ))}
          </div>
          {activeShow && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
              {[
                { label: 'Sales', val: `$${liveShow.sales.toFixed(0)}`, color: C.green },
                { label: 'Buys', val: `$${liveShow.buys.toFixed(0)}`, color: C.amber },
                { label: 'Net', val: `$${liveNet.toFixed(0)}`, color: liveNet >= 0 ? C.green : C.red },
              ].map(s => (
                <div key={s.label} style={{ background: C.surface3, borderRadius: 8, padding: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        Quick actions
        <span onClick={() => setShowCustomize(true)} style={{ fontSize: 11, color: C.accent2, fontWeight: 500, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>Customize</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(QUICK_ACTIONS.length, 4)},1fr)`, gap: 8, marginBottom: 18 }}>
        {QUICK_ACTIONS.map(a => (
          <div key={a.label} onClick={() => navFade(a.path)} style={{ background: C.surface, borderRadius: 12, padding: '11px 6px 9px', textAlign: 'center', cursor: 'pointer', border: `1px solid ${C.border}` }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
              {a.icon}
            </div>
            <div style={{ fontSize: 9, color: C.text2, fontWeight: 500 }}>{a.label}</div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        Recent activity
        <span onClick={() => navTo('/activity')} style={{ fontSize: 11, color: C.accent2, fontWeight: 500, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>
          {isAdmin ? 'See all' : ''}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 32, fontSize: 13 }}>Loading…</div>
      ) : activity.length === 0 ? (
        <div style={{ background: C.surface, borderRadius: 14, padding: 24, textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, color: C.text3, marginBottom: 8 }}>No activity yet today.</div>
          <div onClick={() => navTo('/sales')} style={{ fontSize: 12, color: C.accent2, cursor: 'pointer', fontWeight: 500 }}>Log your first sale →</div>
        </div>
      ) : (
        activity.map(item => <ActivityCard key={item.id + item.type} item={item} onTap={setSelectedItem} />)
      )}

      {/* Activity detail bottom sheet */}
      {selectedItem && (
        <ActivityDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          isAdmin={isAdmin}
          onDelete={(id) => setActivity(prev => prev.filter(a => a.id !== id))}
          navigate={navTo}
        />
      )}

      {/* Customize modal */}
      {showCustomize && (
        <>
          <div onClick={() => setShowCustomize(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 390, zIndex: 301, background: '#0F172A', borderRadius: '20px 20px 0 0', padding: '16px 18px max(20px, env(safe-area-inset-bottom))', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.15)', margin: '0 auto 14px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>Customize dashboard</div>

            {/* Hero stat selector */}
            <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Main stat</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {Object.entries(HERO_OPTIONS).map(([key, opt]) => (
                <div key={key} onClick={() => savePrefs({ ...prefs, heroStat: key })} style={{
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  background: prefs.heroStat === key ? 'rgba(37,99,235,.12)' : C.surface,
                  border: `1px solid ${prefs.heroStat === key ? 'rgba(37,99,235,.3)' : C.border}`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: prefs.heroStat === key ? 600 : 400, color: prefs.heroStat === key ? '#3B82F6' : C.text }}>{opt.label}</div>
                </div>
              ))}
            </div>

            {/* Quick actions selector */}
            <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Quick actions (pick 4)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {Object.entries(ALL_ACTIONS).map(([key, action]) => {
                const selected = prefs.quickActions.includes(key)
                return (
                  <button key={key} onClick={() => {
                    let next
                    if (selected) {
                      next = prefs.quickActions.filter(k => k !== key)
                    } else if (prefs.quickActions.length < 4) {
                      next = [...prefs.quickActions, key]
                    } else return
                    savePrefs({ ...prefs, quickActions: next })
                  }} style={{
                    padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                    border: `1px solid ${selected ? `${action.color}66` : C.border2}`,
                    background: selected ? `${action.color}15` : C.surface,
                    color: selected ? action.color : C.text3,
                  }}>
                    {action.label}
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: 11, color: C.text3, textAlign: 'center', marginBottom: 12 }}>
              {prefs.quickActions.length}/4 selected
            </div>

            <button onClick={() => setShowCustomize(false)} style={{ width: '100%', padding: 13, borderRadius: 12, background: C.accent, border: 'none', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Done</button>
          </div>
        </>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
    </PullToRefresh>
  )
}
