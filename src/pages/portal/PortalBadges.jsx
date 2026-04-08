import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { C } from '../../components/layout/CustomerLayout'
import { BadgeCard } from '../../components/ui/BadgeCard'

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

  const categories = [
    { key: 'milestone', label: 'Milestones' },
    { key: 'spending',  label: 'Collector Progression' },
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
              {catBadges.map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned={earnedIds.has(badge.id)}
                  earnedAt={earnedMap[badge.id]}
                />
              ))}
            </div>
          </div>
        )
      })}
      <div style={{ height: 16 }} />
    </div>
  )
}
