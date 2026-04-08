// Shared badge display component with premium effects
// Used in: PortalBadges, PortalDashboard, ContactDetailPage

const BADGE_EMOJIS = {
  duck: '🦆', star: '⭐', fire: '🔥', trophy: '🏆',
  money: '💰', whale: '🐳', bronze: '🥉', silver: '🥈',
  gold: '🥇', diamond: '💎', shopping: '🛍️', target: '🎯',
  cards: '🃏', sparkles: '✨', gem: '💎', crown: '👑',
  medal: '🏅', grail: '🏆', legendary: '🌟',
}

// Premium effect tiers based on lifetime_spend threshold
function getBadgeEffect(badge) {
  const spend = badge?.threshold?.lifetime_spend
  if (!spend) return null

  if (spend >= 10000) return 'holo'      // Legendary — full rainbow holo
  if (spend >= 5000)  return 'gold-glow'  // Grail Hunter — gold glow
  if (spend >= 2500)  return 'pulse-glow' // Gym Leader — pulsing glow
  if (spend >= 1000)  return 'shine'      // Elite — bright shimmer
  if (spend >= 500)   return 'shimmer'    // Premium — shimmer
  if (spend >= 250)   return 'subtle'     // Enthusiast — subtle shine
  return null                              // Collector ($100) — no effect
}

const C = {
  surface: '#1E293B', surface2: '#162032',
  border: 'rgba(255,255,255,.07)',
  text: '#F1F5F9', text3: '#475569',
}

// CSS keyframes injected once
const STYLES = `
@keyframes badge-shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes badge-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(245,158,11,.2); }
  50% { box-shadow: 0 0 18px rgba(245,158,11,.45); }
}
@keyframes badge-holo {
  0% { border-color: rgba(248,113,113,.5); background-position: 0% center; }
  25% { border-color: rgba(245,158,11,.5); }
  50% { border-color: rgba(16,185,129,.5); background-position: 100% center; }
  75% { border-color: rgba(96,165,250,.5); }
  100% { border-color: rgba(167,139,250,.5); background-position: 0% center; }
}
@keyframes badge-gold-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(245,158,11,.15), 0 0 20px rgba(245,158,11,.08); }
  50% { box-shadow: 0 0 16px rgba(245,158,11,.35), 0 0 30px rgba(245,158,11,.15); }
}
`

let stylesInjected = false
function injectStyles() {
  if (stylesInjected) return
  const el = document.createElement('style')
  el.textContent = STYLES
  document.head.appendChild(el)
  stylesInjected = true
}

function getEffectStyle(effect, isEarned) {
  if (!effect || !isEarned) return {}

  switch (effect) {
    case 'subtle':
      return {
        background: 'linear-gradient(135deg, #1E293B 0%, #1E293B 40%, rgba(255,255,255,.04) 50%, #1E293B 60%, #1E293B 100%)',
        backgroundSize: '400% 100%',
        animation: 'badge-shimmer 4s ease infinite',
      }
    case 'shimmer':
      return {
        background: 'linear-gradient(135deg, #1E293B 0%, #1E293B 35%, rgba(167,139,250,.08) 50%, #1E293B 65%, #1E293B 100%)',
        backgroundSize: '400% 100%',
        animation: 'badge-shimmer 3s ease infinite',
        borderColor: 'rgba(167,139,250,.25)',
      }
    case 'shine':
      return {
        background: 'linear-gradient(135deg, #1E293B 0%, #1E293B 30%, rgba(245,158,11,.1) 50%, #1E293B 70%, #1E293B 100%)',
        backgroundSize: '400% 100%',
        animation: 'badge-shimmer 2.5s ease infinite',
        borderColor: 'rgba(245,158,11,.3)',
      }
    case 'pulse-glow':
      return {
        animation: 'badge-pulse 2s ease-in-out infinite',
        borderColor: 'rgba(245,158,11,.35)',
      }
    case 'gold-glow':
      return {
        animation: 'badge-gold-glow 2.5s ease-in-out infinite',
        borderColor: 'rgba(245,158,11,.4)',
        background: 'linear-gradient(135deg, #1a1a0f, #1E293B)',
      }
    case 'holo':
      return {
        background: 'linear-gradient(135deg, rgba(248,113,113,.06), rgba(245,158,11,.06), rgba(16,185,129,.06), rgba(96,165,250,.06), rgba(167,139,250,.06))',
        backgroundSize: '300% 100%',
        animation: 'badge-holo 4s ease infinite',
        borderWidth: 2,
        borderStyle: 'solid',
      }
    default:
      return {}
  }
}

// Full badge card (for badges page grid)
export function BadgeCard({ badge, isEarned, earnedAt, size = 'normal' }) {
  injectStyles()
  const effect = getBadgeEffect(badge)
  const effectStyle = getEffectStyle(effect, isEarned)

  const isSmall = size === 'small'

  return (
    <div style={{
      background: isEarned ? C.surface : C.surface2,
      borderRadius: isSmall ? 12 : 14,
      padding: isSmall ? '10px 10px' : '14px 12px',
      border: `1px solid ${isEarned ? 'rgba(167,139,250,.2)' : C.border}`,
      opacity: isEarned ? 1 : 0.5,
      position: 'relative',
      overflow: 'hidden',
      ...effectStyle,
    }}>
      {!isEarned && (
        <div style={{
          position: 'absolute', top: isSmall ? 6 : 10, right: isSmall ? 6 : 10,
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
      {effect === 'holo' && isEarned && (
        <div style={{
          position: 'absolute', top: isSmall ? 6 : 10, right: isSmall ? 6 : 10,
          fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
          background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)',
          letterSpacing: '.05em',
        }}>
          HOLO
        </div>
      )}
      <div style={{ fontSize: isSmall ? 22 : 28, marginBottom: isSmall ? 4 : 6 }}>
        {isEarned ? (BADGE_EMOJIS[badge.icon] || '🏅') : '🔒'}
      </div>
      <div style={{ fontSize: isSmall ? 11 : 13, fontWeight: 600, color: isEarned ? C.text : C.text3, marginBottom: 2, lineHeight: 1.2 }}>
        {badge.name}
      </div>
      {!isSmall && (
        <div style={{ fontSize: 10, color: C.text3, lineHeight: 1.3 }}>
          {badge.description}
        </div>
      )}
      {isEarned && earnedAt && !isSmall && (
        <div style={{ fontSize: 9, color: effect === 'holo' ? '#F59E0B' : '#A78BFA', marginTop: 6, fontWeight: 600 }}>
          Earned {new Date(earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      )}
    </div>
  )
}

// Mini badge chip (for dashboard carousel)
export function BadgeChip({ badge, isEarned }) {
  injectStyles()
  const effect = getBadgeEffect(badge)
  const effectStyle = getEffectStyle(effect, isEarned)

  return (
    <div style={{
      flexShrink: 0, background: C.surface, borderRadius: 12,
      padding: '10px 14px', border: `1px solid ${C.border}`,
      textAlign: 'center', minWidth: 80,
      position: 'relative', overflow: 'hidden',
      ...effectStyle,
    }}>
      {effect === 'holo' && isEarned && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          fontSize: 6, fontWeight: 700, padding: '1px 4px', borderRadius: 4,
          background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)',
        }}>
          HOLO
        </div>
      )}
      <div style={{ fontSize: 20, marginBottom: 4 }}>{BADGE_EMOJIS[badge.icon] || '🏅'}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>{badge.name}</div>
    </div>
  )
}

// Badge list for admin contact detail (compact horizontal scroll)
export { BADGE_EMOJIS }
