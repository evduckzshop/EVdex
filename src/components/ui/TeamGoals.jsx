import { useState, useEffect } from 'react'
import { supabase, logActivity } from '../../lib/supabase'
import { C } from '../../lib/theme'

// "Team Goals" — the message the team reads at the table: what we're buying,
// at what parameters, and when to escalate. Free text, one rule per line,
// because real mandates ("300-1000 check with matt") don't fit a form.
//
// The column is still shows.team_brief: the feature was named Team Goals
// after migration 006 had already been applied, and renaming a column
// nobody sees wasn't worth another migration.

const EXPANDED_KEY = 'evdex_brief_expanded'
const MAX_BRIEF_CHARS = 4000

const briefLines = text => (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)

// localStorage throws in private browsing and with site data blocked. This
// renders on the home screen, so a throw here would white-screen the app.
const readExpanded = () => {
  try { return localStorage.getItem(EXPANDED_KEY) === '1' } catch { return false }
}
const writeExpanded = v => {
  try { localStorage.setItem(EXPANDED_KEY, v ? '1' : '0') } catch { /* a preference, not worth surfacing */ }
}

// Gradient text needs background-clip, and if it isn't supported a
// transparent fill would render the heading invisible. Check once.
const SUPPORTS_CLIP = typeof CSS !== 'undefined'
  && typeof CSS.supports === 'function'
  && (CSS.supports('-webkit-background-clip', 'text') || CSS.supports('background-clip', 'text'))

// Classify each rule from its own text. Deliberately conservative — a
// miscoloured line is worse than an uncoloured one, so anything unclear
// falls through to neutral.
function classifyRule(line) {
  const l = line.toLowerCase()

  // Escalation first: these matter most and often contain numbers too.
  if (/(check with|check w\/|ask |ask$|approval|approve|confirm with|run by)/.test(l)) {
    return { color: C.amber, chipBg: 'rgba(245,158,11,.15)', tag: 'ask' }
  }
  // A pricing rule.
  if (l.includes('%')) {
    return { color: C.accent2, chipBg: 'rgba(37,99,235,.15)', tag: null }
  }
  // A want-list: names, no figures.
  if (!/\d/.test(l) && l.includes(',')) {
    return { color: C.green, chipBg: 'rgba(16,185,129,.15)', tag: 'wanted' }
  }
  return { color: C.text3, chipBg: 'rgba(255,255,255,.06)', tag: null }
}

export default function TeamGoals({ show, isAdmin, onSaved }) {
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
        summary: `Updated team goals: ${show.name}`,
        beforeData: { team_brief: show.team_brief ?? null },
        afterData: { team_brief: value },
      })

      onSaved?.(data[0])
      setEditing(false)
      setExpanded(true)
      writeExpanded(true)
    } catch (e) {
      console.error('Team goals save failed:', e)
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
        style={{ marginTop: 8, padding: '8px 11px', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,.03)', border: `1px dashed ${C.border2}`, fontSize: 11, color: C.text3, textAlign: 'center' }}
      >
        + Set team goals for {show.name}
      </div>
    )
  }

  if (editing) {
    return (
      <div style={{ marginTop: 8, background: C.surface3, borderRadius: 11, padding: '11px 12px', border: '1px solid rgba(167,139,250,.3)' }}>
        <Heading />
        <div style={{ fontSize: 10, color: C.text3, margin: '2px 0 7px' }}>One per line</div>
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
        <div style={{ fontSize: 10, color: C.text3, marginTop: 6, lineHeight: 1.5 }}>
          Lines mentioning “check with” are flagged amber, a % turns blue, and a
          list of card names turns green.
        </div>
        {err && <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
          <button
            onClick={save}
            disabled={saving}
            style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff', background: saving ? '#374151' : C.accent, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving…' : 'Save goals'}
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

  return (
    <div style={{ marginTop: 8, background: C.surface3, borderRadius: 11, border: '1px solid rgba(167,139,250,.22)', overflow: 'hidden' }}>
      {/* The whole row is the toggle — a slim disclosure, not a card. */}
      <div
        onClick={toggle}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 11px', cursor: 'pointer' }}
      >
        <Chevron open={expanded} />
        <Heading />
        <span style={{ fontSize: 10.5, color: C.text3, fontWeight: 600 }}>{lines.length}</span>
        <div style={{ flex: 1 }} />
        {expanded && isAdmin && (
          <span
            onClick={e => { e.stopPropagation(); setEditing(true) }}
            style={{ fontSize: 11, color: C.text3, cursor: 'pointer', fontWeight: 500, padding: '2px 2px 2px 8px' }}
          >
            Edit
          </span>
        )}
      </div>

      {expanded && <div style={{ padding: '0 11px 10px' }}>
      {lines.map((line, i) => {
        const cls = classifyRule(line)
        return (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '6px 0 6px 9px',
              borderLeft: `3px solid ${cls.color}`,
              marginBottom: i < lines.length - 1 ? 5 : 0,
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
              background: cls.chipBg, color: cls.color,
              fontSize: 9.5, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: C.text, lineHeight: 1.45 }}>
              {line}
            </div>
            {cls.tag && (
              <span style={{
                flexShrink: 0, marginTop: 1, padding: '2px 7px', borderRadius: 20,
                fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                background: cls.chipBg, color: cls.color,
              }}>
                {cls.tag}
              </span>
            )}
          </div>
        )
      })}
      </div>}
    </div>
  )
}

// Same disclosure chevron used by the deal calculator and trade breakdown.
function Chevron({ open }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 12 12" fill="none"
      style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s ease' }}
    >
      <path d="M3 4.5l3 3 3-3" stroke={C.diamond} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Violet-to-blue gradient wordmark, with a solid violet fallback where
// background-clip isn't available — otherwise the heading would vanish.
function Heading() {
  const base = {
    fontSize: 11, fontWeight: 800, letterSpacing: '.09em',
    textTransform: 'uppercase', whiteSpace: 'nowrap',
  }
  if (!SUPPORTS_CLIP) return <div style={{ ...base, color: C.diamond }}>Team goals</div>
  return (
    <div style={{
      ...base,
      background: `linear-gradient(90deg, ${C.diamond}, ${C.accent2})`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    }}>
      Team goals
    </div>
  )
}
