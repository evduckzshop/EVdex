import { useState, useEffect } from 'react'
import { supabase, uploadAvatar } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../lib/supabase'
import { C, TIER_COLORS } from '../../components/layout/CustomerLayout'

export default function PortalProfile() {
  const { user, profile, refreshProfile } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [tier, setTier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState('')

  useEffect(() => {
    if (!user) return
    loadProfile()
  }, [user])

  async function loadProfile() {
    try {
      const [custRes, tierRes] = await Promise.all([
        supabase.from('customers').select('*').eq('id', user.id).single(),
        supabase.from('customer_tier').select('*').eq('customer_id', user.id).single(),
      ])
      if (custRes.data) setCustomer(custRes.data)
      if (tierRes.data) setTier(tierRes.data)
    } catch (e) {
      console.error('Profile load error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      window.location.href = '/login'
    } catch (e) {
      console.error('Sign out error:', e)
    }
  }

  function pickAvatar() {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = 'image/*'
    inp.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      setUploading(true)
      setAvatarMsg('')
      try {
        await uploadAvatar(user.id, file)
        await refreshProfile()
        setAvatarMsg('Photo updated!')
        setTimeout(() => setAvatarMsg(''), 2000)
      } catch (err) {
        setAvatarMsg('Failed to upload: ' + err.message)
      } finally {
        setUploading(false)
      }
    }
    inp.click()
  }

  if (loading) return <div style={{ textAlign: 'center', color: C.text3, padding: 40 }}>Loading...</div>

  const tierSlug = tier?.tier_slug || 'bronze'
  const tc = TIER_COLORS[tierSlug]

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Profile card */}
      <div style={{
        background: C.surface, borderRadius: 18, padding: 20, marginBottom: 14,
        border: `1px solid ${C.border}`, textAlign: 'center',
      }}>
        <div onClick={pickAvatar} style={{
          width: 72, height: 72, borderRadius: '50%', margin: '0 auto 8px',
          background: profile?.avatar_url
            ? `url(${profile.avatar_url}) center/cover no-repeat`
            : 'linear-gradient(135deg, #F59E0B, #D97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 700, color: '#fff',
          border: `3px solid ${tc.text}`, cursor: 'pointer',
          position: 'relative',
        }}>
          {!profile?.avatar_url && (profile?.full_name?.[0]?.toUpperCase() || 'C')}
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 24, height: 24, borderRadius: '50%',
            background: C.surface, border: `2px solid ${C.bg}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="5" width="16" height="12" rx="2" stroke="#F59E0B" strokeWidth="1.5"/>
              <circle cx="10" cy="11" r="3" stroke="#F59E0B" strokeWidth="1.5"/>
              <path d="M7 5l1-2h4l1 2" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        {uploading && <div style={{ fontSize: 11, color: C.amber, marginBottom: 4 }}>Uploading...</div>}
        {avatarMsg && <div style={{ fontSize: 11, color: avatarMsg.startsWith('Failed') ? C.red : C.green, marginBottom: 4 }}>{avatarMsg}</div>}
        <div style={{ fontSize: 11, color: C.text3, marginBottom: 6, cursor: 'pointer' }} onClick={pickAvatar}>Tap photo to change</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
          {profile?.full_name || customer?.display_name || 'Customer'}
        </div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{customer?.email || user?.email}</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
          fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
          background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`,
        }}>
          {tier?.tier || 'Bronze Duck'}
        </div>
      </div>

      {/* Account details */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        Account details
      </div>
      <div style={{ background: C.surface, borderRadius: 14, padding: '2px 14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
        {[
          { label: 'Email', value: customer?.email || user?.email || '—' },
          { label: 'Member since', value: customer?.created_at ? new Date(customer.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—' },
          { label: 'Total points', value: tier?.total_points != null ? Math.floor(tier.total_points).toLocaleString() : '0' },
          { label: 'Purchases', value: String(tier?.purchase_count || 0) },
          { label: 'Current tier', value: tier?.tier || 'Bronze Duck' },
        ].map((item, i, arr) => (
          <div key={item.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0',
            borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <div style={{ fontSize: 13, color: C.text3 }}>{item.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Tier progress */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        Tier levels
      </div>
      <div style={{ background: C.surface, borderRadius: 14, padding: '2px 14px', marginBottom: 14, border: `1px solid ${C.border}` }}>
        {[
          { name: 'Bronze Duck', slug: 'bronze', min: 0 },
          { name: 'Silver Duck', slug: 'silver', min: 500 },
          { name: 'Golden Duck', slug: 'gold',   min: 2000 },
          { name: 'Diamond Duck', slug: 'diamond', min: 10000 },
        ].map((t, i, arr) => {
          const reached = (tier?.total_points || 0) >= t.min
          const isCurrent = t.slug === tierSlug
          const ttc = TIER_COLORS[t.slug]
          return (
            <div key={t.slug} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
              borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: reached ? ttc.text : 'rgba(255,255,255,.1)',
                }} />
                <div style={{
                  fontSize: 13, fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? ttc.text : reached ? C.text : C.text3,
                }}>
                  {t.name}
                </div>
                {isCurrent && (
                  <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: ttc.bg, color: ttc.text }}>
                    Current
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: C.text3 }}>{t.min.toLocaleString()} pts</div>
            </div>
          )
        })}
      </div>

      {/* Sign out */}
      <button onClick={handleSignOut} style={{
        width: '100%', padding: 13, borderRadius: 12,
        background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.15)',
        fontSize: 14, fontWeight: 600, color: C.red,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Sign out
      </button>
      <div style={{ height: 20 }} />
    </div>
  )
}
