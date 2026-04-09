import { useState, useEffect, useRef } from 'react'
import { getAllProfiles, inviteEmployee, setUserActive, supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StaffBadgePill, StaffBadgeEditor } from '../components/ui/StaffBadge'

const C = { surface: '#1E293B', surface2: '#162032', border: 'rgba(255,255,255,.07)', border2: 'rgba(255,255,255,.13)', text: '#F1F5F9', text2: '#94A3B8', text3: '#475569', accent: '#2563EB', accent2: '#3B82F6', green: '#10B981', red: '#F87171', amber: '#F59E0B' }
const inputStyle = { width: '100%', padding: '11px 13px', background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 11, fontSize: 14, color: C.text, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: 10, fontWeight: 600, color: C.text2, letterSpacing: '.07em', textTransform: 'uppercase', display: 'block', marginBottom: 6, marginTop: 14 }

export default function EmployeesPage() {
  const { profile: myProfile } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [selected, setSelected] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'invite'
  const [badgeTarget, setBadgeTarget] = useState(null) // profile to edit badge for

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('employee')
  const [inviting, setInviting] = useState(false)

  const refreshTimerRef = useRef(null)
  useEffect(() => {
    loadProfiles()
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current) }
  }, [])

  async function loadProfiles() {
    setLoading(true)
    try {
      const data = await getAllProfiles()
      setProfiles(data)
    } catch (e) {
      setMsg({ text: 'Error loading team: ' + e.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim() || !inviteName.trim()) {
      setMsg({ text: 'Please fill in name and email.', type: 'error' }); return
    }
    setInviting(true)
    setMsg({ text: '', type: '' })
    try {
      await inviteEmployee({ email: inviteEmail.trim().toLowerCase(), fullName: inviteName.trim(), role: inviteRole })
      setMsg({ text: `Invite sent to ${inviteEmail}!`, type: 'success' })
      setInviteEmail(''); setInviteName(''); setInviteRole('employee')
      refreshTimerRef.current = setTimeout(() => { loadProfiles(); setView('list') }, 1500)
    } catch (e) {
      setMsg({ text: 'Invite failed: ' + e.message, type: 'error' })
    } finally {
      setInviting(false)
    }
  }

  async function toggleActive(userId, currentState) {
    try {
      await setUserActive(userId, !currentState)
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_active: !currentState } : p))
      setSelected(null)
    } catch (e) {
      setMsg({ text: 'Error: ' + e.message, type: 'error' })
    }
  }

  async function changeRole(userId, newRole) {
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
      if (error) throw error
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p))
      setSelected(null)
      setMsg({ text: 'Role updated.', type: 'success' })
      setTimeout(() => setMsg({ text: '', type: '' }), 3000)
    } catch (e) {
      setMsg({ text: 'Error: ' + e.message, type: 'error' })
    }
  }

  const activeCount = profiles.filter(p => p.is_active).length
  const adminCount = profiles.filter(p => p.role === 'admin').length

  // ── INVITE VIEW ─────────────────────────────────────────────
  if (view === 'invite') {
    return (
      <div style={{ paddingTop: 12 }}>
        <div style={{ background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 14, border: '1px solid rgba(37,99,235,.2)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            New team member
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -0.5, margin: '4px 0 2px' }}>
            Invite Employee
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
            They'll receive an email to set their password
          </div>
        </div>

        {msg.text && (
          <div style={{
            background: msg.type === 'error' ? 'rgba(248,113,113,.08)' : 'rgba(16,185,129,.08)',
            border: `1px solid ${msg.type === 'error' ? 'rgba(248,113,113,.2)' : 'rgba(16,185,129,.2)'}`,
            borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13,
            color: msg.type === 'error' ? C.red : C.green,
          }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleInvite}>
          <label style={{ ...labelStyle, marginTop: 0 }}>Full name</label>
          <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />

          <label style={labelStyle}>Email address</label>
          <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="jane@example.com" style={inputStyle} />

          <label style={labelStyle}>Role</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {['employee', 'admin'].map(r => (
              <button key={r} type="button" onClick={() => setInviteRole(r)} style={{
                flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${inviteRole === r ? 'rgba(37,99,235,.4)' : C.border2}`,
                background: inviteRole === r ? 'rgba(37,99,235,.15)' : C.surface2,
                color: inviteRole === r ? C.accent2 : C.text3,
              }}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <button type="submit" disabled={inviting} style={{
            width: '100%', padding: 14, borderRadius: 12, marginTop: 20,
            background: inviting ? '#374151' : C.accent, border: 'none',
            fontSize: 14, fontWeight: 600, color: '#fff', cursor: inviting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>
            {inviting ? 'Sending invite...' : 'Send Invite'}
          </button>
        </form>

        <button onClick={() => { setView('list'); setMsg({ text: '', type: '' }) }} style={{
          width: '100%', padding: 12, borderRadius: 12, marginTop: 8,
          background: 'transparent', border: `1px solid ${C.border2}`,
          fontSize: 13, fontWeight: 500, color: C.text2, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Back to Team
        </button>
        <div style={{ height: 20 }} />
      </div>
    )
  }

  // ── LIST VIEW ───────────────────────────────────────────────
  return (
    <div style={{ paddingTop: 12 }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 14, border: '1px solid rgba(37,99,235,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Your team
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>
          {profiles.length} member{profiles.length !== 1 ? 's' : ''}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
          {activeCount} active · {adminCount} admin{adminCount !== 1 ? 's' : ''}
        </div>
      </div>

      {msg.text && (
        <div style={{
          background: msg.type === 'error' ? 'rgba(248,113,113,.08)' : 'rgba(16,185,129,.08)',
          border: `1px solid ${msg.type === 'error' ? 'rgba(248,113,113,.2)' : 'rgba(16,185,129,.2)'}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13,
          color: msg.type === 'error' ? C.red : C.green,
        }}>
          {msg.text}
        </div>
      )}

      {/* Invite button */}
      <button onClick={() => { setView('invite'); setMsg({ text: '', type: '' }) }} style={{
        width: '100%', padding: 12, borderRadius: 12, marginBottom: 14,
        background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.15)',
        fontSize: 13, fontWeight: 600, color: '#3B82F6', cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7" stroke="#3B82F6" strokeWidth="1.5"/>
          <path d="M10 7v6M7 10h6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Invite Team Member
      </button>

      {/* Team list */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        Team members
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 24 }}>Loading...</div>
      ) : profiles.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 24, fontSize: 13 }}>No team members yet.</div>
      ) : (
        profiles.map(p => (
          <div key={p.id}>
            <div
              onClick={() => setSelected(selected?.id === p.id ? null : p)}
              style={{
                background: C.surface, borderRadius: 14, padding: '12px 13px', marginBottom: 6,
                border: `1px solid ${selected?.id === p.id ? 'rgba(37,99,235,.3)' : C.border}`,
                display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: p.avatar_url ? `url(${p.avatar_url}) center/cover no-repeat` : (p.role === 'admin' ? 'linear-gradient(135deg,#2563EB,#7C3AED)' : '#065F46'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {!p.avatar_url && (p.full_name?.[0]?.toUpperCase() || '?')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {p.full_name}
                  {p.id === myProfile?.id && <span style={{ fontSize: 9, color: C.text3 }}>(you)</span>}
                  {p.badge_title && <StaffBadgePill title={p.badge_title} color={p.badge_color} effect={p.badge_effect} size="small" />}
                </div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
                  Joined {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: p.role === 'admin' ? 'rgba(37,99,235,.12)' : 'rgba(16,185,129,.1)',
                  color: p.role === 'admin' ? C.accent2 : C.green,
                }}>
                  {p.role.charAt(0).toUpperCase() + p.role.slice(1)}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: p.is_active ? 'rgba(16,185,129,.1)' : 'rgba(248,113,113,.1)',
                  color: p.is_active ? C.green : C.red,
                }}>
                  {p.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Expanded actions */}
            {selected?.id === p.id && p.id !== myProfile?.id && (
              <div style={{ background: C.surface2, borderRadius: 10, padding: '10px 12px', marginBottom: 8, marginTop: -2, border: `1px solid ${C.border2}` }}>
                <div style={{ fontSize: 11, color: C.text3, marginBottom: 8 }}>Actions for {p.full_name}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => changeRole(p.id, p.role === 'admin' ? 'employee' : 'admin')} style={{ padding: '7px 14px', borderRadius: 9, background: 'rgba(37,99,235,.12)', border: '1px solid rgba(37,99,235,.2)', fontSize: 12, fontWeight: 600, color: C.accent2, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Make {p.role === 'admin' ? 'Employee' : 'Admin'}
                  </button>
                  <button onClick={() => setBadgeTarget(p)} style={{ padding: '7px 14px', borderRadius: 9, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', fontSize: 12, fontWeight: 600, color: '#F59E0B', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {p.badge_title ? 'Edit Badge' : 'Set Badge'}
                  </button>
                  <button onClick={() => toggleActive(p.id, p.is_active)} style={{
                    padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    background: p.is_active ? 'rgba(248,113,113,.08)' : 'rgba(16,185,129,.08)',
                    border: `1px solid ${p.is_active ? 'rgba(248,113,113,.2)' : 'rgba(16,185,129,.2)'}`,
                    color: p.is_active ? C.red : C.green,
                  }}>
                    {p.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
      <div style={{ height: 16 }} />

      {badgeTarget && (
        <StaffBadgeEditor
          profile={badgeTarget}
          onClose={() => setBadgeTarget(null)}
          onSaved={loadProfiles}
        />
      )}
    </div>
  )
}
