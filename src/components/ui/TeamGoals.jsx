import { useState, useEffect } from 'react'
import { supabase, logActivity } from '../../lib/supabase'
import { C } from '../../lib/theme'

// "Team Goals" — the message the team reads at the table: what we're buying,
// at what parameters, and when to escalate.
//
// Real briefs are sections with items under them, not a flat list:
//
//   PSA BUY LIST: 85% payout     <- section
//     0-50 7 cert +              <- its items
//     100-300 7 cert + conf 4+
//   RAW:                         <- section
//     Singles for snipr 85% max
//
// Sections are detected from how people already write them, so there's no
// markup to learn.
//
// The column is still shows.team_brief: the feature was named Team Goals
// after migration 006 had already been applied, and renaming a column
// nobody sees wasn't worth another migration.

const EXPANDED_KEY = 'evdex_brief_expanded'
const MAX_BRIEF_CHARS = 4000

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

// Sections rotate through these so two blocks never blur together. Amber and
// red are excluded — they mean "ask" and "bad" elsewhere in the app.
const SECTION_COLORS = [C.diamond, C.accent2, C.green]

// A heading is how you'd naturally write one: ending in a colon ("RAW:"),
// a shouted label before a colon ("PSA BUY LIST: 85% payout"), or a short
// line in full caps. Everything else is an item.
export function isHeading(line) {
  if (!line) return false
  if (line.endsWith(':')) return true

  const hasLetter = /[a-z]/i.test(line)
  if (!hasLetter) return false

  const colon = line.indexOf(':')
  if (colon > 0 && colon <= 28) {
    const label = line.slice(0, colon)
    if (label === label.toUpperCase()) return true
  }
  // A short all-caps line with no colon, e.g. "RAW SINGLES".
  if (line.length <= 30 && line === line.toUpperCase()) return true

  return false
}

// Escalation is the one per-line flag worth keeping — it's the difference
// between deciding yourself and ringing someone.
export function needsAsk(line) {
  return /(check with|check w\/|ask |ask$|approval|approve|confirm with|run by)/i.test(line)
}

// Group lines under their headings. Items written before any heading collect
// into a single untitled block so nothing is ever dropped.
export function parseGoals(text) {
  const groups = []
  let current = null
  for (const raw of (text || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if (isHeading(line) || !current) {
      current = { heading: isHeading(line) ? line : null, items: [] }
      groups.push(current)
      if (current.heading) continue
    }
    current.items.push(line)
  }
  return groups
}

export default function TeamGoals({ show, isAdmin, onSaved }) {
  const groups = parseGoals(show?.team_brief)
  const hasContent = groups.length > 0

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
  if (!hasContent && !editing) {
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
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          maxLength={MAX_BRIEF_CHARS}
          autoFocus
          placeholder="Team goals"
          style={{
            width: '100%', minHeight: 150, padding: '10px 11px', marginTop: 7, background: C.surface,
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

      {expanded && (
        <div style={{ padding: '0 11px 10px' }}>
          {groups.map((group, gi) => {
            const color = SECTION_COLORS[gi % SECTION_COLORS.length]
            return (
              <div
                key={gi}
                style={{
                  borderLeft: group.heading ? `3px solid ${color}` : `3px solid ${C.border2}`,
                  paddingLeft: 10,
                  marginBottom: gi < groups.length - 1 ? 11 : 0,
                }}
              >
                {group.heading && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 5 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '.01em', flex: 1, minWidth: 0 }}>
                      {group.heading}
                    </div>
                    {needsAsk(group.heading) && <AskTag />}
                  </div>
                )}

                {group.items.map((item, ii) => (
                  <div key={ii} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '2.5px 0' }}>
                    <span style={{ color: C.text3, fontSize: 11, lineHeight: 1.5, flexShrink: 0 }}>·</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: C.text2, lineHeight: 1.5 }}>
                      {item}
                    </span>
                    {needsAsk(item) && <AskTag />}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AskTag() {
  return (
    <span style={{
      flexShrink: 0, padding: '2px 7px', borderRadius: 20,
      fontSize: 9, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
      background: 'rgba(245,158,11,.15)', color: C.amber,
    }}>
      ask
    </span>
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
