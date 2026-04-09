import { useState, useRef, useCallback, useEffect } from 'react'
import { C, DealCalc, Input } from './FormComponents'

const MAX_ENTRIES = 100

function TotalBar({ entries, isSale, onAvgPctChange }) {
  const totalMarket = entries.reduce((s, e) => s + (parseFloat(e.market) || 0), 0)
  const totalPrice = entries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const avgPct = totalMarket > 0 ? Math.round((totalPrice / totalMarket) * 1000) / 10 : 0
  const filledCount = entries.filter(e => parseFloat(e.amount) > 0).length
  const hasMarketEntries = entries.some(e => parseFloat(e.market) > 0)

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(37,99,235,.08), rgba(37,99,235,.03))',
      borderRadius: 12, padding: '10px 14px',
      border: '1px solid rgba(37,99,235,.15)',
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Total Market</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>${totalMarket.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Total {isSale ? 'Sale' : 'Price'}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: isSale ? C.green : C.red }}>${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Avg %</div>
        {hasMarketEntries && onAvgPctChange ? (
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={avgPct > 0 ? avgPct : ''}
            onChange={e => { const v = e.target.value; if (v === '' || parseFloat(v) >= 0) onAvgPctChange(v) }}
            placeholder="—"
            style={{
              width: '100%', maxWidth: 70, margin: '0 auto',
              padding: '2px 4px', background: 'rgba(37,99,235,.08)',
              border: '1px solid rgba(37,99,235,.3)', borderRadius: 6,
              fontSize: 15, fontWeight: 700, color: C.accent2,
              fontFamily: 'inherit', outline: 'none', textAlign: 'center',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <div style={{ fontSize: 15, fontWeight: 700, color: C.accent2 }}>{avgPct > 0 ? `${avgPct}%` : '—'}</div>
        )}
      </div>
      <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 9, color: C.text3, marginTop: 2 }}>
        {filledCount} of {entries.length} entries filled
      </div>
    </div>
  )
}

export default function LotCalculator({ entries, setEntries, isSale = false }) {
  const lockRefs = useRef({})
  const totalBarRef = useRef(null)
  const [isSticky, setIsSticky] = useState(false)

  // Watch when the original TotalBar scrolls out of view
  useEffect(() => {
    const el = totalBarRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function getLockRef(idx) {
    if (!lockRefs.current[idx]) lockRefs.current[idx] = { current: false }
    return lockRefs.current[idx]
  }

  function updateEntry(idx, field, value) {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  function distributeAvgPct(newPct) {
    const p = parseFloat(newPct)
    if (!p || p <= 0) return
    setEntries(prev => prev.map(e => {
      const m = parseFloat(e.market) || 0
      if (m <= 0) return e // skip entries without market value
      const newPrice = Math.round(m * p / 100 * 100) / 100
      return { ...e, pct: String(p), amount: String(newPrice) }
    }))
  }

  function setEntryCount(count) {
    const num = Math.max(1, Math.min(MAX_ENTRIES, parseInt(count) || 1))
    setEntries(prev => {
      if (num > prev.length) {
        return [...prev, ...Array(num - prev.length).fill(null).map(() => ({ market: '', amount: '', pct: '', description: '', showDesc: true }))]
      }
      return prev.slice(0, num)
    })
  }

  function addEntry() {
    if (entries.length >= MAX_ENTRIES) return
    setEntries(prev => [...prev, { market: '', amount: '', pct: '', description: '', showDesc: true }])
  }

  function removeEntry(idx) {
    if (entries.length <= 1) return
    setEntries(prev => prev.filter((_, i) => i !== idx))
  }

  function toggleDesc(idx) {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, showDesc: !e.showDesc } : e))
  }

  return (
    <div style={{ marginTop: 12 }}>
      {/* Entry count input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase' }}>
          Entries in lot
        </div>
        <input
          type="number"
          inputMode="numeric"
          value={entries.length}
          onChange={e => setEntryCount(e.target.value)}
          min={1}
          max={MAX_ENTRIES}
          style={{
            width: 60, padding: '6px 8px', background: C.surface,
            border: `1px solid ${C.border2}`, borderRadius: 8,
            fontSize: 14, color: C.text, fontFamily: 'inherit',
            outline: 'none', fontWeight: 600, textAlign: 'center',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Top total bar (original position) */}
      <div ref={totalBarRef}>
        <TotalBar entries={entries} isSale={isSale} onAvgPctChange={distributeAvgPct} />
      </div>

      {/* Sticky total bar (appears when original scrolls out of view) */}
      {isSticky && (
        <div style={{
          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 390, zIndex: 100,
          padding: '6px 14px 6px', background: '#111318',
          borderBottom: '1px solid rgba(37,99,235,.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,.4)',
        }}>
          <TotalBar entries={entries} isSale={isSale} onAvgPctChange={distributeAvgPct} />
        </div>
      )}

      {/* Entry cards */}
      <div style={{ marginTop: 10 }}>
        {entries.map((entry, idx) => (
          <div key={idx} style={{
            background: C.surface, borderRadius: 12, padding: '10px 12px',
            marginBottom: 8, border: `1px solid ${C.border}`,
            position: 'relative',
          }}>
            {/* Entry header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, fontSize: 10, fontWeight: 700,
                  background: 'rgba(37,99,235,.1)', color: C.accent2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {idx + 1}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text2 }}>
                  Entry {idx + 1}
                  {entry.description && <span style={{ fontWeight: 400, color: C.text3 }}> · {entry.description}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {/* Toggle description */}
                <button onClick={() => toggleDesc(idx)} style={{
                  width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: entry.showDesc ? 'rgba(37,99,235,.12)' : 'rgba(255,255,255,.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} title="Add description">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M2 8h8M2 12h10" stroke={entry.showDesc ? C.accent2 : C.text3} strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </button>
                {/* Remove entry */}
                {entries.length > 1 && (
                  <button onClick={() => removeEntry(idx)} style={{
                    width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: 'rgba(248,113,113,.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6h8" stroke={C.red} strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Optional description */}
            {entry.showDesc && (
              <input
                value={entry.description || ''}
                onChange={e => updateEntry(idx, 'description', e.target.value)}
                placeholder="Item name (optional)"
                style={{
                  width: '100%', padding: '8px 10px', background: C.surface2,
                  border: `1px solid ${C.border2}`, borderRadius: 8,
                  fontSize: 12, color: C.text, fontFamily: 'inherit',
                  outline: 'none', boxSizing: 'border-box', marginBottom: 8,
                }}
              />
            )}

            {/* DealCalc for this entry */}
            <DealCalc
              market={entry.market}
              setMarket={v => updateEntry(idx, 'market', v)}
              amount={entry.amount}
              setAmount={v => updateEntry(idx, 'amount', v)}
              pct={entry.pct}
              setPct={v => updateEntry(idx, 'pct', v)}
              isSale={isSale}
              lockRef={getLockRef(idx)}
              collapsible
              compact
            />
          </div>
        ))}
      </div>

      {/* Add entry button */}
      {entries.length < MAX_ENTRIES && (
        <button onClick={addEntry} style={{
          width: '100%', padding: 10, borderRadius: 10, marginBottom: 8,
          background: 'rgba(37,99,235,.06)', border: '1px dashed rgba(37,99,235,.2)',
          fontSize: 12, fontWeight: 600, color: C.accent2, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke={C.accent2} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Add Entry
        </button>
      )}

    </div>
  )
}

// Helper to convert entries to the lot_entries JSON format for saving
export function entriesToLotData(entries) {
  return entries
    .filter(e => parseFloat(e.amount) > 0 || parseFloat(e.market) > 0)
    .map(e => ({
      market_value: parseFloat(e.market) || null,
      price: parseFloat(e.amount) || null,
      pct: parseFloat(e.pct) || null,
      description: e.description?.trim() || null,
    }))
}

// Helper to convert lot_entries JSON back to entry state
export function lotDataToEntries(lotEntries) {
  if (!lotEntries?.length) return [{ market: '', amount: '', pct: '', description: '', showDesc: true }]
  return lotEntries.map(e => ({
    market: e.market_value ? String(e.market_value) : '',
    amount: e.price ? String(e.price) : '',
    pct: e.pct ? String(e.pct) : '',
    description: e.description || '',
    showDesc: !!e.description,
  }))
}

// Helper to compute totals from entries
export function computeLotTotals(entries) {
  const totalMarket = entries.reduce((s, e) => s + (parseFloat(e.market) || 0), 0)
  const totalPrice = entries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const avgPct = totalMarket > 0 ? Math.round((totalPrice / totalMarket) * 1000) / 10 : null
  return { totalMarket, totalPrice, avgPct }
}
