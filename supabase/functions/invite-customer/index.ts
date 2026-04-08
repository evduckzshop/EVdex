// supabase/functions/invite-customer/index.ts
// Deploy with: supabase functions deploy invite-customer
// Secrets needed: SITE_URL (set via dashboard)
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are auto-injected

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
    // ── 1. Verify caller is authenticated admin ───────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000'

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser()
    if (authError || !caller) throw new Error('Unauthorized')

    // Check caller is admin
    const { data: callerProfile, error: profileError } = await anonClient
      .from('profiles')
      .select('role, full_name')
      .eq('id', caller.id)
      .single()

    if (profileError || callerProfile?.role !== 'admin') {
      throw new Error('Only admins can invite customers')
    }

    // ── 2. Parse & validate request body ──────────────────────
    const { email, fullName, contactId } = await req.json()

    if (!email || !fullName) {
      throw new Error('email and fullName are required')
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format')
    }

    // ── 3. Use service role for privileged operations ─────────
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── 4. Validate contact_id if provided ────────────────────
    if (contactId) {
      const { data: contact, error: contactError } = await adminClient
        .from('contacts')
        .select('id, name')
        .eq('id', contactId)
        .single()

      if (contactError || !contact) {
        throw new Error('Contact not found')
      }

      // Check contact not already linked
      const { data: existingLink } = await adminClient
        .from('customers')
        .select('id')
        .eq('contact_id', contactId)
        .maybeSingle()

      if (existingLink) {
        throw new Error('This contact is already linked to a customer account')
      }
    }

    // ── 5. Create the auth user via invite ────────────────────
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: fullName,
          role: 'customer',
        },
        redirectTo: `${siteUrl}/reset-password`,
      }
    )

    if (inviteError) {
      // Supabase returns a clear error if email already exists
      throw new Error(inviteError.message || 'Failed to send invite')
    }

    const newUserId = inviteData.user?.id
    if (!newUserId) throw new Error('Failed to create user account')

    // ── 6. Wait for the profile trigger to fire ───────────────
    // The handle_new_user() trigger creates the profiles row
    // We need it to exist before inserting into customers (FK)
    let profileReady = false
    for (let i = 0; i < 10; i++) {
      const { data: p } = await adminClient
        .from('profiles')
        .select('id')
        .eq('id', newUserId)
        .maybeSingle()
      if (p) { profileReady = true; break }
      await new Promise(r => setTimeout(r, 500))
    }

    if (!profileReady) {
      // Create profile manually as fallback
      await adminClient.from('profiles').insert({
        id: newUserId,
        full_name: fullName,
        role: 'customer',
      })
    }

    // ── 7. Create customer record ─────────────────────────────
    const customerRecord: Record<string, unknown> = {
      id: newUserId,
      display_name: fullName,
      email: email.toLowerCase(),
    }

    if (contactId) {
      customerRecord.contact_id = contactId
      customerRecord.contact_linked_by = caller.id
      customerRecord.contact_linked_at = new Date().toISOString()
    }

    const { error: customerError } = await adminClient
      .from('customers')
      .insert(customerRecord)

    if (customerError) {
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(newUserId)
      throw new Error('Failed to create customer record: ' + customerError.message)
    }

    // ── 8. Update contact email if provided ───────────────────
    if (contactId) {
      await adminClient
        .from('contacts')
        .update({ email: email.toLowerCase() })
        .eq('id', contactId)
    }

    // ── 9. Log the invite ─────────────────────────────────────
    await adminClient.from('invites').insert({
      email: email.toLowerCase(),
      role: 'customer',
      contact_id: contactId || null,
      invited_by: caller.id,
      accepted: false,
    }).catch(() => {}) // Non-critical, don't fail if invites table has issues

    // ── 10. Log activity ──────────────────────────────────────
    await adminClient.from('activity_logs').insert({
      user_id: caller.id,
      action_type: 'invite_customer',
      entity_type: 'customers',
      entity_id: newUserId,
      summary: `Invited customer: ${fullName} (${email})${contactId ? ' — linked to contact' : ''}`,
      after_data: { email, fullName, contactId },
    }).catch(() => {}) // Non-critical

    // ── 11. Award Bronze Duck badge ───────────────────────────
    const { data: bronzeBadge } = await adminClient
      .from('badge_definitions')
      .select('id')
      .eq('slug', 'bronze_duck')
      .maybeSingle()

    if (bronzeBadge) {
      await adminClient.from('customer_badges').insert({
        customer_id: newUserId,
        badge_id: bronzeBadge.id,
      }).catch(() => {})

      await adminClient.from('reward_events').insert({
        customer_id: newUserId,
        event_type: 'badge_earned',
        points: 0,
        description: 'Welcome badge: Bronze Duck',
      }).catch(() => {})
    }

    // ── 12. Return success ────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        customerId: newUserId,
        message: `Invite sent to ${email}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
