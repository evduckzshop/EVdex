import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useShows } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { supabase, logActivity } from '../lib/supabase'
import { C, Label, Input, Select, CtaButton, GhostButton, Toast } from '../components/ui/FormComponents'

const statusColor = s => s === 'completed' ? C.green : s === 'in_progress' ? C.amber : '#7F77DD'
const statusBg = s => s === 'completed' ? 'rgba(16,185,129,.12)' : s === 'in_progress' ? 'rgba(245,158,11,.12)' : 'rgba(127,119,221,.12)'

export default function ShowManagePage() {
  const { rows, fetch, loading, update, remove } = useShows()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState(searchParams.get('id') || null)
  const [msg, setMsg] = useState({ text: '', type: '' })

  useEffect(() => { fetch() }, [])

  // If an ID was passed via query param, select it once rows load
  useEffect(() => {
    const qid = searchParams.get('id')
    if (qid && rows.length > 0) setSelectedId(qid)
  }, [rows, searchParams])

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
      <div style={{ background: 'linear-gradient(135deg,#1a1420,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(127,119,221,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Show manager</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>{rows.length} shows</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Tap any show to view details &amp; edit</div>
      </div>

      {msg.text && (
        <div style={{ background: msg.type === 'error' ? 'rgba(248,113,113,.08)' : 'rgba(16,185,129,.08)', border: `1px solid ${msg.type === 'error' ? 'rgba(248,113,113,.2)' : 'rgba(16,185,129,.2)'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: msg.type === 'error' ? C.red : C.green }}>{msg.text}</div>
      )}

      <GhostButton onClick={() => navigate('/shows')}>+ Add new show</GhostButton>
      <div style={{ height: 14 }} />

      {loading ? <div style={{ textAlign: 'center', color: '#475569', padding: 24 }}>Loading…</div>
        : rows.length === 0 ? <div style={{ textAlign: 'center', color: '#475569', padding: 24, fontSize: 13 }}>No shows yet.</div>
        : rows.map(r => (
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
              <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: statusBg(r.status), color: statusColor(r.status), flexShrink: 0, marginLeft: 8 }}>
                {r.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        ))}
      <div style={{ height: 16 }} />
    </div>
  )
}

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
      {/* Back button */}
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
