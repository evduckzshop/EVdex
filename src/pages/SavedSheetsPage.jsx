import { useState, useEffect, useMemo, useRef } from 'react'
import { useCertSheets } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { supabase, updateProfile } from '../lib/supabase'
import { C } from '../lib/theme'
import { copyText } from '../lib/clipboard'

// Saved Sheets — named cert lists that move between laptop and phone.
// Paste on one device, quick-copy on the other.

const certLines = text => (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)

// Matches the cert_sheets_certs_len CHECK constraint in migration 005.
const MAX_CERTS_CHARS = 100000

function autoName(sheet) {
  const n = certLines(sheet.certs).length
  const d = new Date(sheet.updated_at || sheet.created_at || Date.now())
  const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${day} · ${n} cert${n === 1 ? '' : 's'}`
}

const sheetLabel = sheet => (sheet.name?.trim() || autoName(sheet))

export default function SavedSheetsPage() {
  const { rows: sheets, fetch, insert, update, remove, loading } = useCertSheets()
  const { user } = useAuth()
  const [mode, setMode] = useState('list')   // 'list' | 'new' | sheet id
  const [flash, setFlash] = useState('')
  const [legacy, setLegacy] = useState('')   // leftover single buffer, if any

  useEffect(() => { fetch() }, [])

  // The old version kept one buffer in profiles.settings. Offer to bring it
  // across rather than silently creating a sheet behind your back.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase.from('profiles').select('settings').eq('id', user.id).single()
      .then(({ data }) => {
        if (cancelled) return
        const buffer = data?.settings?.cert_buffer
        if (buffer && buffer.trim()) setLegacy(buffer)
      })
      .catch(() => { /* nothing worth interrupting the page for */ })
    return () => { cancelled = true }
  }, [user?.id])

  function say(m) {
    setFlash(m)
    setTimeout(() => setFlash(''), 2800)
  }

  async function importLegacy() {
    try {
      await insert({ name: 'Imported from transfer buffer', certs: legacy })
      const { data } = await supabase.from('profiles').select('settings').eq('id', user.id).single()
      const next = { ...(data?.settings || {}) }
      delete next.cert_buffer
      await updateProfile(user.id, { settings: next })
      setLegacy('')
      say('Imported as a sheet')
    } catch (e) {
      say('Import failed: ' + (e.message || 'unknown error'))
    }
  }

  const active = mode !== 'list' && mode !== 'new'
    ? sheets.find(s => s.id === mode)
    : null

  if (mode === 'new' || active) {
    return (
      <SheetEditor
        sheet={active}
        onBack={() => setMode('list')}
        onCreate={async record => {
          await insert(record)
          setMode('list')
          say('Sheet saved')
        }}
        onSave={async (id, record) => { await update(id, record) }}
        onDelete={async id => {
          await remove(id)
          setMode('list')
          say('Sheet deleted')
        }}
      />
    )
  }

  const totalCerts = sheets.reduce((n, s) => n + certLines(s.certs).length, 0)

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(37,99,235,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Saved sheets</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>
          {sheets.length} sheet{sheets.length === 1 ? '' : 's'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
          {totalCerts} cert{totalCerts === 1 ? '' : 's'} saved · paste on your laptop, copy on your phone
        </div>
      </div>

      {flash && <Flash text={flash} />}

      {legacy && (
        <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 12, padding: '11px 13px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
            You have {certLines(legacy).length} cert{certLines(legacy).length === 1 ? '' : 's'} in the old transfer buffer.
          </div>
          <button onClick={importLegacy} style={{ marginTop: 9, width: '100%', padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, background: C.amber, color: '#111318' }}>
            Import as a sheet
          </button>
        </div>
      )}

      <button
        onClick={() => setMode('new')}
        style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, background: C.accent, color: '#fff', marginBottom: 14 }}
      >
        + New sheet
      </button>

      {loading ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 28, fontSize: 13 }}>Loading…</div>
      ) : !sheets.length ? (
        <div style={{ background: C.surface, borderRadius: 14, padding: 24, textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, color: C.text3, lineHeight: 1.6 }}>
            No sheets yet. Make one on your laptop, paste your certs in, and it'll be here on your phone.
          </div>
        </div>
      ) : (
        sheets.map(s => <SheetRow key={s.id} sheet={s} onOpen={() => setMode(s.id)} onCopied={say} />)
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}

function Flash({ text }) {
  const bad = /failed|Could not|blocked/i.test(text)
  return (
    <div style={{
      background: bad ? 'rgba(248,113,113,.08)' : 'rgba(16,185,129,.08)',
      border: `1px solid ${bad ? 'rgba(248,113,113,.2)' : 'rgba(16,185,129,.2)'}`,
      borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13,
      color: bad ? C.red : C.green,
    }}>
      {text}
    </div>
  )
}

// ── LIST ROW ────────────────────────────────────────────────
function SheetRow({ sheet, onOpen, onCopied }) {
  const lines = certLines(sheet.certs)
  const preview = lines.slice(0, 3).join(' · ') + (lines.length > 3 ? ' …' : '')

  async function quickCopy(e) {
    e.stopPropagation()
    const ok = await copyText(lines.join('\t'))
    onCopied(ok
      ? `${lines.length} cert${lines.length === 1 ? '' : 's'} copied, tab-separated`
      : 'Copy was blocked — open the sheet and copy from the box.')
  }

  return (
    <div
      onClick={onOpen}
      style={{ background: C.surface, borderRadius: 14, padding: '12px 13px', marginBottom: 8, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11 }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sheetLabel(sheet)}
        </div>
        <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
          {lines.length} cert{lines.length === 1 ? '' : 's'} · {new Date(sheet.updated_at || sheet.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
        {preview && (
          <div style={{ fontSize: 10.5, color: C.text3, marginTop: 4, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {preview}
          </div>
        )}
      </div>

      {/* Quick copy — tab-separated, the format you paste into the selling app */}
      <button
        onClick={quickCopy}
        disabled={!lines.length}
        style={{
          flexShrink: 0, padding: '11px 14px', borderRadius: 11, fontFamily: 'inherit',
          fontSize: 12, fontWeight: 700,
          background: lines.length ? 'rgba(37,99,235,.12)' : 'rgba(255,255,255,.04)',
          border: `1px solid ${lines.length ? 'rgba(37,99,235,.3)' : C.border}`,
          color: lines.length ? C.accent2 : C.text3,
          cursor: lines.length ? 'pointer' : 'not-allowed',
        }}
      >
        Copy
      </button>
    </div>
  )
}

// ── EDITOR ──────────────────────────────────────────────────
function SheetEditor({ sheet, onBack, onCreate, onSave, onDelete }) {
  const isNew = !sheet
  const [name, setName] = useState(sheet?.name || '')
  const [text, setText] = useState(sheet?.certs || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const taRef = useRef(null)

  const baseName = sheet?.name || ''
  const baseText = sheet?.certs || ''
  const dirty = name !== baseName || text !== baseText

  const lines = useMemo(() => certLines(text), [text])
  const unique = useMemo(() => [...new Set(lines)], [lines])
  const dupes = lines.length - unique.length
  const digits = useMemo(() => (text.match(/\d{5,15}/g) || []), [text])
  const needsCleanup = digits.length > 0 && digits.join('\n') !== lines.join('\n')
  const firstCol = useMemo(() => lines.map(l => l.split(/\s+/)[0]).filter(Boolean), [lines])
  // Hidden when taking the first token could drop a cert — "123, 456" is two
  // certs on one line, not a cert plus a column.
  const hasColumns = lines.some(l => /\s/.test(l)) && firstCol.length >= digits.length

  // Focus a new sheet so you can paste straight away. Never auto-select an
  // existing sheet — that would put a saved list one keystroke from gone.
  useEffect(() => {
    if (!isNew) return
    if (!window.matchMedia?.('(pointer: fine)')?.matches) return
    taRef.current?.focus()
  }, [isNew])

  function say(m) {
    setMsg(m)
    setTimeout(() => setMsg(''), 2800)
  }

  async function handleCopy(joiner, label) {
    const ok = await copyText(lines.join(joiner))
    say(ok ? `${lines.length} cert${lines.length === 1 ? '' : 's'} copied ${label}` : 'Copy was blocked — long-press the box and copy manually.')
  }

  async function handleSave() {
    if (!lines.length) { say('Nothing to save yet — paste some certs first.'); return }
    // Mirrors the CHECK constraint, so an oversized paste gets a readable
    // message instead of a raw Postgres constraint error.
    if (text.length > MAX_CERTS_CHARS) {
      say(`Too long — ${text.length.toLocaleString()} characters, limit is ${MAX_CERTS_CHARS.toLocaleString()}. Split it across sheets.`)
      return
    }
    setSaving(true)
    try {
      const record = { name: name.trim() || null, certs: text }
      if (isNew) await onCreate(record)
      else { await onSave(sheet.id, record); say('Saved') }
    } catch (e) {
      say('Save failed: ' + (e.message || 'unknown error'))
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (dirty && !confirmLeave) { setConfirmLeave(true); return }
    onBack()
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div onClick={handleBack} style={{ fontSize: 13, color: C.accent2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke={C.accent2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        All sheets
      </div>

      {confirmLeave && (
        <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 11, padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: C.amber, marginBottom: 8 }}>You have unsaved changes.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onBack} style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, background: 'rgba(248,113,113,.1)', color: C.red }}>Discard them</button>
            <button onClick={() => setConfirmLeave(false)} style={{ flex: 1, padding: '8px 0', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, background: 'transparent', border: `1px solid ${C.border2}`, color: C.text2 }}>Keep editing</button>
          </div>
        </div>
      )}

      {msg && <Flash text={msg} />}

      <div style={{ fontSize: 10, fontWeight: 600, color: C.text2, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 6 }}>
        Sheet name <span style={{ color: C.text3, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· optional</span>
      </div>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={sheet ? autoName(sheet) : 'Left unnamed, it shows the date and count'}
        maxLength={120}
        style={{ width: '100%', padding: '11px 13px', background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 11, fontSize: 14, color: C.text, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '14px 0 6px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.text2, letterSpacing: '.07em', textTransform: 'uppercase' }}>Certs</div>
        <div style={{ fontSize: 11, color: C.text3 }}>
          {lines.length} total{dupes > 0 ? ` · ${dupes} duplicate${dupes === 1 ? '' : 's'}` : ''}
        </div>
      </div>
      <textarea
        ref={taRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste your cert list here…"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        style={{
          width: '100%', minHeight: 200, padding: '12px 13px',
          background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 12,
          fontSize: 14, lineHeight: 1.6, color: C.text, outline: 'none',
          boxSizing: 'border-box', resize: 'vertical',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}
      />

      {/* Cleanup — only shown when it would change something, and labelled
          with the resulting count because none of it is undoable. */}
      {(dupes > 0 || hasColumns || needsCleanup) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {dupes > 0 && (
            <button onClick={() => { setText(unique.join('\n')); say(`Removed ${dupes} duplicate${dupes === 1 ? '' : 's'}`) }} style={pill(C.amber, 'rgba(245,158,11,.1)', 'rgba(245,158,11,.25)')}>
              Remove {dupes} duplicate{dupes === 1 ? '' : 's'}
            </button>
          )}
          {hasColumns && (
            <button onClick={() => { setText(firstCol.join('\n')); say('Kept the first column') }} style={pill(C.accent2, 'rgba(37,99,235,.1)', 'rgba(37,99,235,.25)')}>
              Keep first column ({firstCol.length})
            </button>
          )}
          {needsCleanup && (
            <button onClick={() => { setText(digits.join('\n')); say('Stripped everything but the numbers') }} style={pill(C.accent2, 'rgba(37,99,235,.1)', 'rgba(37,99,235,.25)')}>
              Keep numbers only ({digits.length})
            </button>
          )}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || (!isNew && !dirty)}
        style={{
          width: '100%', padding: 14, borderRadius: 12, border: 'none', marginTop: 14,
          fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: '#fff',
          background: saving ? '#374151' : (!isNew && !dirty) ? '#374151' : C.accent,
          cursor: saving || (!isNew && !dirty) ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Saving…' : isNew ? 'Save sheet' : dirty ? 'Save changes' : 'Saved'}
      </button>

      {!isNew && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          <button onClick={() => handleCopy('\t', 'tab-separated')} disabled={!lines.length} style={copyBtn(!!lines.length)}>Copy tabbed</button>
          <button onClick={() => handleCopy('\n', 'one per line')} disabled={!lines.length} style={copyBtn(!!lines.length)}>Copy as lines</button>
        </div>
      )}

      {!isNew && (
        <button
          onClick={async () => {
            if (!confirmDelete) { setConfirmDelete(true); return }
            try { await onDelete(sheet.id) } catch (e) { say('Delete failed: ' + (e.message || 'unknown error')); setConfirmDelete(false) }
          }}
          style={{
            width: '100%', padding: 12, borderRadius: 12, marginTop: 14, fontFamily: 'inherit',
            fontSize: 13, fontWeight: 600,
            background: confirmDelete ? '#DC2626' : 'rgba(248,113,113,.08)',
            border: confirmDelete ? 'none' : '1px solid rgba(248,113,113,.2)',
            color: confirmDelete ? '#fff' : C.red, cursor: 'pointer',
          }}
        >
          {confirmDelete ? 'Tap again to delete this sheet' : 'Delete sheet'}
        </button>
      )}

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

function copyBtn(enabled) {
  return {
    padding: 13, borderRadius: 12, fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
    background: enabled ? 'rgba(37,99,235,.1)' : 'rgba(255,255,255,.04)',
    border: `1px solid ${enabled ? 'rgba(37,99,235,.25)' : C.border}`,
    color: enabled ? C.accent2 : C.text3,
    cursor: enabled ? 'pointer' : 'not-allowed',
  }
}
