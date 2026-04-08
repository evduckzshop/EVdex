// Shared UI primitives for all form pages
import { useState, useRef, useCallback } from 'react'

export const C = {
  surface: '#1E293B', surface2: '#162032', surface3: '#0F172A',
  border: 'rgba(255,255,255,.07)', border2: 'rgba(255,255,255,.13)',
  text: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
  accent: '#2563EB', accent2: '#3B82F6',
  green: '#10B981', red: '#F87171', amber: '#F59E0B',
}

export function Label({ children, top = true }) {
  return (
    <label style={{
      fontSize: 10, fontWeight: 600, color: C.text2, letterSpacing: '.07em',
      textTransform: 'uppercase', display: 'block', marginBottom: 6,
      marginTop: top ? 14 : 0,
    }}>
      {children}
    </label>
  )
}

export function Input({ style: s, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: '100%', padding: '11px 13px', background: C.surface,
        border: `1px solid ${C.border2}`, borderRadius: 11,
        fontSize: 14, color: C.text, fontFamily: 'inherit', outline: 'none',
        boxSizing: 'border-box', ...s,
      }}
    />
  )
}

export function Select({ children, style: s, ...props }) {
  return (
    <select
      {...props}
      style={{
        width: '100%', padding: '11px 13px', background: C.surface,
        border: `1px solid ${C.border2}`, borderRadius: 11,
        fontSize: 14, color: C.text2, fontFamily: 'inherit', outline: 'none',
        appearance: 'none', boxSizing: 'border-box', ...s,
      }}
    >
      {children}
    </select>
  )
}

export function ChipGroup({ options, value, onChange, color = 'accent' }) {
  const activeStyle = color === 'green'
    ? { background: 'rgba(16,185,129,.15)', color: '#10B981', borderColor: 'rgba(16,185,129,.3)' }
    : { background: 'rgba(37,99,235,.2)', color: '#3B82F6', borderColor: 'rgba(37,99,235,.4)' }

  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 4 }}>
      {options.map(opt => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              border: `1px solid ${active ? activeStyle.borderColor : C.border2}`,
              background: active ? activeStyle.background : C.surface,
              color: active ? activeStyle.color : C.text2,
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export function PaymentPicker({ options, value, onChange }) {
  const isOther = !options.includes(value)
  const [customValue, setCustomValue] = useState(isOther && value ? value : '')

  function handleChip(v) {
    if (v === 'Other') {
      onChange(customValue || '')
    } else {
      setCustomValue('')
      onChange(v)
    }
  }

  function handleCustom(v) {
    setCustomValue(v)
    onChange(v)
  }

  return (
    <>
      <Label>Payment method</Label>
      <ChipGroup options={[...options, 'Other']} value={isOther ? 'Other' : value} onChange={handleChip} color="green" />
      {isOther && (
        <input
          value={customValue}
          onChange={e => handleCustom(e.target.value)}
          placeholder="Enter payment method..."
          style={{
            width: '100%', padding: '11px 13px', marginTop: 8, background: C.surface,
            border: `1px solid ${C.border2}`, borderRadius: 11,
            fontSize: 14, color: C.text, fontFamily: 'inherit', outline: 'none',
            boxSizing: 'border-box',
          }}
          autoFocus
        />
      )}
    </>
  )
}

function DealSlider({ pctNum, barColor, onPct, mktNum, amtNum }) {
  const trackRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const displayPct = Math.min(pctNum, 100)

  const calcPct = useCallback((clientX) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const newPct = Math.round((x / rect.width) * 100)
    onPct(String(newPct))
  }, [onPct])

  function handlePointerDown(e) {
    e.preventDefault()
    setDragging(true)
    calcPct(e.clientX)
    trackRef.current?.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!dragging) return
    e.preventDefault()
    calcPct(e.clientX)
  }

  function handlePointerUp() {
    setDragging(false)
  }

  const canDrag = mktNum > 0 || amtNum > 0

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: C.text3, marginBottom: 4 }}>
        <span>0%</span><span>50%</span><span>75%</span><span>100%</span>
      </div>
      <div
        ref={trackRef}
        onPointerDown={canDrag ? handlePointerDown : undefined}
        onPointerMove={canDrag ? handlePointerMove : undefined}
        onPointerUp={canDrag ? handlePointerUp : undefined}
        onPointerCancel={canDrag ? handlePointerUp : undefined}
        style={{
          height: 24, borderRadius: 3, background: 'transparent',
          position: 'relative', cursor: canDrag ? 'pointer' : 'default',
          touchAction: 'none', userSelect: 'none',
        }}
      >
        {/* Track background */}
        <div style={{ position: 'absolute', top: 9, left: 0, right: 0, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.06)' }} />
        {/* Filled portion */}
        <div style={{ position: 'absolute', top: 9, left: 0, height: 6, borderRadius: 3, background: barColor, width: `${displayPct}%`, transition: dragging ? 'none' : 'width .3s' }} />
        {/* Tick marks */}
        {[50, 75].map(p => (
          <div key={p} style={{ position: 'absolute', top: 6, left: `${p}%`, width: 1.5, height: 12, background: 'rgba(255,255,255,.15)', borderRadius: 1, pointerEvents: 'none' }} />
        ))}
        {/* Drag handle */}
        {canDrag && displayPct > 0 && (
          <div style={{
            position: 'absolute', top: 2, left: `${displayPct}%`, transform: 'translateX(-50%)',
            width: 20, height: 20, borderRadius: '50%',
            background: barColor, border: '2px solid #0F172A',
            boxShadow: `0 0 8px ${barColor}44`,
            transition: dragging ? 'none' : 'left .3s',
            pointerEvents: 'none',
          }} />
        )}
      </div>
      {canDrag && (
        <div style={{ fontSize: 8, color: C.text3, textAlign: 'center', marginTop: 2, fontWeight: 500 }}>
          Drag to adjust percentage
        </div>
      )}
    </div>
  )
}

export function DealCalc({ market, setMarket, amount, setAmount, pct, setPct, isSale = false, lockRef }) {
  function onMarket(v) {
    if (lockRef.current) return; lockRef.current = true
    setMarket(v)
    const m = parseFloat(v) || 0, a = parseFloat(amount) || 0, p = parseFloat(pct) || 0
    if (m > 0 && a > 0) setPct(String(Math.round((a / m) * 1000) / 10))
    else if (m > 0 && p > 0) setAmount(String(Math.round(m * p / 100 * 100) / 100))
    lockRef.current = false
  }
  function onAmount(v) {
    if (lockRef.current) return; lockRef.current = true
    setAmount(v)
    const m = parseFloat(market) || 0, a = parseFloat(v) || 0
    if (m > 0 && a > 0) setPct(String(Math.round((a / m) * 1000) / 10))
    lockRef.current = false
  }
  function onPct(v) {
    if (lockRef.current) return; lockRef.current = true
    setPct(v)
    const m = parseFloat(market) || 0, p = parseFloat(v) || 0, a = parseFloat(amount) || 0
    if (m > 0 && p > 0) setAmount(String(Math.round(m * p / 100 * 100) / 100))
    else if (p > 0 && a > 0) setMarket(String(Math.round(a / (p / 100) * 100) / 100))
    lockRef.current = false
  }

  const pctNum = parseFloat(pct) || 0
  const amtNum = parseFloat(amount) || 0
  const mktNum = parseFloat(market) || 0
  const hasData = pctNum > 0 && (mktNum > 0 || amtNum > 0)

  let barColor = '#475569', tagText = 'Enter values', tagBg = 'rgba(255,255,255,.05)', tagColor = C.text3
  if (hasData) {
    if (isSale) {
      if (pctNum >= 90) { barColor = C.green; tagText = 'Strong'; tagBg = 'rgba(16,185,129,.15)'; tagColor = C.green }
      else if (pctNum >= 75) { barColor = C.amber; tagText = 'Good'; tagBg = 'rgba(245,158,11,.12)'; tagColor = C.amber }
      else { barColor = C.red; tagText = 'Low sell'; tagBg = 'rgba(248,113,113,.1)'; tagColor = C.red }
    } else {
      if (pctNum <= 50) { barColor = C.green; tagText = 'Steal'; tagBg = 'rgba(16,185,129,.15)'; tagColor = C.green }
      else if (pctNum <= 65) { barColor = C.green; tagText = 'Great deal'; tagBg = 'rgba(16,185,129,.1)'; tagColor = C.green }
      else if (pctNum <= 75) { barColor = C.amber; tagText = 'Good deal'; tagBg = 'rgba(245,158,11,.12)'; tagColor = C.amber }
      else if (pctNum <= 85) { barColor = C.amber; tagText = 'Fair'; tagBg = 'rgba(245,158,11,.08)'; tagColor = C.amber }
      else { barColor = C.red; tagText = pctNum > 100 ? 'Over market' : 'Slim margin'; tagBg = 'rgba(248,113,113,.1)'; tagColor = C.red }
    }
  }

  return (
    <div style={{ background: C.surface2, borderRadius: 14, padding: 14, marginTop: 12, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 }}>
        {isSale ? 'Market calculator' : 'Deal calculator'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        {[
          { label: 'Total market ($)', val: market, set: onMarket, pctField: false },
          { label: isSale ? 'Sale price ($)' : 'You paid ($)', val: amount, set: onAmount, pctField: false },
          { label: '% of market', val: pct, set: onPct, pctField: true },
        ].map(f => (
          <div key={f.label}>
            <div style={{ fontSize: 9, color: C.text3, marginBottom: 4, fontWeight: 500 }}>{f.label}</div>
            <input
              type="number"
              value={f.val}
              onChange={e => f.set(e.target.value)}
              placeholder={f.pctField ? '—' : '0.00'}
              style={{
                width: '100%', padding: '10px 8px',
                border: `1px solid ${f.pctField ? 'rgba(37,99,235,.35)' : C.border2}`,
                background: f.pctField ? 'rgba(37,99,235,.05)' : C.surface,
                borderRadius: 9, fontSize: 14, color: C.text,
                fontFamily: 'inherit', outline: 'none', fontWeight: 600, textAlign: 'center',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0' }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <div style={{ fontSize: 8, color: C.text3, fontWeight: 600, letterSpacing: '.05em' }}>TYPE ANY FIELD — OTHERS AUTO-FILL</div>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>
      <div style={{ background: C.surface3, borderRadius: 11, padding: '11px 13px', border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: C.text3 }}>{isSale ? '% of market sold at' : '% of market paid'}</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -1, color: hasData ? barColor : C.text3 }}>
              {hasData ? `${pctNum}%` : '— %'}
            </div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 20, background: tagBg, color: tagColor }}>
            {tagText}
          </div>
        </div>
        <DealSlider pctNum={pctNum} barColor={barColor} onPct={onPct} mktNum={mktNum} amtNum={amtNum} />
        {isSale && amtNum > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.text3 }}>Sale price</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: barColor }}>${amtNum.toFixed(2)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export function Toast({ message, type = 'success', onDismiss }) {
  if (!message) return null
  const bg = type === 'error' ? 'rgba(248,113,113,.08)' : 'rgba(16,185,129,.08)'
  const bc = type === 'error' ? 'rgba(248,113,113,.2)' : 'rgba(16,185,129,.2)'
  const color = type === 'error' ? '#F87171' : '#10B981'
  return (
    <div style={{ background: bg, border: `1px solid ${bc}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color, lineHeight: 1.5 }}>
      {message}
    </div>
  )
}

export function CtaButton({ children, onClick, color = 'accent', disabled, style: s }) {
  const bg = color === 'green' ? '#059669' : color === 'orange' ? '#D97706' : color === 'red' ? '#DC2626' : '#2563EB'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: 13, borderRadius: 12, background: disabled ? '#374151' : bg,
        border: 'none', fontSize: 14, fontWeight: 600, color: '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        marginTop: 14, transition: 'opacity .15s', ...s,
      }}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: 11, borderRadius: 12, background: 'transparent',
        border: `1px solid ${C.border2}`, fontSize: 13, fontWeight: 500,
        color: C.text2, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8,
      }}
    >
      {children}
    </button>
  )
}

export function HeroCard({ label, value, sub, className, style: s, children }) {
  return (
    <div style={{
      borderRadius: 18, padding: 18, marginBottom: 12,
      background: 'var(--surface2,#162032)',
      border: '1px solid rgba(37,99,235,.2)', ...s,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 27, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>{sub}</div>}
      {children}
    </div>
  )
}

export function RecordCard({ item, amtColor, amt, meta }) {
  return (
    <div style={{ background: C.surface, borderRadius: 14, padding: '12px 14px', marginBottom: 8, border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description || item.name}</div>
          <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{meta}</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: amtColor, whiteSpace: 'nowrap' }}>{amt}</div>
      </div>
    </div>
  )
}

export function AutocompleteInput({ contacts, value, onSelect, placeholder }) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  const filtered = input.length > 0
    ? contacts.filter(c => (c.name || '').toLowerCase().includes(input.toLowerCase()))
    : contacts

  function pick(c) {
    setSelected(c)
    onSelect(c.name)
    setOpen(false)
  }
  function clear() {
    setSelected(null)
    setInput('')
    onSelect('')
  }

  if (selected) {
    return (
      <div style={{ background: 'rgba(37,99,235,.08)', borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 9, border: '1px solid rgba(37,99,235,.2)', marginTop: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: selected.color || '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {selected.name?.[0]?.toUpperCase()}
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.text, flex: 1 }}>{selected.name} · {selected.preferred_pay}</div>
        <div onClick={clear} style={{ fontSize: 11, color: C.accent2, cursor: 'pointer' }}>Change</div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', marginTop: 8 }}>
      <input
        value={input}
        onChange={e => { setInput(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder || 'Type name or search contacts…'}
        style={{ width: '100%', padding: '11px 13px', background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 11, fontSize: 14, color: C.text, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
      />
      {open && filtered.length > 0 && (
        <div style={{ background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 11, marginTop: 4, overflow: 'hidden', position: 'absolute', width: '100%', zIndex: 20 }}>
          {filtered.slice(0, 5).map(c => (
            <div
              key={c.id}
              onMouseDown={() => pick(c)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', cursor: 'pointer', borderBottom: `1px solid ${C.border}` }}
            >
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: c.color || '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {c.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{c.name}</div>
                <div style={{ fontSize: 10, color: C.text3 }}>{c.role} · {c.preferred_pay}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


