import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, getProfile } from '../lib/supabase'

const AuthContext = createContext(null)

const log = (...args) => console.log('[EVdex Auth]', ...args)
const logErr = (...args) => console.error('[EVdex Auth]', ...args)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    log('loadProfile called for userId:', userId)
    try {
      const p = await getProfile(userId)
      log('loadProfile success:', { id: p?.id, role: p?.role, is_active: p?.is_active })
      setProfile(p)
    } catch (e) {
      logErr('loadProfile FAILED:', e?.message || e)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    log('AuthProvider mounted, calling getSession...')

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logErr('getSession error:', error.message)
      }
      log('getSession result:', session ? `user=${session.user?.id}, expires=${session.expires_at}` : 'no session')
      setSession(session)
      if (session?.user) {
        log('Session found, loading profile...')
        loadProfile(session.user.id).finally(() => {
          log('Initial loadProfile finished, setting loading=false')
          setLoading(false)
        })
      } else {
        log('No session, setting loading=false')
        setLoading(false)
      }
    }).catch((e) => {
      logErr('getSession CRASHED:', e?.message || e)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      log('onAuthStateChange:', event, session ? `user=${session.user?.id}` : 'no session')
      setSession(session)
      if (session?.user) {
        await loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const refreshProfile = useCallback(() => {
    if (session?.user) return loadProfile(session.user.id)
  }, [session, loadProfile])

  const isAdmin = profile?.role === 'admin'
  const isEmployee = profile?.role === 'employee'
  const isActive = profile?.is_active === true

  log('Render — loading:', loading, 'session:', !!session, 'profile:', profile?.role || 'null', 'isActive:', isActive)

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAdmin,
      isEmployee,
      isActive,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
