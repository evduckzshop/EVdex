import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShows } from '../hooks/useData'
import { getDateRange } from '../lib/exportUtils'
import { fetchShowTotals, combineShowTotals, showDate, METRICS } from '../lib/showStats'
import { C } from '../lib/theme'

const card = { background: C.surface, borderRadius: 14, padding: 14, marginBottom: 10, border: `1px solid ${C.border}` }
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }
const rowLast = { ...row, borderBottom: 'none' }
const laneHd = { fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }
const scroller = { display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 14, paddingBottom: 2 }

const DATE_PRESETS = [
  { key: 'all',          label: 'All time' },
  { key: 'this_month',   label: 'This Month' },
  { key: 'this_quarter', label: 'This Quarter' },
  { key: 'this_year',    label: 'This Year' },
  { key: 'last_year',    label: 'Last Year' },
  { key: 'custom',       label: 'Custom' },
]

const money = v => `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v)).toLocaleString()}`

function Chip({ active, onClick, children, tone = 'accent' }) {
  const palette = tone === 'amber'
    ? { border: 'rgba(245,158,11,.4)', bg: 'rgba(245,158,11,.15)', text: C.amber }
    : { border: 'rgba(37,99,235,.4)', bg: 'rgba(37,99,235,.2)', text: C.accent2 }
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, padding: '6px 13px', borderRadius: 20, fontSize: 11.5, fontWeight: 500,
        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        border: `1px solid ${active ? palette.border : C.border2}`,
        background: active ? palette.bg : C.surface,
        color: active ? palette.text : C.text2,
      }}
    >
      {children}
    </button>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ background: C.surface2, borderRadius: 10, padding: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: color || C.text }}>{value}</div>
    </div>
  )
}

export default function ShowStatsPage() {
  const { rows: shows, fetch: fetchShows, loading: loadingShows } = useShows()
  const navigate = useNavigate()

  const [datePreset, setDatePreset] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [metricKey, setMetricKey] = useState('net')
  const [mode, setMode] = useState('compare')
  const [selectedIds, setSelectedIds] = useState([])
  const [totals, setTotals] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { fetchShows() }, [])

  const metric = METRICS.find(m => m.key === metricKey) || METRICS[0]

  // Venues ordered by how often you actually work them.
  const locations = useMemo(() => {
    const counts = new Map()
    for (const s of shows) {
      const l = s.location?.trim()
      if (l) counts.set(l, (counts.get(l) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l)
  }, [shows])

  // ── The lanes ──────────────────────────────────────────────
  const filteredShows = useMemo(() => {
    let list = shows
    if (datePreset !== 'all') {
      const { start, end } = getDateRange(datePreset, customStart, customEnd)
      list = list.filter(s => {
        const d = showDate(s)
        return d >= start && d <= end
      })
    }
    if (locationFilter !== 'all') {
      list = list.filter(s => (s.location?.trim() || '') === locationFilter)
    }
    return list
  }, [shows, datePreset, customStart, customEnd, locationFilter])

  // Load every filtered show's numbers in one batch.
  useEffect(() => {
    if (!filteredShows.length) { setTotals({}); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchShowTotals(filteredShows)
      .then(t => { if (!cancelled) setTotals(t) })
      .catch(e => {
        if (cancelled) return
        console.error('Show stats load error:', e)
        setError(e.message || 'Failed to load show stats')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filteredShows])

  // Drop selections that fall outside the current filters.
  useEffect(() => {
    setSelectedIds(prev => {
      const next = prev.filter(id => filteredShows.some(s => s.id === id))
      return next.length === prev.length ? prev : next
    })
  }, [filteredShows])

  function toggle(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const ranked = useMemo(() => {
    return filteredShows
      .map(s => totals[s.id])
      .filter(Boolean)
      .sort((a, b) => metric.get(b) - metric.get(a))
  }, [filteredShows, totals, metric])

  // No selection means "everything in view" — the page is useful before you tap anything.
  const workingSet = selectedIds.length ? ranked.filter(d => selectedIds.includes(d.id)) : ranked
  const combined = useMemo(() => combineShowTotals(workingSet), [workingSet])
  const maxAbs = Math.max(1, ...ranked.map(d => Math.abs(metric.get(d))))

  const scopeLabel = selectedIds.length
    ? `${selectedIds.length} selected show${selectedIds.length === 1 ? '' : 's'}`
    : `all ${ranked.length} show${ranked.length === 1 ? '' : 's'} in view`

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#1a1420,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(127,119,221,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Show stats</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: combined.net >= 0 ? C.green : C.red, letterSpacing: -1, margin: '4px 0 2px' }}>
          {money(combined.net)}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Net profit across {scopeLabel}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.1)' }}>
          {[
            { l: 'Revenue', v: money(combined.revenue), c: C.green },
            { l: 'Spent', v: money(combined.cogs), c: C.red },
            { l: 'Fees + exp', v: money(combined.fee + combined.expenses), c: C.amber },
          ].map(s => (
            <div key={s.l}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.l}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: s.c, marginTop: 2 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: C.red }}>{error}</div>
      )}

      {/* ── LANES ─────────────────────────────────────────── */}
      <div style={laneHd}>Date range</div>
      <div style={scroller}>
        {DATE_PRESETS.map(d => (
          <Chip key={d.key} active={datePreset === d.key} onClick={() => setDatePreset(d.key)}>{d.label}</Chip>
        ))}
      </div>
      {datePreset === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Start date', value: customStart, set: setCustomStart },
            { label: 'End date', value: customEnd, set: setCustomEnd },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 9, color: C.text3, marginBottom: 4, fontWeight: 500 }}>{f.label}</div>
              <input
                type="date" value={f.value} onChange={e => f.set(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 11, fontSize: 13, color: C.text, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
              />
            </div>
          ))}
        </div>
      )}

      {locations.length > 0 && (
        <>
          <div style={laneHd}>Location</div>
          <div style={scroller}>
            <Chip active={locationFilter === 'all'} onClick={() => setLocationFilter('all')} tone="amber">All venues</Chip>
            {locations.map(l => (
              <Chip key={l} active={locationFilter === l} onClick={() => setLocationFilter(l)} tone="amber">{l}</Chip>
            ))}
          </div>
        </>
      )}

      <div style={laneHd}>Rank by</div>
      <div style={scroller}>
        {METRICS.map(m => (
          <Chip key={m.key} active={metricKey === m.key} onClick={() => setMetricKey(m.key)}>{m.label}</Chip>
        ))}
      </div>

      {/* ── MODE ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 3 }}>
        {[{ key: 'compare', label: 'Compare' }, { key: 'combined', label: 'Combined' }].map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              background: mode === m.key ? 'rgba(37,99,235,.25)' : 'transparent',
              color: mode === m.key ? C.accent2 : C.text3,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Selection controls */}
      {ranked.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: C.text3 }}>
            {selectedIds.length ? `${selectedIds.length} of ${ranked.length} selected` : `Showing all ${ranked.length}`}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span onClick={() => setSelectedIds(ranked.map(d => d.id))} style={{ fontSize: 11, color: C.accent2, cursor: 'pointer', fontWeight: 500 }}>Select all</span>
            {selectedIds.length > 0 && (
              <span onClick={() => setSelectedIds([])} style={{ fontSize: 11, color: C.red, cursor: 'pointer', fontWeight: 500 }}>Clear</span>
            )}
          </div>
        </div>
      )}

      {/* ── BODY ──────────────────────────────────────────── */}
      {loadingShows || loading ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 28, fontSize: 13 }}>Loading…</div>
      ) : !shows.length ? (
        <div style={{ ...card, textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 13, color: C.text3, marginBottom: 8 }}>No shows yet.</div>
          <div onClick={() => navigate('/shows')} style={{ fontSize: 12, color: C.accent2, cursor: 'pointer', fontWeight: 500 }}>Add your first show →</div>
        </div>
      ) : !ranked.length ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 28, fontSize: 13 }}>No shows match these filters.</div>
      ) : mode === 'combined' ? (
        /* ── COMBINED ── */
        <>
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Combined · {combined.showCount} show{combined.showCount === 1 ? '' : 's'}
            </div>
            <div style={row}><span style={{ fontSize: 13, color: C.text2 }}>Revenue</span><span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>{money(combined.revenue)}</span></div>
            <div style={row}><span style={{ fontSize: 13, color: C.text3, paddingLeft: 12 }}>— Cost of goods</span><span style={{ fontSize: 13, fontWeight: 600, color: C.red }}>({money(combined.cogs)})</span></div>
            <div style={row}><span style={{ fontSize: 13, color: C.text3, paddingLeft: 12 }}>— Table fees</span><span style={{ fontSize: 13, fontWeight: 600, color: C.red }}>({money(combined.fee)})</span></div>
            <div style={row}><span style={{ fontSize: 13, color: C.text3, paddingLeft: 12 }}>— Expenses</span><span style={{ fontSize: 13, fontWeight: 600, color: C.red }}>({money(combined.expenses)})</span></div>
            <div style={{ height: 1, background: C.border2, margin: '4px 0' }} />
            <div style={rowLast}><span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Net profit</span><span style={{ fontSize: 16, fontWeight: 700, color: combined.net >= 0 ? C.green : C.red }}>{money(combined.net)}</span></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
            <Stat label="Transactions" value={combined.txCount} color={C.accent2} />
            <Stat label="Avg sale" value={`$${combined.avgSale.toFixed(2)}`} color={C.green} />
            <Stat label="Avg net / show" value={money(combined.showCount ? combined.net / combined.showCount : 0)} color={combined.net >= 0 ? C.green : C.red} />
          </div>

          <div style={laneHd}>Included</div>
          <div style={card}>
            {workingSet.map((d, i, arr) => (
              <div key={d.id} style={i === arr.length - 1 ? rowLast : row}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                  <div style={{ fontSize: 9.5, color: C.text3, marginTop: 1 }}>
                    {d.eventDate ? new Date(`${d.eventDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                    {d.location ? ` · ${d.location}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: d.net >= 0 ? C.green : C.red, flexShrink: 0, marginLeft: 8 }}>{money(d.net)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ── COMPARE ── */
        ranked.map(d => {
          const active = selectedIds.includes(d.id)
          const value = metric.get(d)
          const barPct = (Math.abs(value) / maxAbs) * 100
          const barColor = metric.signed && value < 0 ? C.red : metric.key === 'txCount' ? C.accent2 : C.green
          return (
            <div
              key={d.id}
              onClick={() => toggle(d.id)}
              style={{
                ...card, cursor: 'pointer',
                background: active ? 'rgba(37,99,235,.07)' : C.surface,
                border: `1px solid ${active ? 'rgba(37,99,235,.35)' : C.border}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
                    {d.eventDate ? new Date(`${d.eventDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                    {d.location ? ` · ${d.location}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: barColor, flexShrink: 0 }}>{metric.format(value)}</div>
              </div>

              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.06)', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', borderRadius: 3, background: barColor, width: `${barPct}%`, transition: 'width .3s' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5 }}>
                <Stat label="Rev" value={money(d.revenue)} color={C.green} />
                <Stat label="Spent" value={money(d.cogs)} color={C.red} />
                <Stat label="Fee+exp" value={money(d.fee + d.expenses)} color={C.amber} />
                <Stat label="Txns" value={d.txCount} color={C.accent2} />
              </div>

              <div
                onClick={e => { e.stopPropagation(); navigate(`/shows/${d.id}`) }}
                style={{ fontSize: 11, color: C.accent2, cursor: 'pointer', fontWeight: 500, textAlign: 'center', marginTop: 10 }}
              >
                View transactions →
              </div>
            </div>
          )
        })
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}
