import { useState, useEffect } from 'react'
import { supabase, logActivity } from '../../lib/supabase'
import { C } from '../../lib/theme'

// The message the team reads at the table — what we're buying, at what
// parameters, and when to escalate. Free text, one rule per line: real
// mandates ("300-1000 check with matt") don't fit a structured form.
//
// Admins edit it in place, because a mandate that can only be changed from
// the Add Show form is a mandate nobody updates mid-show.

const EXPANDED_KEY = 'evdex_brief_expanded'
const MAX_BRIEF_CHARS = 4000

const briefLines = text => (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)

// localStorage throws in private browsing and with site data blocked. This
// renders on the home screen, so a throw here would white-screen the app.
const readExpanded = () => {
  try { return localStorage.getItem(EXPANDED_KEY) !== '0' } catch { return true }
}
const writeExpanded = v => {
  try { localStorage.setItem(EXPANDED_KEY, v ? '1' : '0') } catch { /* a preference, not worth surfacing */ }
}

export default function TeamBrief({ show, isAdmin, onSaved }) {
  const lines = briefLines(show?.team_brief)
  const [expanded, setExpanded] = useState(readExpanded)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(show?.team_brief || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Keep the draft in step if the show changes underneath us.
  useEffect(() => {
    if (!editing) setDraft(show?.team_brief || '')
  }, [show?.id, show?.team_brief, editing])

  function toggle() {
    const next = !expanded
    setExpanded(next)
    writeExpanded(next)
  }

  async function save() {
    if (draft.length > MAX_BRIEF_CHARS) {
      setErr(`Too long — ${draft.length.toLocaleString()} characters, limit is ${MAX_BRIEF_CHARS.toLocaleString()}.`)
      return
    }
    setSaving(true)
    setErr('')
    try {
      const value = draft.trim() || null
      const { data, error } = await supabase.from('shows')
        .update({ team_brief: value })
        .eq('id', show.id).select()
      if (error) throw error
      // RLS filters silently rather than erroring, so no rows means blocked.
      if (!data?.length) throw new Error('You do not have permission to edit this show.')

      await logActivity({
        actionType: 'update_show',
        entityType: 'shows',
        entityId: show.id,
        summary: `Updated team brief: ${show.name}`,
        beforeData: { team_brief: show.team_brief ?? null },
        afterData: { team_brief: value },
      })

      onSaved?.(data[0])
      setEditing(false)
      setExpanded(true)
      writeExpanded(true)
    } catch (e) {
      console.error('Team brief save failed:', e)
      setErr(e.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (!show) return null

  // Nothing written yet: prompt an admin, stay out of everyone else's way.
  if (!lines.length && !editing) {
    if (!isAdmin) return null
    return (
      <div
        onClick={() => setEditing(true)}
        style={{ marginTop: 8, padding: '9px 11px', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,.03)', border: `1px dashed ${C.border2}`, fontSize: 11.5, color: C.text3, textAlign: 'center' }}
      >
        + Add a team brief for {show.name}
      </div>
    )
  }

  if (editing) {
    return (
      <div style={{ marginTop: 8, background: C.surface3, borderRadius: 11, padding: '11px 12px', border: '1px solid rgba(37,99,235,.25)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.text2, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 6 }}>
          Team brief · one rule per line
        </div>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          maxLength={MAX_BRIEF_CHARS}
          autoFocus
          placeholder={'PSA Slabs 0-100: 7+ cert, grade 7+\n100-300: 7+ cert, grade 7+\n300-1000: check with Matt\nRaw singles 85%\nZards, promos, mews, pikachus'}
          style={{
            width: '100%', minHeight: 130, padding: '10px 11px', background: C.surface,
            border: `1px solid ${C.border2}`, borderRadius: 9, fontSize: 13, lineHeight: 1.6,
            color: C.text, outline: 'none', boxSizing: 'border-box', resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        {err && <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
          <button
            onClick={save}
            disabled={saving}
            style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff', background: saving ? '#374151' : C.accent, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving…' : 'Save brief'}
          </button>
          <button
            onClick={() => { setEditing(false); setDraft(show?.team_brief || ''); setErr('') }}
            style={{ padding: '9px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, background: 'transparent', border: `1px solid ${C.border2}`, color: C.text3 }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const visible = expanded ? lines : lines.slice(0, 1)

  return (
    <div style={{ marginTop: 8, background: C.surface3, borderRadius: 11, padding: '10px 12px', border: '1px solid rgba(37,99,235,.18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.accent2, letterSpacing: '.07em', textTransform: 'uppercase' }}>
          Team brief
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {isAdmin && (
            <span onClick={() => setEditing(true)} style={{ fontSize: 11, color: C.text3, cursor: 'pointer', fontWeight: 500 }}>Edit</span>
          )}
          {lines.length > 1 && (
            <span onClick={toggle} style={{ fontSize: 11, color: C.accent2, cursor: 'pointer', fontWeight: 500 }}>
              {expanded ? 'Hide' : `Show all ${lines.length}`}
            </span>
          )}
        </div>
      </div>

      {visible.map((line, i) => (
        <div
          key={i}
          style={{
            fontSize: 12.5, color: C.text, lineHeight: 1.5, padding: '5px 0',
            borderBottom: i < visible.length - 1 ? `1px solid ${C.border}` : 'none',
          }}
        >
          {line}
        </div>
      ))}

      {!expanded && lines.length > 1 && (
        <div onClick={toggle} style={{ fontSize: 10.5, color: C.text3, cursor: 'pointer', paddingTop: 6 }}>
          +{lines.length - 1} more
        </div>
      )}
    </div>
  )
}
