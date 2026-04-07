import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

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

function ActivityCard({ item }) {
  const isSale = item.type === 'sale'
  const isBuy = item.type === 'buy'
  const color = isSale ? C.green : isBuy ? C.red : C.amber
  const tagLabel = isSale ? 'Sale' : isBuy ? 'Buy' : 'Expense'
  const tagBg = isSale ? 'rgba(16,185,129,.12)' : isBuy ? 'rgba(248,113,113,.12)' : 'rgba(245,158,11,.12)'
  const amt = isSale
    ? `+$${Number(item.amount).toFixed(0)}`
    : `-$${Number(item.amount).toFixed(0)}`

  return (
    <div style={{ background: C.surface, borderRadius: 14, padding: '12px 14px', marginBottom: 8, border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.description}
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

export default function HomePage() {
  const { isAdmin, profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ todaySales: 0, todayBuys: 0, todayExpenses: 0, txCount: 0 })
  const [activity, setActivity] = useState([])
  const [shows, setShows] = useState([])
  const [activeShowId, setActiveShowId] = useState(null)
  const [liveShow, setLiveShow] = useState({ sales: 0, buys: 0, fee: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const ts = todayStart.toISOString()

    const [salesRes, buysRes, expRes, showsRes] = await Promise.all([
      supabase.from('sales').select('id,description,sale_price,pct_of_market,created_at,profiles!created_by(full_name)').gte('created_at', ts).order('created_at', { ascending: false }),
      supabase.from('buys').select('id,description,amount_paid,pct_of_market,created_at,profiles!created_by(full_name)').gte('created_at', ts).order('created_at', { ascending: false }),
      supabase.from('expenses').select('id,description,amount,created_at').gte('created_at', ts).order('created_at', { ascending: false }),
      supabase.from('shows').select('*').in('status', ['upcoming','in_progress']).order('event_date', { ascending: true }),
    ])

    const sales = salesRes.data || []
    const buys = buysRes.data || []
    const expenses = expRes.data || []
    const showData = showsRes.data || []

    const todaySales = sales.reduce((s, r) => s + Number(r.sale_price), 0)
    const todayBuys = buys.reduce((s, r) => s + Number(r.amount_paid), 0)
    const todayExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0)

    setStats({ todaySales, todayBuys, todayExpenses, txCount: sales.length + buys.length + expenses.length })
    setShows(showData)

    // Merge into activity feed
    const merged = [
      ...sales.map(r => ({ ...r, type: 'sale', amount: r.sale_price, pct: r.pct_of_market, who: r.profiles?.full_name })),
      ...buys.map(r => ({ ...r, type: 'buy', amount: r.amount_paid, pct: r.pct_of_market, who: r.profiles?.full_name })),
      ...expenses.map(r => ({ ...r, type: 'expense', amount: r.amount })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setActivity(merged)
    setLoading(false)
  }

  function selectShow(id) {
    if (activeShowId === id) { setActiveShowId(null); return }
    setActiveShowId(id)
    const show = shows.find(s => s.id === id)
    if (show) setLiveShow({ sales: 0, buys: 0, fee: Number(show.table_fee) || 0 })
  }

  const activeShow = shows.find(s => s.id === activeShowId)
  const liveNet = liveShow.sales - liveShow.buys - liveShow.fee

  const QUICK_ACTIONS = [
    { label: 'Log sale',   path: '/sales',   bg: 'rgba(16,185,129,.12)',  color: '#10B981',  icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="#10B981" strokeWidth="1.5"/><path d="M9 5.5v7M6 9h6" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label: 'Log buy',    path: '/buys',    bg: 'rgba(248,113,113,.1)',   color: '#F87171',  icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M3 3h2.5l2.5 8.5h7L16 6H6" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="15" r="1" fill="#F87171"/><circle cx="14" cy="15" r="1" fill="#F87171"/></svg> },
    { label: 'Log show',   path: '/shows',   bg: 'rgba(245,158,11,.1)',   color: '#F59E0B',  icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="11" rx="2" stroke="#F59E0B" strokeWidth="1.5"/><path d="M2 7h14M6 2v4M12 2v4" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { label: 'Contacts',   path: '/contacts',bg: 'rgba(37,99,235,.12)',   color: '#60A5FA',  icon: <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><circle cx="7" cy="6" r="3" stroke="#60A5FA" strokeWidth="1.5"/><path d="M2 15c0-2.8 2.2-5 5-5" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 11v5M11.5 13.5h5" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  ]

  return (
    <div style={{ paddingTop: 12 }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#1E3A8A,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Today's revenue</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>
          ${stats.todaySales.toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>{stats.txCount} transactions logged today</div>
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
              <div onClick={() => setActiveShowId(null)} style={{ fontSize: 10, fontWeight: 600, color: C.red, cursor: 'pointer', padding: '3px 9px', background: 'rgba(248,113,113,.08)', borderRadius: 7 }}>
                End show
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {shows.map(show => (
              <div
                key={show.id}
                onClick={() => selectShow(show.id)}
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
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Quick actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 18 }}>
        {QUICK_ACTIONS.map(a => (
          <div key={a.path} onClick={() => navigate(a.path)} style={{ background: C.surface, borderRadius: 12, padding: '11px 6px 9px', textAlign: 'center', cursor: 'pointer', border: `1px solid ${C.border}` }}>
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
        <span onClick={() => navigate('/activity')} style={{ fontSize: 11, color: C.accent2, fontWeight: 500, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>
          {isAdmin ? 'See all' : ''}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 32, fontSize: 13 }}>Loading…</div>
      ) : activity.length === 0 ? (
        <div style={{ background: C.surface, borderRadius: 14, padding: 24, textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, color: C.text3, marginBottom: 8 }}>No activity yet today.</div>
          <div onClick={() => navigate('/sales')} style={{ fontSize: 12, color: C.accent2, cursor: 'pointer', fontWeight: 500 }}>Log your first sale →</div>
        </div>
      ) : (
        activity.map(item => <ActivityCard key={item.id + item.type} item={item} />)
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}
