import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../lib/supabase'

const C = {
  bg: '#111318', surface: '#1E293B', surface2: '#162032', surface3: '#0F172A',
  border: 'rgba(255,255,255,.07)', border2: 'rgba(255,255,255,.13)',
  text: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
  accent: '#2563EB', accent2: '#3B82F6',
  green: '#10B981', red: '#F87171', amber: '#F59E0B',
  gold: '#F59E0B', diamond: '#A78BFA',
}

const TIER_COLORS = {
  bronze:  { bg: 'rgba(205,127,50,.12)', text: '#CD7F32', border: 'rgba(205,127,50,.3)' },
  silver:  { bg: 'rgba(192,192,192,.12)', text: '#C0C0C0', border: 'rgba(192,192,192,.3)' },
  gold:    { bg: 'rgba(245,158,11,.12)', text: '#F59E0B', border: 'rgba(245,158,11,.3)' },
  diamond: { bg: 'rgba(167,139,250,.12)', text: '#A78BFA', border: 'rgba(167,139,250,.3)' },
}

const BOTTOM_TABS = [
  { id: 'dashboard', label: 'Home',     path: '/portal',           icon: DashIcon },
  { id: 'history',   label: 'History',  path: '/portal/history',   icon: HistoryIcon },
  { id: 'badges',    label: 'Badges',   path: '/portal/badges',    icon: BadgeIcon },
  { id: 'profile',   label: 'Profile',  path: '/portal/profile',   icon: ProfileIcon },
]

export { C, TIER_COLORS }

export default function CustomerLayout({ children }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div style={{
      width: '100%', maxWidth: 390, height: '100dvh', margin: '0 auto',
      background: C.bg, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Topbar */}
      <div style={{
        padding: '14px 16px 10px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0, background: C.bg,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: -.3 }}>
            EVduckzShop
          </div>
          <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>
            Rewards Portal
          </div>
        </div>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff',
          border: '2px solid rgba(245,158,11,.4)',
        }}>
          {profile?.full_name?.[0]?.toUpperCase() || 'C'}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 14px 90px' }}>
        {children}
      </div>

      {/* Bottom nav */}
      <nav style={{
        display: 'flex', background: C.surface3,
        borderTop: `1px solid ${C.border}`,
        padding: '6px 0 max(16px, env(safe-area-inset-bottom))',
        flexShrink: 0,
      }}>
        {BOTTOM_TABS.map(tab => {
          const active = location.pathname === tab.path
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => navigate(tab.path)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, cursor: 'pointer', border: 'none', background: 'transparent', padding: '4px 2px 0',
            }}>
              <div style={{
                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, background: active ? 'rgba(245,158,11,.15)' : 'transparent',
                transition: 'background .15s',
              }}>
                <Icon color={active ? '#F59E0B' : C.text3} />
              </div>
              <div style={{ fontSize: 9, fontWeight: 500, color: active ? '#F59E0B' : C.text3 }}>
                {tab.label}
              </div>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// Nav icons
function DashIcon({ color }) { return <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg> }
function HistoryIcon({ color }) { return <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg> }
function BadgeIcon({ color }) { return <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.3L10 14.5 5.1 17l.9-5.3-4-3.9 5.5-.8L10 2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></svg> }
function ProfileIcon({ color }) { return <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="4" stroke={color} strokeWidth="1.5"/><path d="M3 18c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg> }
