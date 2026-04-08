import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { C } from '../../components/layout/CustomerLayout'

const BADGE_EMOJIS = {
  duck: '🦆', star: '⭐', fire: '🔥', trophy: '🏆',
  money: '💰', whale: '🐳', bronze: '🥉', silver: '🥈',
  gold: '🥇', diamond: '💎',
}

export default function PortalBadges() {
  const { user } = useAuth()
  const [allBadges, setAllBadges] = useState([])
  const [earnedIds, setEarnedIds] = useState(new Set())
  const [earnedMap, setEarnedMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadBadges()
  }, [user])

  async function loadBadges() {
    try {
      const [defRes, earnedRes] = await Promise.all([
        supabase.from('badge_definitions')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase.from('customer_badges')
          .select('badge_id, earned_at')
          .eq('customer_id', user.id),
      ])

      if (defRes.data) setAllBadges(defRes.data)
      if (earnedRes.data) {
        setEarnedIds(new Set(earnedRes.data.map(e => e.badge_id)))
        setEarnedMap(Object.fromEntries(earnedRes.data.map(e => [e.badge_id, e.earned_at])))
      }
    } catch (e) {
      console.error('Badges load error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', color: C.text3, padding: 40 }}>Loading...</div>

  const earned = allBadges.filter(b => earnedIds.has(b.id))
  const locked = allBadges.filter(b => !earnedIds.has(b.id))

  const categories = [
    { key: 'milestone', label: 'Milestones' },
    { key: 'spending',  label: 'Spending' },
    { key: 'tier',      label: 'Tier Achievements' },
    { key: 'special',   label: 'Special' },
  ]

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,#1a1520,#1E293B)', borderRadius: 18,
        padding: 18, marginBottom: 14, border: '1px solid rgba(167,139,250,.2)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Achievements
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>
          {earned.length} / {allBadges.length} badges
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
          Keep collecting to unlock them all!
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.06)' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: 'linear-gradient(90deg, #A78BFA, #F59E0B)',
            width: `${allBadges.length ? (earned.length / allBadges.length) * 100 : 0}%`,
            transition: 'width .5s ease',
          }} />
        </div>
      </div>

      {/* Badges by category */}
      {categories.map(cat => {
        const catBadges = allBadges.filter(b => b.category === cat.key)
        if (!catBadges.length) return null
        return (
          <div key={cat.key}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8, marginTop: 4 }}>
              {cat.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {catBadges.map(badge => {
                const isEarned = earnedIds.has(badge.id)
                const earnedAt = earnedMap[badge.id]
                return (
                  <div key={badge.id} style={{
                    background: isEarned ? C.surface : C.surface2,
                    borderRadius: 14, padding: '14px 12px',
                    border: `1px solid ${isEarned ? 'rgba(167,139,250,.2)' : C.border}`,
                    opacity: isEarned ? 1 : 0.5,
                    position: 'relative',
                  }}>
                    {!isEarned && (
                      <div style={{
                        position: 'absolute', top: 10, right: 10,
                        width: 18, height: 18, borderRadius: '50%',
                        background: 'rgba(255,255,255,.05)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                          <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#475569" strokeWidth="1.3"/>
                          <path d="M5 7V5a3 3 0 016 0v2" stroke="#475569" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      </div>
                    )}
                    <div style={{ fontSize: 28, marginBottom: 6 }}>
                      {isEarned ? (BADGE_EMOJIS[badge.icon] || '🏅') : '🔒'}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isEarned ? C.text : C.text3, marginBottom: 2 }}>
                      {badge.name}
                    </div>
                    <div style={{ fontSize: 10, color: C.text3, lineHeight: 1.3 }}>
                      {badge.description}
                    </div>
                    {isEarned && earnedAt && (
                      <div style={{ fontSize: 9, color: '#A78BFA', marginTop: 6, fontWeight: 600 }}>
                        Earned {new Date(earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      <div style={{ height: 16 }} />
    </div>
  )
}
