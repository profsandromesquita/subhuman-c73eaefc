import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TictoPayload {
  status?: string;
  payment_method?: string;
  order?: {
    hash?: string;
    paid_amount?: number;
    installments?: number;
  };
  item?: {
    product_name?: string;
    product_id?: number;
    offer_name?: string;
    offer_id?: number;
    days_of_access?: number | null;
    trial_days?: number | null;
  };
  customer?: {
    email?: string;
    name?: string;
    cpf?: string;
  };
  token?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only accept POST
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method)
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const payload: TictoPayload = await req.json()
    console.log('Received Ticto webhook:', JSON.stringify(payload, null, 2))

    // Extract status from payload
    const status = payload.status?.toLowerCase() || ''
    console.log('Status:', status)

    // Extract customer email
    const customerEmail = payload.customer?.email
    console.log('Customer email:', customerEmail)

    // Extract order hash for idempotency
    const orderHash = payload.order?.hash
    console.log('Order hash:', orderHash)

    // If no email, return success but log warning
    if (!customerEmail) {
      console.warn('No customer email found in payload')
      return new Response(
        JSON.stringify({ success: true, message: 'No customer email, webhook acknowledged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle waiting_payment - just acknowledge without processing
    if (status === 'waiting_payment') {
      console.log('Ignoring waiting_payment event')
      return new Response(
        JSON.stringify({ success: true, message: 'waiting_payment acknowledged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Find user by email in auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('Error fetching users:', userError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = userData.users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase())
    
    if (!user) {
      console.log('User not found for email:', customerEmail)
      // Return 200 to avoid Ticto retrying - user might register later
      return new Response(
        JSON.stringify({ success: true, message: 'User not found, webhook acknowledged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found user:', user.id)

    // Handle different status types
    const isApproved = status === 'approved' || status === 'paid' || status === 'authorized'
    const isCanceled = status === 'canceled' || status === 'cancelled' || status === 'expired'
    const isRefunded = status === 'refunded'

    if (isApproved) {
      console.log('Processing approved payment')

      // Check for existing subscription with same order hash to prevent duplicates
      if (orderHash) {
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('external_id', orderHash)
          .eq('provider', 'ticto')
          .maybeSingle()

        if (existing) {
          console.log('Order already processed:', orderHash)
          return new Response(
            JSON.stringify({ success: true, message: 'Already processed' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Determine plan type based on item info
      const offerName = payload.item?.offer_name?.toLowerCase() || ''
      const daysOfAccess = payload.item?.days_of_access

      // Detect lifetime first
      const isLifetime =
        offerName.includes('vitalic') ||
        offerName.includes('lifetime') ||
        daysOfAccess === null ||
        (daysOfAccess && daysOfAccess >= 36500)

      const isYearly =
        !isLifetime && (
          offerName.includes('anual') ||
          offerName.includes('yearly') ||
          (daysOfAccess && daysOfAccess >= 365)
        )

      const planType = isLifetime ? 'lifetime' : isYearly ? 'yearly' : 'monthly'

      const now = new Date()
      const expiresAt = isLifetime ? null : new Date(now.getTime() + (daysOfAccess || (isYearly ? 365 : 30)) * 86400000)

      // Update existing subscription or create new one
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'ticto')
        .eq('status', 'active')
        .maybeSingle()

      if (existingSub) {
        // Update existing subscription
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            expires_at: expiresAt ? expiresAt.toISOString() : null,
            external_id: orderHash,
            updated_at: now.toISOString(),
          })
          .eq('id', existingSub.id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          throw updateError
        }
        console.log('Updated subscription for user:', user.id)
      } else {
        // Create new subscription
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan_type: planType,
            status: 'active',
            provider: 'ticto',
            external_id: orderHash,
            starts_at: now.toISOString(),
            expires_at: expiresAt ? expiresAt.toISOString() : null,
          })

        if (insertError) {
          console.error('Error creating subscription:', insertError)
          throw insertError
        }
        console.log('Created subscription for user:', user.id, 'Plan:', planType)
      }

    } else if (isCanceled) {
      console.log('Processing cancellation event')

      const { error: cancelError } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('provider', 'ticto')
        .eq('status', 'active')

      if (cancelError) {
        console.error('Error canceling subscription:', cancelError)
        throw cancelError
      }
      console.log('Canceled subscription for user:', user.id)

    } else if (isRefunded) {
      console.log('Processing refund event')

      const { error: refundError } = await supabase
        .from('subscriptions')
        .update({
          status: 'refunded',
          expires_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('provider', 'ticto')
        .in('status', ['active', 'canceled'])

      if (refundError) {
        console.error('Error processing refund:', refundError)
        throw refundError
      }
      console.log('Refunded subscription for user:', user.id)

    } else {
      console.log('Unhandled status type:', status, '- acknowledging webhook')
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
