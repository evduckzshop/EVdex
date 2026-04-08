import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sendPasswordReset, updatePassword } from '../lib/supabase'

const inputStyle = {
  width: '100%', padding: '11px 13px', marginTop: 6,
  background: '#162032', border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 11, fontSize: 14, color: '#F1F5F9',
  fontFamily: 'inherit', boxSizing: 'border-box',
}
const cardStyle = {
  background: '#1E293B', borderRadius: 20,
  padding: '28px 24px', border: '1px solid rgba(255,255,255,.07)',
}
const pageStyle = {
  minHeight: '100vh', background: '#111318',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '24px 20px',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
}
const logoStyle = {
  width: 52, height: 52, borderRadius: 14,
  background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  margin: '0 auto 14px', fontSize: 22, fontWeight: 800, color: '#fff',
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Please enter your email.'); return }
    setLoading(true)
    try {
      await sendPasswordReset(email.trim().toLowerCase())
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/evdex-logo.png" alt="EVdex" style={{ width: 150, height: 'auto', margin: '0 auto', display: 'block' }} />
        </div>
        <div style={cardStyle}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>📧</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#F1F5F9', marginBottom: 8 }}>Check your email</div>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 24 }}>
                We sent a password reset link to <strong style={{ color: '#94A3B8' }}>{email}</strong>.
                Check your inbox and spam folder.
              </div>
              <Link to="/login" style={{ fontSize: 13, color: '#3B82F6', textDecoration: 'none' }}>
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9', marginBottom: 6 }}>Reset password</div>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 22 }}>
                Enter your email and we'll send you a reset link.
              </div>
              {error && (
                <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F87171' }}>
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '.07em', textTransform: 'uppercase' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@evdex.com" style={inputStyle} />
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 11, background: '#2563EB', border: 'none', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', marginTop: 18 }}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 18 }}>
                <Link to="/login" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>← Back to sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await updatePassword(password)
      setDone(true)
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/evdex-logo.png" alt="EVdex" style={{ width: 150, height: 'auto', margin: '0 auto', display: 'block' }} />
        </div>
        <div style={cardStyle}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#F1F5F9' }}>Password updated!</div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>Redirecting you to the app…</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9', marginBottom: 6 }}>Set new password</div>
              <div style={{ fontSize: 13, color: '#475569', marginBottom: 22 }}>Choose a strong password (at least 8 characters).</div>
              {error && (
                <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F87171' }}>
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '.07em', textTransform: 'uppercase' }}>New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '.07em', textTransform: 'uppercase', display: 'block', marginTop: 14 }}>Confirm password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={inputStyle} />
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 11, background: '#2563EB', border: 'none', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', marginTop: 18 }}>
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
