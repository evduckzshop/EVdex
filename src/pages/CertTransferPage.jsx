import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase, updateProfile } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { C } from '../lib/theme'
import { copyText } from '../lib/clipboard'

// A clipboard relay: paste a cert list in on the laptop (after verifying it
// in whatever app does the scanning), copy it out on the phone to paste into
// the selling app. Deliberately a buffer, not a filing system.
//
// Stored in profiles.settings so the feature needs no migration.

const CLEAR_KEY = 'evdex_cert_clear_after_copy'

export default function CertTransferPage() {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error
  const [msg, setMsg] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearAfterCopy, setClearAfterCopy] = useState(() => localStorage.getItem(CLEAR_KEY) === '1')

  const settingsRef = useRef({})   // other keys in settings we must not clobber
  const savedRef = useRef(null)    // last value actually persisted
  const loadedRef = useRef(false)
  const taRef = useRef(null)

  async function load() {
    if (!user) return
    setLoading(true)
    try {
      // Read the row directly rather than trusting the cached AuthContext
      // profile — on the phone this page is usually opened seconds after
      // scanning finished on the laptop.
      const { data, error } = await supabase
        .from('profiles').select('settings').eq('id', user.id).single()
      if (error) throw error
      settingsRef.current = data?.settings || {}
      const buffer = settingsRef.current.cert_buffer || ''
      savedRef.current = buffer
      setText(buffer)
      loadedRef.current = true
    } catch (e) {
      setMsg('Could not load: ' + (e.message || 'unknown error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.id])

  // Autosave. Nothing to press — the laptop just scans and walks away.
  useEffect(() => {
    if (!loadedRef.current || text === savedRef.current) return
    setSaveState('saving')
    const t = setTimeout(async () => {
      try {
        const next = { ...settingsRef.current, cert_buffer: text }
        await updateProfile(user.id, { settings: next })
        settingsRef.current = next
        savedRef.current = text
        setSaveState('saved')
      } catch (e) {
        setSaveState('error')
        setMsg('Save failed: ' + (e.message || 'unknown error'))
      }
    }, 600)
    return () => clearTimeout(t)
  }, [text, user?.id])

  // On a laptop, land with the box focused and fully selected so a single
  // Ctrl+V drops a new batch over the old one. Initial load only, and only on
  // a fine pointer — a later manual click behaves normally, and touch devices
  // don't get a keyboard thrown at them.
  useEffect(() => {
    if (loading) return
    if (!window.matchMedia?.('(pointer: fine)')?.matches) return
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    ta.select()
  }, [loading])

  const lines = useMemo(
    () => text.split(/\r?\n/).map(l => l.trim()).filter(Boolean),
    [text]
  )
  const unique = useMemo(() => [...new Set(lines)], [lines])
  const dupes = lines.length - unique.length
  const digitsOnly = useMemo(() => (text.match(/\d{5,15}/g) || []), [text])
  const needsCleanup = digitsOnly.length > 0 && digitsOnly.join('\n') !== lines.join('\n')
  // A paste out of a table or spreadsheet brings the other columns along.
  const firstCol = useMemo(() => lines.map(l => l.split(/\s+/)[0]).filter(Boolean), [lines])
  // Only offer it when taking the first token can't lose a cert — a line like
  // "12345678, 87654321" is two certs, not a cert plus a column.
  const hasColumns = useMemo(
    () => lines.some(l => /\s/.test(l)) && firstCol.length >= digitsOnly.length,
    [lines, firstCol, digitsOnly]
  )

  function flash(m) {
    setMsg(m)
    setTimeout(() => setMsg(''), 2500)
  }

  async function handleCopy(joiner, label) {
    const payload = lines.join(joiner)
    const ok = await copyText(payload)
    if (!ok) { flash('Copy was blocked — long-press the box and copy manually.'); return }
    flash(`${lines.length} cert${lines.length === 1 ? '' : 's'} copied ${label}`)
    if (clearAfterCopy) setText('')
  }

  function toggleClearAfterCopy() {
    const next = !clearAfterCopy
    setClearAfterCopy(next)
    localStorage.setItem(CLEAR_KEY, next ? '1' : '0')
  }

  const saveLabel = saveState === 'saving' ? 'Saving…'
    : saveState === 'error' ? 'Not saved'
    : saveState === 'saved' ? 'Saved' : 'Up to date'

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Hero — the count is the thing you check after a batch of scans */}
      <div style={{ background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(37,99,235,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Cert transfer</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>
          {lines.length} cert{lines.length === 1 ? '' : 's'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
          {dupes > 0
            ? `${dupes} duplicate${dupes === 1 ? '' : 's'} in the list`
            : 'Paste on your laptop, copy on your phone'}
        </div>
      </div>

      {msg && (
        <div style={{
          background: msg.includes('failed') || msg.includes('blocked') || msg.includes('Could not') ? 'rgba(248,113,113,.08)' : 'rgba(16,185,129,.08)',
          border: `1px solid ${msg.includes('failed') || msg.includes('blocked') || msg.includes('Could not') ? 'rgba(248,113,113,.2)' : 'rgba(16,185,129,.2)'}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13,
          color: msg.includes('failed') || msg.includes('blocked') || msg.includes('Could not') ? C.red : C.green,
        }}>
          {msg}
        </div>
      )}

      {/* Copy first — on the phone this is the only control that matters */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
        <button
          onClick={() => handleCopy('\n', 'as lines')}
          disabled={!lines.length}
          style={{
            padding: 15, borderRadius: 12, border: 'none', fontFamily: 'inherit',
            fontSize: 15, fontWeight: 700, color: '#fff',
            background: lines.length ? C.accent : '#374151',
            cursor: lines.length ? 'pointer' : 'not-allowed',
          }}
        >
          Copy all
        </button>
        <button
          onClick={() => handleCopy('\t', 'tab-separated')}
          disabled={!lines.length}
          style={{
            padding: 15, borderRadius: 12, fontFamily: 'inherit',
            fontSize: 13, fontWeight: 600,
            background: 'rgba(37,99,235,.1)', border: '1px solid rgba(37,99,235,.25)',
            color: lines.length ? C.accent2 : C.text3,
            cursor: lines.length ? 'pointer' : 'not-allowed',
          }}
        >
          Copy tabbed
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div onClick={toggleClearAfterCopy} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
          <div style={{
            width: 32, height: 18, borderRadius: 9, padding: 2, flexShrink: 0,
            background: clearAfterCopy ? 'rgba(37,99,235,.3)' : 'rgba(255,255,255,.08)',
            transition: 'background .2s', display: 'flex', alignItems: 'center',
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: clearAfterCopy ? C.accent2 : '#475569',
              transform: clearAfterCopy ? 'translateX(14px)' : 'translateX(0)',
              transition: 'transform .2s, background .2s',
            }} />
          </div>
          <span style={{ fontSize: 11.5, color: clearAfterCopy ? C.text2 : C.text3 }}>Clear after copy</span>
        </div>
        <span onClick={load} style={{ fontSize: 11.5, color: C.accent2, cursor: 'pointer', fontWeight: 500 }}>Refresh</span>
      </div>

      {/* The box. On a laptop this is focused on load, so the scanner fires
          straight into it; most scanners send Enter, which lands as a newline. */}
      <textarea
        ref={taRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={loading ? 'Loading…' : 'Paste your cert list here…'}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        style={{
          width: '100%', minHeight: 220, padding: '12px 13px',
          background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 12,
          fontSize: 14, lineHeight: 1.6, color: C.text, outline: 'none',
          boxSizing: 'border-box', resize: 'vertical',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 2px 12px' }}>
        <span style={{ fontSize: 10.5, color: saveState === 'error' ? C.red : C.text3 }}>
          {loading ? 'Loading…' : saveLabel}
        </span>
        <span style={{ fontSize: 10.5, color: C.text3 }}>
          {unique.length} unique
        </span>
      </div>

      {/* Tidy-up actions, only shown when they'd actually do something */}
      {(dupes > 0 || needsCleanup || lines.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {dupes > 0 && (
            <button
              onClick={() => { setText(unique.join('\n')); flash(`Removed ${dupes} duplicate${dupes === 1 ? '' : 's'}`) }}
              style={pill(C.amber, 'rgba(245,158,11,.1)', 'rgba(245,158,11,.25)')}
            >
              Remove {dupes} duplicate{dupes === 1 ? '' : 's'}
            </button>
          )}
          {hasColumns && (
            <button
              onClick={() => { setText(firstCol.join('\n')); flash('Kept the first column') }}
              style={pill(C.accent2, 'rgba(37,99,235,.1)', 'rgba(37,99,235,.25)')}
            >
              Keep first column ({firstCol.length})
            </button>
          )}
          {needsCleanup && (
            <button
              onClick={() => { setText(digitsOnly.join('\n')); flash('Stripped everything but the numbers') }}
              style={pill(C.accent2, 'rgba(37,99,235,.1)', 'rgba(37,99,235,.25)')}
            >
              Keep numbers only ({digitsOnly.length})
            </button>
          )}
          {lines.length > 0 && (
            <button
              onClick={() => { if (confirmClear) { setText(''); setConfirmClear(false); flash('Cleared') } else setConfirmClear(true) }}
              style={pill(confirmClear ? '#fff' : C.red, confirmClear ? '#DC2626' : 'rgba(248,113,113,.08)', confirmClear ? '#DC2626' : 'rgba(248,113,113,.2)')}
            >
              {confirmClear ? 'Tap to confirm clear' : 'Clear'}
            </button>
          )}
        </div>
      )}

      <div style={{ background: C.surface2, borderRadius: 11, padding: '10px 12px', border: `1px solid ${C.border}`, fontSize: 11, color: C.text3, lineHeight: 1.6 }}>
        One shared buffer, synced to your account — whatever is here on the laptop
        is here on the phone. On a laptop the box opens focused and selected, so
        <strong style={{ color: C.text2 }}>Ctrl+V</strong> drops a new batch straight over the old one.
      </div>

      <div style={{ height: 16 }} />
    </div>
  )
}

function pill(color, bg, border) {
  return {
    padding: '8px 13px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', color, background: bg,
    border: `1px solid ${border}`,
  }
}
