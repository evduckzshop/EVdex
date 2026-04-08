// supabase/functions/invite-customer/index.ts
// Deploy with: supabase functions deploy invite-customer
// Set secrets:
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
//   supabase secrets set SITE_URL=https://your-domain.com

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
    // ── 1. Verify caller is authenticated staff/admin ─────────
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

    // Check caller is admin (only admins can invite customers)
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

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format')
    }

    // ── 3. Use service role for privileged operations ─────────
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── 4. Validate contact_id if provided ────────────────────
    if (contactId) {
      // Check contact exists
      const { data: contact, error: contactError } = await adminClient
        .from('contacts')
        .select('id, name')
        .eq('id', contactId)
        .single()

      if (contactError || !contact) {
        throw new Error('Contact not found')
      }

      // Check contact is not already linked to another customer
      const { data: existingLink } = await adminClient
        .from('customers')
        .select('id')
        .eq('contact_id', contactId)
        .single()

      if (existingLink) {
        throw new Error('This contact is already linked to a customer account')
      }
    }

    // ── 5. Check if email is already registered ───────────────
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const emailTaken = existingUsers?.users?.some(
      (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
    )
    if (emailTaken) {
      throw new Error('An account with this email already exists')
    }

    // ── 6. Create the auth user via invite ────────────────────
    // role is set in user_metadata — the handle_new_user() trigger
    // reads it and sets profiles.role = 'customer'
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: fullName,
          role: 'customer',  // Server-side only — never trust client
        },
        redirectTo: `${siteUrl}/reset-password`,
      }
    )

    if (inviteError) throw inviteError

    const newUserId = inviteData.user?.id
    if (!newUserId) throw new Error('Failed to create user account')

    // ── 7. Create customer record with optional contact link ──
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
      // Rollback: delete the auth user if customer record fails
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

    // ── 9. Log the invite in invites table ────────────────────
    await adminClient.from('invites').insert({
      email: email.toLowerCase(),
      role: 'customer',
      contact_id: contactId || null,
      invited_by: caller.id,
      accepted: false,
    })

    // ── 10. Log activity ──────────────────────────────────────
    await adminClient.from('activity_logs').insert({
      user_id: caller.id,
      action_type: 'invite_customer',
      entity_type: 'customers',
      entity_id: newUserId,
      summary: `Invited customer: ${fullName} (${email})${contactId ? ' — linked to contact' : ''}`,
      after_data: { email, fullName, contactId },
    })

    // ── 11. Award Bronze Duck badge ───────────────────────────
    const { data: bronzeBadge } = await adminClient
      .from('badge_definitions')
      .select('id')
      .eq('slug', 'bronze_duck')
      .single()

    if (bronzeBadge) {
      await adminClient.from('customer_badges').insert({
        customer_id: newUserId,
        badge_id: bronzeBadge.id,
      })

      await adminClient.from('reward_events').insert({
        customer_id: newUserId,
        event_type: 'badge_earned',
        points: 0,
        description: 'Welcome badge: Bronze Duck',
      })
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
