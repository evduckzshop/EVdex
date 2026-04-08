import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfile, signOut, uploadAvatar } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const C = { surface: '#1E293B', surface2: '#162032', border: 'rgba(255,255,255,.07)', border2: 'rgba(255,255,255,.13)', text: '#F1F5F9', text2: '#94A3B8', text3: '#475569', accent: '#2563EB', green: '#10B981', red: '#F87171' }

const inputStyle = { width: '100%', padding: '11px 13px', background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 11, fontSize: 14, color: C.text, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const labelStyle = { fontSize: 10, fontWeight: 600, color: C.text2, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 6, marginTop: 14, display: 'block' }
const cardStyle = { background: C.surface, borderRadius: 14, padding: '14px', marginBottom: 10, border: `1px solid ${C.border}` }
const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}` }

export default function ProfilePage() {
  const { profile, isAdmin, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleSave() {
    if (!fullName.trim()) return
    setSaving(true)
    try {
      await updateProfile(profile.id, { full_name: fullName.trim() })
      await refreshProfile()
      setMsg('Profile updated!')
      setEditing(false)
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setMsg('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setMsg('Please select an image file.'); return }
    if (file.size > 2 * 1024 * 1024) { setMsg('Image must be under 2MB.'); return }
    setUploading(true)
    try {
      await uploadAvatar(profile.id, file)
      await refreshProfile()
      setMsg('Profile picture updated!')
      setTimeout(() => setMsg(''), 3000)
    } catch (e) {
      setMsg('Error uploading: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch (e) {
      setMsg('Error signing out: ' + e.message)
    }
  }

  const avatarUrl = profile?.avatar_url

  return (
    <div style={{ paddingTop: 16 }}>

      {/* Avatar + name */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            width: 80, height: 80, borderRadius: '50%',
            background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #2563EB, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 700, color: '#fff', margin: '0 auto 4px',
            cursor: 'pointer', position: 'relative', border: '2px solid rgba(37,99,235,.4)',
          }}
        >
          {!avatarUrl && (profile?.full_name?.[0]?.toUpperCase() || 'U')}
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 26, height: 26, borderRadius: '50%',
            background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #111318',
          }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="5" width="16" height="12" rx="2" stroke="#fff" strokeWidth="1.5"/>
              <circle cx="10" cy="11" r="3" stroke="#fff" strokeWidth="1.5"/>
              <path d="M7 5l1-2h4l1 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
        {uploading ? (
          <div style={{ fontSize: 11, color: C.accent, marginTop: 6 }}>Uploading...</div>
        ) : (
          <div onClick={() => fileRef.current?.click()} style={{ fontSize: 11, color: '#3B82F6', cursor: 'pointer', marginTop: 6 }}>
            {avatarUrl ? 'Change photo' : 'Add photo'}
          </div>
        )}
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginTop: 8 }}>{profile?.full_name}</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: isAdmin ? 'rgba(37,99,235,.15)' : 'rgba(16,185,129,.12)',
            color: isAdmin ? '#60A5FA' : '#10B981',
          }}>
            {isAdmin ? 'Admin' : 'Employee'}
          </span>
        </div>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith('Error') ? 'rgba(248,113,113,.1)' : 'rgba(16,185,129,.1)', border: `1px solid ${msg.startsWith('Error') ? 'rgba(248,113,113,.2)' : 'rgba(16,185,129,.2)'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: msg.startsWith('Error') ? C.red : C.green, textAlign: 'center' }}>
          {msg}
        </div>
      )}

      {/* Edit profile */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Account</div>
      <div style={cardStyle}>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <div style={{ fontSize: 13, color: C.text2 }}>Full name</div>
          {editing ? (
            <div style={{ display: 'flex', gap: 8, flex: 1, marginLeft: 16 }}>
              <input value={fullName} onChange={e => setFullName(e.target.value)} style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} />
              <button onClick={handleSave} disabled={saving} style={{ padding: '7px 14px', borderRadius: 8, background: C.accent, border: 'none', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer', flexShrink: 0 }}>
                {saving ? '...' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setFullName(profile?.full_name || '') }} style={{ padding: '7px 10px', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border2}`, fontSize: 12, color: C.text3, cursor: 'pointer', flexShrink: 0 }}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{profile?.full_name}</div>
              <button onClick={() => setEditing(true)} style={{ fontSize: 11, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 4 }}>
        <div style={{ ...rowStyle }}>
          <div style={{ fontSize: 13, color: C.text2 }}>Role</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{isAdmin ? 'Admin' : 'Employee'}</div>
        </div>
        <div style={{ ...rowStyle }}>
          <div style={{ fontSize: 13, color: C.text2 }}>Status</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: profile?.is_active ? C.green : C.red }}>{profile?.is_active ? 'Active' : 'Deactivated'}</div>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <div style={{ fontSize: 13, color: C.text2 }}>Member since</div>
          <div style={{ fontSize: 13, color: C.text }}>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}</div>
        </div>
      </div>

      {/* Security */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8, marginTop: 18 }}>Security</div>
      <div style={cardStyle}>
        <div style={{ ...rowStyle }}>
          <div style={{ fontSize: 13, color: C.text2 }}>Password</div>
          <button onClick={() => navigate('/forgot-password')} style={{ fontSize: 12, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer' }}>Reset via email</button>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <div>
            <div style={{ fontSize: 13, color: C.text2 }}>Show mode PIN</div>
            <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>Quick login at card shows</div>
          </div>
          <span style={{ fontSize: 12, color: C.text3 }}>Coming soon</span>
        </div>
      </div>

      {/* Sign out */}
      <button onClick={handleSignOut} style={{
        width: '100%', padding: '13px', borderRadius: 12, marginTop: 20,
        background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.15)',
        fontSize: 14, fontWeight: 600, color: C.red, cursor: 'pointer',
      }}>
        Sign out
      </button>

      <div style={{ height: 20 }} />
    </div>
  )
}
