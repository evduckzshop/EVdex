import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { signIn } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin } = useAuth()

  const from = location.state?.from?.pathname || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    try {
      await signIn(email.trim().toLowerCase(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Incorrect email or password. Please try again.'
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#111318',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="/evdex-logo.png" alt="EVdex" style={{ width: 180, height: 'auto', margin: '0 auto 8px', display: 'block' }} />
          <div style={{ fontSize: 14, color: '#475569', marginTop: 4 }}>
            Business operations platform
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#1E293B', borderRadius: 20,
          padding: '28px 24px', border: '1px solid rgba(255,255,255,.07)',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9', marginBottom: 6 }}>
            Sign in
          </div>
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>
            Use the email and password your admin set up for you.
          </div>

          {error && (
            <div style={{
              background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 18,
              fontSize: 13, color: '#F87171', lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '.07em', textTransform: 'uppercase' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@evdex.com"
              autoComplete="email"
              style={inputStyle}
            />

            <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '.07em', textTransform: 'uppercase', display: 'block', marginTop: 14 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={inputStyle}
            />

            <div style={{ textAlign: 'right', marginTop: 6, marginBottom: 20 }}>
              <Link to="/forgot-password" style={{ fontSize: 12, color: '#3B82F6', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 12,
                background: loading ? '#1E40AF' : '#2563EB',
                border: 'none', fontSize: 15, fontWeight: 600, color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background .15s',
              }}
            >
              {loading && (
                <div style={{
                  width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin .7s linear infinite',
                }} />
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#334155' }}>
          Don't have an account? Contact your admin for an invite.
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } input:focus { outline: none; border-color: #2563EB !important; }`}</style>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '11px 13px', marginTop: 6,
  background: '#162032', border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 11, fontSize: 14, color: '#F1F5F9',
  fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color .2s',
}
