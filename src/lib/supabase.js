import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

console.log('[EVdex] Supabase init:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// ── Auth helpers ──────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

// ── Profile helpers ───────────────────────────────────────────

export async function getProfile(userId) {
  console.log('[EVdex] getProfile: querying profiles for', userId)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) {
    console.error('[EVdex] getProfile FAILED:', error.message, error.code)
    throw error
  }
  console.log('[EVdex] getProfile success:', data?.role, data?.is_active)
  return data
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// ── Activity log helper ───────────────────────────────────────

export async function logActivity({ actionType, entityType, entityId, summary, beforeData, afterData }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase.from('activity_logs').insert({
    user_id: user.id,
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId || null,
    summary,
    before_data: beforeData || null,
    after_data: afterData || null,
  })
  if (error) console.error('Failed to log activity:', error.message)
}

// ── Avatar upload helper ──────────────────────────────────────

export async function uploadAvatar(userId, file) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // Append cache-buster so the browser fetches the new image
  const url = `${data.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (updateError) throw updateError

  return url
}

// ── Photo upload helper ───────────────────────────────────────

export async function uploadPhoto(userId, file) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(path, file, { upsert: false })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('photos').getPublicUrl(path)
  return data.publicUrl
}

// ── Invite helper (calls Edge Function) ───────────────────────

export async function inviteEmployee({ email, fullName, role = 'employee' }) {
  const { data, error } = await supabase.functions.invoke('invite-employee', {
    body: { email, fullName, role },
  })
  if (error) throw error
  return data
}

// ── Admin: deactivate user ────────────────────────────────────

export async function setUserActive(userId, isActive) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
  if (error) throw error
}
