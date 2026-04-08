import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // ── 1. Verify caller is admin ─────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !caller) throw new Error('Unauthorized')

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') throw new Error('Only admins can delete customers')

    // ── 2. Parse request ──────────────────────────────────────
    const { customerId } = await req.json()
    if (!customerId) throw new Error('customerId is required')

    // ── 3. Verify customer exists ─────────────────────────────
    const { data: customer } = await adminClient
      .from('customers')
      .select('id, display_name, email, contact_id')
      .eq('id', customerId)
      .single()

    if (!customer) throw new Error('Customer not found')

    // ── 4. Delete in order (respecting foreign keys) ──────────

    // 4a. Delete customer badges
    await adminClient.from('customer_badges').delete().eq('customer_id', customerId)

    // 4b. Delete reward events
    await adminClient.from('reward_events').delete().eq('customer_id', customerId)

    // 4c. Clear points columns on any linked sales
    await adminClient.from('sales')
      .update({ points_customer_id: null, points_awarded: 0, points_awarded_at: null })
      .eq('points_customer_id', customerId)

    // 4d. Delete customer record
    await adminClient.from('customers').delete().eq('id', customerId)

    // 4e. Delete profile
    await adminClient.from('profiles').delete().eq('id', customerId)

    // 4f. Delete auth user
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(customerId)
    if (deleteAuthError) throw new Error('Failed to delete auth user: ' + deleteAuthError.message)

    // ── 5. Delete invite record if exists ─────────────────────
    if (customer.email) {
      await adminClient.from('invites').delete().eq('email', customer.email).eq('role', 'customer')
    }

    // ── 6. Log activity ───────────────────────────────────────
    try {
      await adminClient.from('activity_logs').insert({
        user_id: caller.id,
        action_type: 'delete_customer',
        entity_type: 'customers',
        entity_id: customerId,
        summary: `Deleted customer: ${customer.display_name} (${customer.email})`,
      })
    } catch {}

    return new Response(
      JSON.stringify({ success: true, message: `Customer ${customer.display_name} deleted` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
