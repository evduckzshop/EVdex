import { useState, useRef, useCallback } from 'react'

const C = { text3: '#475569', accent: '#2563EB' }

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef(null)
  const threshold = 60

  const handleTouchStart = useCallback((e) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      setPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!pulling || refreshing) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0 && scrollRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, 80))
    }
  }, [pulling, refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return
    if (pullDistance >= threshold && onRefresh) {
      setRefreshing(true)
      try {
        await onRefresh()
      } catch (e) {
        console.error('Refresh failed:', e)
      }
      setRefreshing(false)
    }
    setPulling(false)
    setPullDistance(0)
  }, [pulling, pullDistance, onRefresh])

  return (
    <div
      ref={scrollRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative' }}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: refreshing ? 40 : pullDistance, overflow: 'hidden',
          transition: refreshing ? 'none' : 'height .1s',
        }}>
          <div style={{
            width: 20, height: 20,
            border: '2px solid rgba(37,99,235,.2)',
            borderTopColor: C.accent,
            borderRadius: '50%',
            animation: refreshing ? 'spin .7s linear infinite' : 'none',
            opacity: pullDistance >= threshold || refreshing ? 1 : pullDistance / threshold,
            transform: `rotate(${pullDistance * 3}deg)`,
          }} />
        </div>
      )}
      {children}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
