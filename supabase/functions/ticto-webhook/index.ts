import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TictoPayload {
  event?: string;
  type?: string;
  data?: {
    transaction_id?: string;
    order_id?: string;
    subscription_id?: string;
    customer?: {
      email?: string;
      name?: string;
    };
    buyer?: {
      email?: string;
      name?: string;
    };
    product?: {
      id?: string;
      name?: string;
    };
    offer?: {
      code?: string;
    };
    subscription?: {
      plan?: string;
      status?: string;
    };
    payment?: {
      status?: string;
    };
  };
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

    // Extract event type (Ticto may use different field names)
    const eventType = payload.event || payload.type || ''
    console.log('Event type:', eventType)

    // Extract customer email (Ticto may use different structures)
    const customerEmail = payload.data?.customer?.email || payload.data?.buyer?.email
    console.log('Customer email:', customerEmail)

    if (!customerEmail) {
      console.error('No customer email found in payload')
      return new Response(
        JSON.stringify({ error: 'Customer email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract transaction/order ID for idempotency
    const externalId = payload.data?.transaction_id || payload.data?.order_id || payload.data?.subscription_id
    console.log('External ID:', externalId)

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
      // Still return 200 to avoid Ticto retrying - user might register later
      return new Response(
        JSON.stringify({ success: true, message: 'User not found, webhook acknowledged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found user:', user.id)

    // Handle different event types
    const eventTypeLower = eventType.toLowerCase()
    
    // Check for purchase/payment approved events
    const isPurchaseEvent = 
      eventTypeLower.includes('purchase') ||
      eventTypeLower.includes('order') ||
      eventTypeLower.includes('paid') ||
      eventTypeLower.includes('approved') ||
      eventTypeLower.includes('payment') ||
      payload.data?.payment?.status?.toLowerCase() === 'approved' ||
      payload.data?.payment?.status?.toLowerCase() === 'paid'

    // Check for subscription renewal
    const isRenewalEvent = eventTypeLower.includes('renew')

    // Check for cancellation
    const isCancelEvent = 
      eventTypeLower.includes('cancel') ||
      eventTypeLower.includes('expired')

    // Check for refund
    const isRefundEvent = eventTypeLower.includes('refund')

    if (isPurchaseEvent || isRenewalEvent) {
      console.log('Processing purchase/renewal event')

      // Check for existing subscription with same external_id to prevent duplicates
      if (externalId) {
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('external_id', externalId)
          .eq('provider', 'ticto')
          .maybeSingle()

        if (existing) {
          console.log('Transaction already processed:', externalId)
          return new Response(
            JSON.stringify({ success: true, message: 'Already processed' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      // Determine plan type based on product/offer info
      // Default to monthly, can be adjusted based on Ticto offer configuration
      const offerCode = payload.data?.offer?.code || ''
      const productName = payload.data?.product?.name?.toLowerCase() || ''
      const subscriptionPlan = payload.data?.subscription?.plan?.toLowerCase() || ''
      
      // Check if yearly based on various indicators
      const isYearly = 
        offerCode.includes('ANUAL') ||
        offerCode.includes('YEARLY') ||
        productName.includes('anual') ||
        productName.includes('yearly') ||
        subscriptionPlan.includes('anual') ||
        subscriptionPlan.includes('yearly')

      const planType = isYearly ? 'yearly' : 'monthly'
      const daysToAdd = isYearly ? 365 : 30

      const now = new Date()
      const expiresAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)

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
            expires_at: expiresAt.toISOString(),
            external_id: externalId,
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
            external_id: externalId,
            starts_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          })

        if (insertError) {
          console.error('Error creating subscription:', insertError)
          throw insertError
        }
        console.log('Created subscription for user:', user.id, 'Plan:', planType)
      }

    } else if (isCancelEvent) {
      console.log('Processing cancellation event')

      // Update subscription status to canceled
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

    } else if (isRefundEvent) {
      console.log('Processing refund event')

      // Update subscription status to refunded (immediately revoke access)
      const { error: refundError } = await supabase
        .from('subscriptions')
        .update({
          status: 'refunded',
          expires_at: new Date().toISOString(), // Expire immediately
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
      console.log('Unhandled event type:', eventType)
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
