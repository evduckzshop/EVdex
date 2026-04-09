import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useShows } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { C, Label, Input, Select, CtaButton, GhostButton, Toast } from '../components/ui/FormComponents'

function getDisplayStatus(show) {
  if (show.status === 'completed') return 'completed'
  if (show.status === 'in_progress') return 'in_progress'
  // Upcoming but date has passed → show as "passed"
  if (show.event_date) {
    const showDate = new Date(show.event_date + 'T23:59:59')
    if (showDate < new Date()) return 'passed'
  }
  return 'upcoming'
}

const statusColor = s => s === 'completed' ? C.green : s === 'in_progress' ? C.amber : s === 'passed' ? C.red : '#7F77DD'
const statusBg = s => s === 'completed' ? 'rgba(16,185,129,.12)' : s === 'in_progress' ? 'rgba(245,158,11,.12)' : s === 'passed' ? 'rgba(248,113,113,.12)' : 'rgba(127,119,221,.12)'
const statusLabel = s => s === 'passed' ? 'Passed' : s.replace('_', ' ')
const VIEW_KEY = 'evdex_show_view'

export default function ShowManagePage() {
  const { rows, fetch, loading, update, remove } = useShows()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState(searchParams.get('id') || null)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'list')

  useEffect(() => { fetch() }, [])

  useEffect(() => {
    const qid = searchParams.get('id')
    if (qid && rows.length > 0) setSelectedId(qid)
  }, [rows, searchParams])

  function switchView(v) {
    setView(v)
    localStorage.setItem(VIEW_KEY, v)
  }

  const selected = rows.find(r => r.id === selectedId)

  if (selected) {
    return (
      <ShowEditView
        show={selected}
        isAdmin={isAdmin}
        onBack={() => { setSelectedId(null); navigate('/shows/manage', { replace: true }) }}
        onUpdate={async (id, updates) => {
          await update(id, updates)
          setMsg({ text: 'Show updated!', type: 'success' })
          setTimeout(() => setMsg({ text: '', type: '' }), 3000)
        }}
        onDelete={async (id) => {
          await remove(id)
          setSelectedId(null)
          navigate('/shows/manage', { replace: true })
          setMsg({ text: 'Show deleted.', type: 'success' })
          setTimeout(() => setMsg({ text: '', type: '' }), 3000)
        }}
        msg={msg}
        setMsg={setMsg}
      />
    )
  }

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1a1420,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(127,119,221,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Show manager</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>{rows.length} shows</div>
          </div>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 3 }}>
            <button onClick={() => switchView('list')} style={{
              width: 34, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: view === 'list' ? 'rgba(37,99,235,.25)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M2 8h12M2 12h12" stroke={view === 'list' ? '#3B82F6' : '#475569'} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <button onClick={() => switchView('calendar')} style={{
              width: 34, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: view === 'calendar' ? 'rgba(37,99,235,.25)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="3" width="13" height="11" rx="2" stroke={view === 'calendar' ? '#3B82F6' : '#475569'} strokeWidth="1.3"/>
                <path d="M1.5 6.5h13M5 1.5v3M11 1.5v3" stroke={view === 'calendar' ? '#3B82F6' : '#475569'} strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {msg.text && (
        <div style={{ background: msg.type === 'error' ? 'rgba(248,113,113,.08)' : 'rgba(16,185,129,.08)', border: `1px solid ${msg.type === 'error' ? 'rgba(248,113,113,.2)' : 'rgba(16,185,129,.2)'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: msg.type === 'error' ? C.red : C.green }}>{msg.text}</div>
      )}

      {view === 'calendar' ? (
        <CalendarView
          shows={rows}
          loading={loading}
          onSelectShow={(id) => { setSelectedId(id); navigate(`/shows/manage?id=${id}`, { replace: true }) }}
          onAddShow={(date) => navigate(`/shows?date=${date}`)}
        />
      ) : (
        <ListView
          rows={rows}
          loading={loading}
          navigate={navigate}
          setSelectedId={setSelectedId}
        />
      )}
    </div>
  )
}

// ── LIST VIEW ─────────────────────────────────────────────────
function ListView({ rows, loading, navigate, setSelectedId }) {
  return (
    <>
      <GhostButton onClick={() => navigate('/shows')}>+ Add new show</GhostButton>
      <div style={{ height: 14 }} />
      {loading ? <div style={{ textAlign: 'center', color: '#475569', padding: 24 }}>Loading…</div>
        : rows.length === 0 ? <div style={{ textAlign: 'center', color: '#475569', padding: 24, fontSize: 13 }}>No shows yet.</div>
        : rows.map(r => {
          const ds = getDisplayStatus(r)
          return (
          <div
            key={r.id}
            onClick={() => { setSelectedId(r.id); navigate(`/shows/manage?id=${r.id}`, { replace: true }) }}
            style={{ background: C.surface, borderRadius: 14, padding: '13px 14px', marginBottom: 8, border: `1px solid ${C.border}`, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                  {r.event_date ? new Date(r.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'} · {r.location || '—'} · ${Number(r.table_fee || 0).toFixed(0)} fee
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: statusBg(ds), color: statusColor(ds), flexShrink: 0, marginLeft: 8 }}>
                {statusLabel(ds)}
              </span>
            </div>
          </div>
          )
        })}
      <div style={{ height: 16 }} />
    </>
  )
}

// ── CALENDAR VIEW ─────────────────────────────────────────────
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function CalendarView({ shows, loading, onSelectShow, onAddShow }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }
  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDate(null)
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // Map shows to dates
  const showsByDate = {}
  shows.forEach(s => {
    if (s.event_date) {
      const [y, m, d] = s.event_date.split('-').map(Number)
      if (y === year && m - 1 === month) {
        const key = d
        if (!showsByDate[key]) showsByDate[key] = []
        showsByDate[key].push(s)
      }
    }
  })

  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear()

  // Shows for selected date
  const selectedShows = selectedDate ? (showsByDate[selectedDate] || []) : []
  const selectedDateStr = selectedDate
    ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`
    : null

  function handleDateTap(day) {
    if (!day) return
    setSelectedDate(selectedDate === day ? null : day)
  }

  return (
    <div>
      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke={C.text2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{MONTH_NAMES[month]} {year}</div>
          {!isCurrentMonth && (
            <div onClick={goToday} style={{ fontSize: 10, color: '#3B82F6', cursor: 'pointer', marginTop: 2, fontWeight: 600 }}>Today</div>
          )}
        </div>
        <button onClick={nextMonth} style={{ width: 36, height: 36, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M7 4l6 6-6 6" stroke={C.text2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div style={{ background: C.surface, borderRadius: 14, padding: '10px 8px', border: `1px solid ${C.border}`, marginBottom: 12 }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, marginBottom: 4 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: C.text3, padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Date cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />
            const dayShows = showsByDate[day] || []
            const hasShows = dayShows.length > 0
            const isSelected = selectedDate === day
            const isTodayCell = isToday(day)

            // Get the "most important" status for the dot color
            let dotColor = null
            if (hasShows) {
              const statuses = dayShows.map(s => getDisplayStatus(s))
              if (statuses.includes('in_progress')) dotColor = C.amber
              else if (statuses.includes('upcoming')) dotColor = '#7F77DD'
              else if (statuses.includes('passed')) dotColor = C.red
              else dotColor = C.green
            }

            return (
              <div
                key={day}
                onClick={() => handleDateTap(day)}
                style={{
                  textAlign: 'center', padding: '6px 0', cursor: 'pointer',
                  borderRadius: 10, position: 'relative',
                  background: isSelected ? 'rgba(37,99,235,.15)' : 'transparent',
                  border: isTodayCell ? '1px solid rgba(37,99,235,.4)' : '1px solid transparent',
                }}
              >
                <div style={{
                  fontSize: 13, fontWeight: isTodayCell || isSelected ? 700 : 400,
                  color: isSelected ? '#3B82F6' : isTodayCell ? '#3B82F6' : C.text,
                }}>
                  {day}
                </div>
                {/* Status dot */}
                {hasShows && (
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: dotColor, margin: '2px auto 0',
                  }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected date shows */}
      {selectedDate && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            {new Date(year, month, selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>

          {selectedShows.length > 0 && (
            selectedShows.map(s => {
              const ds = getDisplayStatus(s)
              return (
                <div
                  key={s.id}
                  onClick={() => onSelectShow(s.id)}
                  style={{ background: C.surface, borderRadius: 14, padding: '13px 14px', marginBottom: 8, border: `1px solid ${C.border}`, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                        {s.location || '—'} · ${Number(s.table_fee || 0).toFixed(0)} fee
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: statusBg(ds), color: statusColor(ds), flexShrink: 0 }}>
                      {statusLabel(ds)}
                    </span>
                  </div>
                </div>
              )
            })
          )}

          <button
            onClick={() => onAddShow(selectedDateStr)}
            style={{
              width: '100%', padding: 11, borderRadius: 12,
              background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.15)',
              fontSize: 13, fontWeight: 600, color: '#3B82F6',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + Add a show
          </button>
        </div>
      )}

      {!selectedDate && !loading && (
        <div style={{ textAlign: 'center', color: C.text3, fontSize: 12, padding: '8px 0' }}>
          Tap a date to see shows
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}

// ── EDIT VIEW ─────────────────────────────────────────────────
function ShowEditView({ show, isAdmin, onBack, onUpdate, onDelete, msg, setMsg }) {
  const [name, setName] = useState(show.name || '')
  const [date, setDate] = useState(show.event_date || '')
  const [location, setLocation] = useState(show.location || '')
  const [fee, setFee] = useState(String(show.table_fee || ''))
  const [notes, setNotes] = useState(show.notes || '')
  const [status, setStatus] = useState(show.status || 'upcoming')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pl, setPl] = useState(null)

  // Load show P&L
  useEffect(() => {
    async function loadPL() {
      try {
        const [s, b, e] = await Promise.all([
          supabase.from('sales').select('sale_price').eq('show_id', show.id),
          supabase.from('buys').select('amount_paid').eq('show_id', show.id),
          supabase.from('expenses').select('amount').eq('show_id', show.id),
        ])
        if (s.error) throw s.error
        if (b.error) throw b.error
        if (e.error) throw e.error
        const sales = (s.data || []).reduce((sum, r) => sum + Number(r.sale_price), 0)
        const buys = (b.data || []).reduce((sum, r) => sum + Number(r.amount_paid), 0)
        const expenses = (e.data || []).reduce((sum, r) => sum + Number(r.amount), 0)
        const tableFee = Number(show.table_fee) || 0
        setPl({ sales, buys, expenses, tableFee, salesCount: s.data?.length || 0, buysCount: b.data?.length || 0 })
      } catch (err) {
        console.error('Failed to load show P&L:', err)
      }
    }
    loadPL()
  }, [show.id])

  async function handleSave() {
    if (!name.trim()) { setMsg({ text: 'Show name is required.', type: 'error' }); return }
    setSaving(true)
    try {
      await onUpdate(show.id, {
        name: name.trim(),
        event_date: date || null,
        location: location || null,
        table_fee: parseFloat(fee) || 0,
        notes: notes || null,
        status,
      })
    } catch (e) {
      setMsg({ text: 'Error: ' + e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await onDelete(show.id)
    } catch (e) {
      setMsg({ text: 'Error deleting: ' + e.message, type: 'error' })
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div onClick={onBack} style={{ fontSize: 13, color: '#3B82F6', cursor: 'pointer', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        All shows
      </div>

      <div style={{ background: 'linear-gradient(135deg,#1a1420,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(127,119,221,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Edit show</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.5, margin: '4px 0 2px' }}>{show.name}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
          Created {new Date(show.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* Show P&L */}
      {pl && (pl.salesCount > 0 || pl.buysCount > 0) && (
        <div style={{ background: C.surface, borderRadius: 14, padding: 14, marginBottom: 12, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Show financials</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
            {[
              { l: 'Sales', v: `$${pl.sales.toLocaleString()}`, c: C.green, sub: `${pl.salesCount} txn` },
              { l: 'Buys', v: `$${pl.buys.toLocaleString()}`, c: C.red, sub: `${pl.buysCount} txn` },
              { l: 'Net', v: `$${(pl.sales - pl.buys - pl.expenses - pl.tableFee).toLocaleString()}`, c: (pl.sales - pl.buys - pl.expenses - pl.tableFee) >= 0 ? C.green : C.red, sub: 'after fees' },
            ].map(s => (
              <div key={s.l} style={{ background: C.surface2, borderRadius: 8, padding: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{s.l}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 8, color: C.text3, marginTop: 1 }}>{s.sub}</div>
              </div>
            ))}
          </div>
          {(pl.expenses > 0 || pl.tableFee > 0) && (
            <div style={{ fontSize: 11, color: C.text3, display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px solid ${C.border}` }}>
              <span>Expenses: ${pl.expenses.toLocaleString()} · Table fee: ${pl.tableFee.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {msg.text && (
        <div style={{ background: msg.type === 'error' ? 'rgba(248,113,113,.08)' : 'rgba(16,185,129,.08)', border: `1px solid ${msg.type === 'error' ? 'rgba(248,113,113,.2)' : 'rgba(16,185,129,.2)'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: msg.type === 'error' ? C.red : C.green }}>{msg.text}</div>
      )}

      <Label top={false}>Show name</Label>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Show name" />

      <Label>Date</Label>
      <Input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ color: '#94A3B8' }} />

      <Label>Location</Label>
      <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <Label>Table fee ($)</Label>
          <Input type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="upcoming">Upcoming</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </Select>
        </div>
      </div>

      <Label>Notes</Label>
      <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />

      <CtaButton onClick={handleSave} disabled={saving} color="accent">
        {saving ? 'Saving…' : 'Save changes'}
      </CtaButton>

      {isAdmin && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            width: '100%', padding: 13, borderRadius: 12, marginTop: 10,
            background: confirmDelete ? '#DC2626' : 'rgba(248,113,113,.08)',
            border: confirmDelete ? 'none' : '1px solid rgba(248,113,113,.15)',
            fontSize: 14, fontWeight: 600,
            color: confirmDelete ? '#fff' : C.red,
            cursor: deleting ? 'not-allowed' : 'pointer',
          }}
        >
          {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm delete' : 'Delete this show'}
        </button>
      )}

      <GhostButton onClick={onBack}>Cancel</GhostButton>
      <div style={{ height: 20 }} />
    </div>
  )
}
