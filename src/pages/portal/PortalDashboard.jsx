import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { C, TIER_COLORS } from '../../components/layout/CustomerLayout'
import { BadgeChip } from '../../components/ui/BadgeCard'

const TIER_ICONS = {
  bronze:  '🪿',
  silver:  '🦆',
  gold:    '⭐',
  diamond: '💎',
}

export default function PortalDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [tier, setTier] = useState(null)
  const [badges, setBadges] = useState([])
  const [recentEvents, setRecentEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadDashboard()
  }, [user])

  async function loadDashboard() {
    try {
      // Mark account as accepted on first portal visit
      await supabase.from('customers')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', user.id)
        .is('accepted_at', null)

      const [tierRes, badgeRes, eventsRes] = await Promise.all([
        supabase.from('customer_tier').select('*').eq('customer_id', user.id).single(),
        supabase.from('customer_badges')
          .select('*, badge_definitions(*)')
          .eq('customer_id', user.id)
          .order('earned_at', { ascending: false })
          .limit(6),
        supabase.from('reward_events')
          .select('*')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (tierRes.data) setTier(tierRes.data)
      if (badgeRes.data) setBadges(badgeRes.data)
      if (eventsRes.data) setRecentEvents(eventsRes.data)
    } catch (e) {
      console.error('Dashboard load error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', color: C.text3, padding: 40 }}>Loading...</div>

  const tierSlug = tier?.tier_slug || 'bronze'
  const tc = TIER_COLORS[tierSlug]
  const points = Math.floor(tier?.total_points || 0)
  const tierName = tier?.tier || 'Bronze Duck'
  const toNext = tier?.points_to_next_tier ? Math.ceil(tier.points_to_next_tier) : null

  // Progress to next tier
  const tierMins = { bronze: 0, silver: 500, gold: 2000, diamond: 10000 }
  const tierOrder = ['bronze', 'silver', 'gold', 'diamond']
  const currentIdx = tierOrder.indexOf(tierSlug)
  const nextTier = currentIdx < 3 ? tierOrder[currentIdx + 1] : null
  const currentMin = tierMins[tierSlug]
  const nextMin = nextTier ? tierMins[nextTier] : null
  const progress = nextMin ? Math.min(((points - currentMin) / (nextMin - currentMin)) * 100, 100) : 100

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Welcome hero */}
      <div style={{
        background: `linear-gradient(135deg, ${tc.bg.replace('.12', '.25')}, #1E293B)`,
        borderRadius: 18, padding: 18, marginBottom: 14,
        border: `1px solid ${tc.border}`,
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Welcome back
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: -0.5, margin: '4px 0 2px' }}>
          {profile?.full_name || 'Customer'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 16 }}>{TIER_ICONS[tierSlug]}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`,
          }}>
            {tierName}
          </span>
        </div>
      </div>

      {/* Points card */}
      <div style={{
        background: C.surface, borderRadius: 14, padding: 16, marginBottom: 14,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, color: C.text3, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>
              Total points
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: tc.text, letterSpacing: -1 }}>
              {points.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: C.text3, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>
              Purchases
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
              {tier?.purchase_count || 0}
            </div>
          </div>
        </div>

        {/* Progress bar to next tier */}
        {nextTier && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.text3, marginBottom: 4 }}>
              <span>{tierName}</span>
              <span>{toNext != null ? `${toNext.toLocaleString()} pts to ${nextTier.charAt(0).toUpperCase() + nextTier.slice(1)} Duck` : ''}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.06)' }}>
              <div style={{
                height: '100%', borderRadius: 3, background: tc.text,
                width: `${progress}%`, transition: 'width .5s ease',
              }} />
            </div>
          </div>
        )}
        {!nextTier && (
          <div style={{ fontSize: 11, color: tc.text, fontWeight: 600, textAlign: 'center', paddingTop: 4 }}>
            Max tier reached!
          </div>
        )}
      </div>

      {/* How it works */}
      <div style={{
        background: C.surface2, borderRadius: 14, padding: 14, marginBottom: 14,
        border: `1px solid rgba(37,99,235,.1)`,
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          How you earn points
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(16,185,129,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="#10B981" strokeWidth="1.5"/><path d="M10 6.5v7M7 10h6" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>$1 spent = 1 point</div>
            <div style={{ fontSize: 11, color: C.text3 }}>Points are awarded automatically on every purchase</div>
          </div>
        </div>
      </div>

      {/* Recent badges */}
      {badges.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            Your badges
            <span onClick={() => navigate('/portal/badges')} style={{ fontSize: 11, color: C.accent2, fontWeight: 500, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>View all</span>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 14, paddingBottom: 2 }}>
            {badges.map(b => (
              <BadgeChip key={b.id} badge={b.badge_definitions || {}} isEarned={true} />
            ))}
          </div>
        </>
      )}

      {/* Recent activity */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        Recent activity
      </div>
      {recentEvents.length === 0 ? (
        <div style={{ background: C.surface, borderRadius: 12, padding: 20, textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, color: C.text3 }}>No activity yet. Make a purchase to start earning points!</div>
        </div>
      ) : (
        recentEvents.map(e => (
          <div key={e.id} style={{
            background: C.surface, borderRadius: 12, padding: '10px 14px',
            marginBottom: 6, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.description || e.event_type}
              </div>
              <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>
                {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
            {e.points !== 0 && (
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: e.points > 0 ? C.green : C.red,
                flexShrink: 0, marginLeft: 8,
              }}>
                {e.points > 0 ? '+' : ''}{Math.floor(e.points)} pts
              </div>
            )}
          </div>
        ))
      )}
      <div style={{ height: 16 }} />
    </div>
  )
}

