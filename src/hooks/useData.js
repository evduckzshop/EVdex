import { useState, useRef, useCallback } from 'react'
import { supabase, logActivity } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Generic hook for any table with created_by
function useTable(tableName) {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Mirror of `rows` for the mutation callbacks. Reading state through a ref
  // keeps insert/update/remove referentially stable, so they can safely be
  // used inside effects without re-running them on every data change.
  const rowsRef = useRef(rows)
  const commitRows = useCallback(next => {
    setRows(prev => {
      const value = typeof next === 'function' ? next(prev) : next
      rowsRef.current = value
      return value
    })
  }, [])

  const fetch = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from(tableName).select('*, profiles!created_by(full_name)').order('created_at', { ascending: false })
      Object.entries(filters).forEach(([k, v]) => { query = query.eq(k, v) })
      const { data, error } = await query
      if (error) throw error
      commitRows(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tableName, commitRows])

  // Tables without updated_at/updated_by columns
  const noUpdatedAt = ['contacts']

  const insert = useCallback(async (record) => {
    if (!user) throw new Error('Not authenticated')
    const now = new Date().toISOString()
    const row = { ...record, created_by: user.id, created_at: now }
    if (!noUpdatedAt.includes(tableName)) row.updated_at = now
    const { data, error } = await supabase.from(tableName).insert(row).select().single()
    if (error) throw error
    await logActivity({
      actionType: `create_${tableName.replace(/s$/, '')}`,
      entityType: tableName,
      entityId: data.id,
      summary: `Created ${tableName.replace(/s$/, '')}: ${record.description || record.name || record.id}`,
      afterData: data,
    })
    commitRows(prev => [data, ...prev])
    return data
  }, [user, tableName, commitRows])

  const update = useCallback(async (id, updates) => {
    if (!user) throw new Error('Not authenticated')
    const before = rowsRef.current.find(r => r.id === id)
    const patch = { ...updates }
    if (!noUpdatedAt.includes(tableName)) { patch.updated_by = user.id; patch.updated_at = new Date().toISOString() }
    const { data, error } = await supabase.from(tableName).update(patch).eq('id', id).select().single()
    if (error) throw error
    await logActivity({
      actionType: `update_${tableName.replace(/s$/, '')}`,
      entityType: tableName,
      entityId: id,
      summary: `Updated ${tableName.replace(/s$/, '')}`,
      beforeData: before,
      afterData: data,
    })
    commitRows(prev => prev.map(r => r.id === id ? data : r))
    return data
  }, [user, tableName, commitRows])

  const remove = useCallback(async (id) => {
    if (!user) throw new Error('Not authenticated')
    const before = rowsRef.current.find(r => r.id === id)
    const { error, count } = await supabase.from(tableName).delete().eq('id', id).select()
    if (error) throw error
    // Verify the delete actually happened (RLS can silently block)
    const { data: check } = await supabase.from(tableName).select('id').eq('id', id).maybeSingle()
    if (check) throw new Error('Delete was blocked by permissions. Contact your admin.')
    await logActivity({
      actionType: `delete_${tableName.replace(/s$/, '')}`,
      entityType: tableName,
      entityId: id,
      summary: `Deleted ${tableName.replace(/s$/, '')}`,
      beforeData: before,
    })
    commitRows(prev => prev.filter(r => r.id !== id))
  }, [user, tableName, commitRows])

  return { rows, loading, error, fetch, insert, update, remove }
}

export function useSales() { return useTable('sales') }
export function useBuys() { return useTable('buys') }
export function useTrades() { return useTable('trades') }
export function useExpenses() { return useTable('expenses') }
export function useShows() { return useTable('shows') }
export function useInventory() { return useTable('inventory') }
export function useContacts() { return useTable('contacts') }

// Activity logs — read only
export function useActivityLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async (limit = 50) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, profiles!user_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      setLogs(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { logs, loading, error, fetch }
}
