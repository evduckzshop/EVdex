import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const C = {
  surface: '#1E293B', surface2: '#162032', surface3: '#0F172A',
  border: 'rgba(255,255,255,.07)', border2: 'rgba(255,255,255,.13)',
  text: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
  accent: '#2563EB', accent2: '#3B82F6',
  green: '#10B981', red: '#F87171',
}

const BADGE_COLORS = {
  red:    { bg: 'rgba(248,113,113,.15)', text: '#F87171', border: 'rgba(248,113,113,.35)', glow: '#F87171' },
  blue:   { bg: 'rgba(96,165,250,.15)',  text: '#60A5FA', border: 'rgba(96,165,250,.35)',  glow: '#60A5FA' },
  green:  { bg: 'rgba(16,185,129,.15)',  text: '#10B981', border: 'rgba(16,185,129,.35)',  glow: '#10B981' },
  purple: { bg: 'rgba(167,139,250,.15)', text: '#A78BFA', border: 'rgba(167,139,250,.35)', glow: '#A78BFA' },
  gold:   { bg: 'rgba(245,158,11,.15)',  text: '#F59E0B', border: 'rgba(245,158,11,.35)',  glow: '#F59E0B' },
  pink:   { bg: 'rgba(236,72,153,.15)',  text: '#EC4899', border: 'rgba(236,72,153,.35)',  glow: '#EC4899' },
  cyan:   { bg: 'rgba(34,211,238,.15)',  text: '#22D3EE', border: 'rgba(34,211,238,.35)',  glow: '#22D3EE' },
  orange: { bg: 'rgba(251,146,60,.15)',  text: '#FB923C', border: 'rgba(251,146,60,.35)',  glow: '#FB923C' },
}

const BADGE_EFFECTS = [
  { key: 'none',    label: 'None' },
  { key: 'shimmer', label: 'Shimmer' },
  { key: 'glow',    label: 'Glow' },
  { key: 'holo',    label: 'Holo' },
  { key: 'fire',    label: 'Fire' },
  { key: 'ice',     label: 'Ice' },
  { key: 'gold',    label: 'Gold' },
]

const STYLES = `
@keyframes staff-shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes staff-glow {
  0%, 100% { box-shadow: 0 0 6px var(--glow-color, rgba(255,255,255,.2)); }
  50% { box-shadow: 0 0 14px var(--glow-color, rgba(255,255,255,.4)); }
}
@keyframes staff-holo {
  0% { border-color: rgba(248,113,113,.5); filter: hue-rotate(0deg); }
  25% { border-color: rgba(245,158,11,.5); }
  50% { border-color: rgba(16,185,129,.5); filter: hue-rotate(90deg); }
  75% { border-color: rgba(96,165,250,.5); }
  100% { border-color: rgba(167,139,250,.5); filter: hue-rotate(0deg); }
}
@keyframes staff-fire {
  0%, 100% { box-shadow: 0 0 6px rgba(248,113,113,.3), 0 0 12px rgba(245,158,11,.15); }
  50% { box-shadow: 0 0 10px rgba(248,113,113,.5), 0 0 20px rgba(245,158,11,.25); }
}
@keyframes staff-ice {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes staff-gold-shine {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
`

let stylesInjected = false
function injectStyles() {
  if (stylesInjected) return
  const el = document.createElement('style')
  el.textContent = STYLES
  document.head.appendChild(el)
  stylesInjected = true
}

function getEffectStyle(effect, color) {
  const clr = BADGE_COLORS[color] || BADGE_COLORS.blue
  if (!effect || effect === 'none') return {}

  switch (effect) {
    case 'shimmer':
      return {
        background: `linear-gradient(90deg, ${clr.bg} 0%, ${clr.bg} 35%, rgba(255,255,255,.12) 50%, ${clr.bg} 65%, ${clr.bg} 100%)`,
        backgroundSize: '400% 100%',
        animation: 'staff-shimmer 2.5s ease infinite',
      }
    case 'glow':
      return {
        animation: 'staff-glow 2s ease-in-out infinite',
        '--glow-color': clr.glow + '55',
      }
    case 'holo':
      return {
        animation: 'staff-holo 4s ease infinite',
        borderWidth: 2,
        borderStyle: 'solid',
      }
    case 'fire':
      return {
        animation: 'staff-fire 1.5s ease-in-out infinite',
      }
    case 'ice':
      return {
        background: `linear-gradient(90deg, ${clr.bg} 0%, rgba(34,211,238,.08) 50%, ${clr.bg} 100%)`,
        backgroundSize: '400% 100%',
        animation: 'staff-ice 3s ease infinite',
      }
    case 'gold':
      return {
        background: `linear-gradient(90deg, ${clr.bg} 0%, rgba(245,158,11,.15) 50%, ${clr.bg} 100%)`,
        backgroundSize: '400% 100%',
        animation: 'staff-gold-shine 2s ease infinite',
      }
    default:
      return {}
  }
}

// Display component — renders the badge pill
export function StaffBadgePill({ title, color, effect, size = 'normal' }) {
  injectStyles()
  if (!title) return null

  const clr = BADGE_COLORS[color] || BADGE_COLORS.blue
  const effectStyle = getEffectStyle(effect, color)
  const isSmall = size === 'small'

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: isSmall ? 9 : 10, fontWeight: 700, letterSpacing: '.03em',
      padding: isSmall ? '2px 7px' : '3px 10px',
      borderRadius: 20,
      background: clr.bg, color: clr.text,
      border: `1px solid ${clr.border}`,
      whiteSpace: 'nowrap',
      ...effectStyle,
    }}>
      {title}
    </span>
  )
}

// Editor modal — for setting/editing a badge
export function StaffBadgeEditor({ profile, onClose, onSaved }) {
  injectStyles()
  const [title, setTitle] = useState(profile?.badge_title || '')
  const [color, setColor] = useState(profile?.badge_color || 'blue')
  const [effect, setEffect] = useState(profile?.badge_effect || 'none')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleSave() {
    if (!title.trim()) { setMsg('Enter a badge title'); return }
    if (title.trim().length > 20) { setMsg('Max 20 characters'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        badge_title: title.trim(),
        badge_color: color,
        badge_effect: effect,
      }).eq('id', profile.id)
      if (error) throw error
      if (onSaved) await onSaved()
      onClose()
    } catch (e) {
      setMsg('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        badge_title: null,
        badge_color: null,
        badge_effect: null,
      }).eq('id', profile.id)
      if (error) throw error
      if (onSaved) await onSaved()
      onClose()
    } catch (e) {
      setMsg('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 390, zIndex: 301,
        background: '#0F172A', borderRadius: '20px 20px 0 0',
        padding: '16px 18px max(20px, env(safe-area-inset-bottom))',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.15)', margin: '0 auto 14px' }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Set Badge</div>
        <div style={{ fontSize: 12, color: C.text3, marginBottom: 16 }}>
          Customize a fun title for {profile.id === profile.id ? profile.full_name : 'this team member'}
        </div>

        {msg && (
          <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: C.red }}>{msg}</div>
        )}

        {/* Live preview */}
        <div style={{ textAlign: 'center', padding: '16px 0 20px' }}>
          <div style={{ fontSize: 11, color: C.text3, marginBottom: 8 }}>Preview</div>
          {title.trim() ? (
            <StaffBadgePill title={title.trim()} color={color} effect={effect} />
          ) : (
            <span style={{ fontSize: 12, color: C.text3 }}>Type a title to preview</span>
          )}
        </div>

        {/* Title input */}
        <div style={{ fontSize: 9, color: C.text3, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 5 }}>
          Title <span style={{ float: 'right', color: title.length > 20 ? C.red : C.text3 }}>{title.length}/20</span>
        </div>
        <input
          value={title}
          onChange={e => { if (e.target.value.length <= 20) setTitle(e.target.value) }}
          placeholder="e.g. Card Shark"
          maxLength={20}
          style={{
            width: '100%', padding: '11px 13px', background: C.surface,
            border: `1px solid ${C.border2}`, borderRadius: 11,
            fontSize: 14, color: C.text, fontFamily: 'inherit', outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* Color picker */}
        <div style={{ fontSize: 9, color: C.text3, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6, marginTop: 14 }}>Color</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {Object.entries(BADGE_COLORS).map(([key, clr]) => (
            <div
              key={key}
              onClick={() => setColor(key)}
              style={{
                width: 32, height: 32, borderRadius: 10, cursor: 'pointer',
                background: clr.bg, border: `2px solid ${color === key ? clr.text : 'transparent'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: clr.text }} />
            </div>
          ))}
        </div>

        {/* Effect picker */}
        <div style={{ fontSize: 9, color: C.text3, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Effect</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {BADGE_EFFECTS.map(e => (
            <button
              key={e.key}
              onClick={() => setEffect(e.key)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${effect === e.key ? 'rgba(37,99,235,.4)' : C.border2}`,
                background: effect === e.key ? 'rgba(37,99,235,.15)' : C.surface,
                color: effect === e.key ? C.accent2 : C.text2,
              }}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {profile?.badge_title && (
            <button onClick={handleClear} disabled={saving} style={{
              flex: 1, padding: 13, borderRadius: 12,
              background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.15)',
              fontSize: 13, fontWeight: 600, color: C.red,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              Clear
            </button>
          )}
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: 13, borderRadius: 12, border: 'none',
            background: saving ? '#374151' : C.accent,
            fontSize: 13, fontWeight: 600, color: '#fff',
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>
            {saving ? 'Saving...' : 'Save Badge'}
          </button>
        </div>
      </div>
    </>
  )
}

export { BADGE_COLORS, BADGE_EFFECTS }
