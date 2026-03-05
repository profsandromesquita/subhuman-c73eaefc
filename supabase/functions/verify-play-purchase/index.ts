import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Same product mapping as google-play-webhook
const PRODUCT_MAP: Record<string, { planType: string; days: number | null }> = {
  'subhumano_monthly':  { planType: 'monthly',  days: 30 },
  'subhumano_yearly':   { planType: 'yearly',   days: 365 },
  'subhumano_lifetime': { planType: 'lifetime',  days: null },
}

const PACKAGE_NAME = 'br.ia.subhumano.twa'

/**
 * Get OAuth2 access token from Google service account credentials
 */
async function getAccessToken(serviceAccountKey: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encoder = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const unsignedToken = `${headerB64}.${payloadB64}`

  const pemContents = serviceAccountKey.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  )

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const jwt = `${unsignedToken}.${signatureB64}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    const errText = await tokenRes.text()
    throw new Error(`Failed to get access token: ${tokenRes.status} ${errText}`)
  }

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

/**
 * Client-side fallback: the app calls this after a purchase is completed
 * Body: { purchaseToken: string, productId: string, isSubscription: boolean }
 * Auth: Bearer token (user must be logged in)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Authenticate user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user with anon client
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await anonClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { purchaseToken, productId, isSubscription = true } = await req.json()

    if (!purchaseToken || !productId) {
      return new Response(
        JSON.stringify({ error: 'Missing purchaseToken or productId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Verifying purchase for user ${user.id}: product=${productId}, token=${purchaseToken}`)

    // Load service account
    const serviceAccountKeyStr = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_KEY')
    if (!serviceAccountKeyStr) {
      throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_KEY not configured')
    }
    const serviceAccountKey = JSON.parse(serviceAccountKeyStr)
    const accessToken = await getAccessToken(serviceAccountKey)

    // Validate purchase with Google
    let purchaseValid = false

    if (isSubscription) {
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${purchaseToken}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) {
        const errText = await res.text()
        console.error('Subscription validation failed:', errText)
        return new Response(
          JSON.stringify({ error: 'Purchase validation failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const details = await res.json()
      // subscriptionState: SUBSCRIPTION_STATE_ACTIVE
      purchaseValid = details.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE'
      console.log('Subscription state:', details.subscriptionState)
    } else {
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/products/${productId}/tokens/${purchaseToken}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) {
        const errText = await res.text()
        console.error('Product validation failed:', errText)
        return new Response(
          JSON.stringify({ error: 'Purchase validation failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const details = await res.json()
      // purchaseState: 0 = Purchased
      purchaseValid = details.purchaseState === 0
      console.log('Purchase state:', details.purchaseState)
    }

    if (!purchaseValid) {
      return new Response(
        JSON.stringify({ error: 'Purchase not valid or not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map product
    const productConfig = PRODUCT_MAP[productId]
    if (!productConfig) {
      return new Response(
        JSON.stringify({ error: `Unknown product: ${productId}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role to write subscription
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const now = new Date()
    const expiresAt = productConfig.days
      ? new Date(now.getTime() + productConfig.days * 86400000)
      : null

    // Check for existing Google Play subscription
    const { data: existing } = await adminClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google_play')
      .eq('status', 'active')
      .maybeSingle()

    if (existing) {
      await adminClient
        .from('subscriptions')
        .update({
          plan_type: productConfig.planType,
          expires_at: expiresAt?.toISOString() ?? null,
          external_id: purchaseToken,
          updated_at: now.toISOString(),
        })
        .eq('id', existing.id)
      console.log('Updated subscription:', existing.id)
    } else {
      // Check for duplicate token
      const { data: dup } = await adminClient
        .from('subscriptions')
        .select('id')
        .eq('external_id', purchaseToken)
        .eq('provider', 'google_play')
        .maybeSingle()

      if (dup) {
        console.log('Purchase token already processed:', purchaseToken)
        return new Response(
          JSON.stringify({ success: true, message: 'Already processed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error } = await adminClient
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type: productConfig.planType,
          status: 'active',
          provider: 'google_play',
          external_id: purchaseToken,
          starts_at: now.toISOString(),
          expires_at: expiresAt?.toISOString() ?? null,
        })
      if (error) throw error
      console.log('Created subscription for user:', user.id)
    }

    return new Response(
      JSON.stringify({ success: true, planType: productConfig.planType }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Verify play purchase error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
