import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, getProfile } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    try {
      const p = await getProfile(userId)
      setProfile(p)
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let initialDone = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)

      if (newSession?.user) {
        loadProfile(newSession.user.id).then(() => {
          if (!initialDone) {
            initialDone = true
            setLoading(false)
          }
        })
      } else {
        setProfile(null)
        if (!initialDone) {
          initialDone = true
          setLoading(false)
        }
      }
    })

    // Safety net
    const safety = setTimeout(() => {
      if (!initialDone) {
        initialDone = true
        setLoading(false)
      }
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(safety)
    }
  }, [loadProfile])

  const refreshProfile = useCallback(() => {
    if (session?.user) return loadProfile(session.user.id)
  }, [session, loadProfile])

  const isAdmin = profile?.role === 'admin'
  const isEmployee = profile?.role === 'employee'
  const isActive = profile?.is_active === true

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
