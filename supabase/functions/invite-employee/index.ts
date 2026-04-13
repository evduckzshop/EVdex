// supabase/functions/invite-employee/index.ts
// Deploy with: supabase functions deploy invite-employee
// Set secret: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key

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
    // Verify the caller is an authenticated admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // Check caller is admin
    const { data: profile, error: profileError } = await anonClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Only admins can invite employees')
    }

    // Parse body
    const { email, fullName, role = 'employee' } = await req.json()
    if (!email || !fullName) throw new Error('email and fullName are required')
    if (!['admin','employee'].includes(role)) throw new Error('Invalid role')

    // Use service role to invite
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role },
      redirectTo: `${Deno.env.get('SITE_URL') ?? 'http://localhost:3000'}/reset-password`,
    })

    if (inviteError) throw inviteError

    // Log the invite in the invites table
    await adminClient.from('invites').insert({
      email,
      role,
      invited_by: user.id,
      accepted: false,
    })

    return new Response(
      JSON.stringify({ success: true, userId: inviteData.user?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    const msg = (error as Error).message || ''
    const safeErrors = [
      'Missing authorization header', 'Unauthorized', 'Only admins can invite employees',
      'email and fullName are required', 'Invalid role',
    ]
    const safeMsg = safeErrors.find(e => msg.includes(e)) || 'An error occurred. Please try again.'
    console.error('invite-employee error:', msg)
    return new Response(
      JSON.stringify({ error: safeMsg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
