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
    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000'

    // ── 1. Verify caller is authenticated admin ───────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    // Use service role client for ALL db operations (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify the JWT token to get the caller's user id
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !caller) throw new Error('Unauthorized: invalid token')

    // Check caller is admin via profiles table (server-side, not client-supplied)
    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (profileError) throw new Error('Failed to verify admin role')
    if (callerProfile?.role !== 'admin') throw new Error('Only admins can invite customers')

    // ── 2. Parse & validate request body ──────────────────────
    const { email, fullName, contactId } = await req.json()

    if (!email || !fullName) throw new Error('email and fullName are required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email format')

    // ── 3. Validate contact_id if provided ────────────────────
    if (contactId) {
      const { data: contact, error: contactError } = await adminClient
        .from('contacts')
        .select('id, name')
        .eq('id', contactId)
        .single()

      if (contactError || !contact) throw new Error('Contact not found')

      const { data: existingLink } = await adminClient
        .from('customers')
        .select('id')
        .eq('contact_id', contactId)
        .maybeSingle()

      if (existingLink) throw new Error('This contact is already linked to a customer account')
    }

    // ── 4. Create the auth user via invite ────────────────────
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name: fullName, role: 'customer' },
        redirectTo: `${siteUrl}/reset-password`,
      }
    )

    if (inviteError) throw new Error(inviteError.message || 'Failed to send invite')

    const newUserId = inviteData.user?.id
    if (!newUserId) throw new Error('Failed to create user account')

    // ── 5. Ensure profile exists ──────────────────────────────
    // The handle_new_user trigger may or may not have fired yet.
    // Check first, then create if missing.
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', newUserId)
      .maybeSingle()

    if (!existingProfile) {
      const { error: profileInsertError } = await adminClient.from('profiles').insert({
        id: newUserId,
        full_name: fullName,
        role: 'customer',
      })
      if (profileInsertError) {
        // If it fails due to race condition (trigger already created it), that's ok
        if (!profileInsertError.message?.includes('duplicate')) {
          await adminClient.auth.admin.deleteUser(newUserId)
          throw new Error('Failed to create profile: ' + profileInsertError.message)
        }
      }
    }

    // ── 6. Create customer record ─────────────────────────────
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
      await adminClient.auth.admin.deleteUser(newUserId)
      throw new Error('Failed to create customer record: ' + customerError.message)
    }

    // ── 7. Update contact email ───────────────────────────────
    if (contactId) {
      await adminClient
        .from('contacts')
        .update({ email: email.toLowerCase() })
        .eq('id', contactId)
        .catch(() => {})
    }

    // ── 8. Log invite + activity (non-critical) ───────────────
    await adminClient.from('invites').insert({
      email: email.toLowerCase(),
      role: 'customer',
      contact_id: contactId || null,
      invited_by: caller.id,
      accepted: false,
    }).catch(() => {})

    await adminClient.from('activity_logs').insert({
      user_id: caller.id,
      action_type: 'invite_customer',
      entity_type: 'customers',
      entity_id: newUserId,
      summary: `Invited customer: ${fullName} (${email})`,
    }).catch(() => {})

    // ── 9. Award Bronze Duck badge (non-critical) ─────────────
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

    // ── 10. Success ───────────────────────────────────────────
    return new Response(
      JSON.stringify({ success: true, customerId: newUserId, message: `Invite sent to ${email}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
