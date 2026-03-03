import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Product mapping: Google Play product IDs -> Subhumano plan types
const PRODUCT_MAP: Record<string, { planType: string; days: number | null }> = {
  'subhumano_monthly':  { planType: 'monthly',  days: 30 },
  'subhumano_yearly':   { planType: 'yearly',   days: 365 },
  'subhumano_lifetime': { planType: 'lifetime',  days: null },
}

const PACKAGE_NAME = 'br.ia.subhumano.twa'

// Subscription notification types
const NOTIFICATION_TYPE = {
  RECOVERED: 1,
  RENEWED: 2,
  CANCELED: 3,
  PURCHASED: 4,
  ON_HOLD: 5,
  IN_GRACE_PERIOD: 6,
  RESTARTED: 7,
  PRICE_CHANGE_CONFIRMED: 8,
  DEFERRED: 9,
  PAUSED: 10,
  PAUSE_SCHEDULE_CHANGED: 11,
  REVOKED: 12,
  EXPIRED: 13,
} as const

// One-time product notification types
const ONE_TIME_NOTIFICATION_TYPE = {
  PURCHASED: 1,
  CANCELED: 2,
} as const

interface PubSubMessage {
  message: {
    data: string // base64-encoded
    messageId: string
    publishTime: string
  }
  subscription: string
}

interface DeveloperNotification {
  version: string
  packageName: string
  eventTimeMillis: string
  subscriptionNotification?: {
    version: string
    notificationType: number
    purchaseToken: string
    subscriptionId: string
  }
  oneTimeProductNotification?: {
    version: string
    notificationType: number
    purchaseToken: string
    sku: string
  }
  testNotification?: {
    version: string
  }
}

/**
 * Get OAuth2 access token from Google service account credentials (JWT)
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

  // Import the private key
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

  // Exchange JWT for access token
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
 * Validate subscription purchase via Google Play Developer API v2
 */
async function validateSubscription(
  accessToken: string,
  packageName: string,
  purchaseToken: string
): Promise<Record<string, unknown>> {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${purchaseToken}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Subscription validation failed: ${res.status} ${errText}`)
  }

  return await res.json()
}

/**
 * Validate one-time product purchase via Google Play Developer API
 */
async function validateProduct(
  accessToken: string,
  packageName: string,
  productId: string,
  purchaseToken: string
): Promise<Record<string, unknown>> {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Product validation failed: ${res.status} ${errText}`)
  }

  return await res.json()
}

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
    // Parse Pub/Sub envelope
    const pubsubMessage: PubSubMessage = await req.json()
    console.log('Received Pub/Sub message:', pubsubMessage.message?.messageId)

    if (!pubsubMessage.message?.data) {
      console.warn('No data in Pub/Sub message')
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Decode base64 notification
    const decodedData = atob(pubsubMessage.message.data)
    const notification: DeveloperNotification = JSON.parse(decodedData)
    console.log('Decoded notification:', JSON.stringify(notification, null, 2))

    // Handle test notifications
    if (notification.testNotification) {
      console.log('Test notification received, acknowledging')
      return new Response(JSON.stringify({ success: true, test: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load service account credentials
    const serviceAccountKeyStr = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_KEY')
    if (!serviceAccountKeyStr) {
      throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_KEY not configured')
    }
    const serviceAccountKey = JSON.parse(serviceAccountKeyStr)

    // Get access token
    const accessToken = await getAccessToken(serviceAccountKey)

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const packageName = notification.packageName || PACKAGE_NAME

    // ─── Handle Subscription Notifications ───
    if (notification.subscriptionNotification) {
      const { notificationType, purchaseToken, subscriptionId } = notification.subscriptionNotification
      console.log(`Subscription notification: type=${notificationType}, subscriptionId=${subscriptionId}`)

      // Validate with Google Play API
      const purchaseDetails = await validateSubscription(accessToken, packageName, purchaseToken)
      console.log('Purchase details:', JSON.stringify(purchaseDetails, null, 2))

      // Extract user ID from obfuscatedExternalAccountId
      const userId = (purchaseDetails as Record<string, unknown>).externalAccountIdentifiers
        ? ((purchaseDetails as Record<string, unknown>).externalAccountIdentifiers as Record<string, string>)?.obfuscatedExternalAccountId
        : null

      if (!userId) {
        console.error('No obfuscatedExternalAccountId found in purchase. Cannot identify user.')
        console.log('Purchase will be stored for manual association. Token:', purchaseToken)
        // Return 200 to not retry - we'll handle via verify-play-purchase fallback
        return new Response(
          JSON.stringify({ success: true, warning: 'No user ID found, awaiting client verification' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Map product to plan
      const productConfig = PRODUCT_MAP[subscriptionId]
      if (!productConfig) {
        console.warn(`Unknown subscriptionId: ${subscriptionId}`)
        return new Response(
          JSON.stringify({ success: true, warning: `Unknown subscriptionId: ${subscriptionId}` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const now = new Date()

      switch (notificationType) {
        case NOTIFICATION_TYPE.PURCHASED:
        case NOTIFICATION_TYPE.RECOVERED:
        case NOTIFICATION_TYPE.RESTARTED: {
          const expiresAt = productConfig.days
            ? new Date(now.getTime() + productConfig.days * 86400000)
            : null

          // Check for existing active Google Play subscription
          const { data: existing } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .eq('provider', 'google_play')
            .eq('status', 'active')
            .maybeSingle()

          if (existing) {
            await supabase
              .from('subscriptions')
              .update({
                expires_at: expiresAt?.toISOString() ?? null,
                external_id: purchaseToken,
                updated_at: now.toISOString(),
              })
              .eq('id', existing.id)
            console.log('Updated existing subscription:', existing.id)
          } else {
            const { error } = await supabase
              .from('subscriptions')
              .insert({
                user_id: userId,
                plan_type: productConfig.planType,
                status: 'active',
                provider: 'google_play',
                external_id: purchaseToken,
                starts_at: now.toISOString(),
                expires_at: expiresAt?.toISOString() ?? null,
              })
            if (error) throw error
            console.log('Created subscription for user:', userId, 'Plan:', productConfig.planType)
          }
          break
        }

        case NOTIFICATION_TYPE.RENEWED: {
          const newExpiry = productConfig.days
            ? new Date(now.getTime() + productConfig.days * 86400000)
            : null

          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              expires_at: newExpiry?.toISOString() ?? null,
              updated_at: now.toISOString(),
            })
            .eq('user_id', userId)
            .eq('provider', 'google_play')
            .in('status', ['active', 'canceled'])

          if (error) throw error
          console.log('Renewed subscription for user:', userId)
          break
        }

        case NOTIFICATION_TYPE.CANCELED: {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              updated_at: now.toISOString(),
            })
            .eq('user_id', userId)
            .eq('provider', 'google_play')
            .eq('status', 'active')

          if (error) throw error
          console.log('Canceled subscription for user:', userId)
          break
        }

        case NOTIFICATION_TYPE.EXPIRED: {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'expired',
              expires_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('user_id', userId)
            .eq('provider', 'google_play')
            .in('status', ['active', 'canceled'])

          if (error) throw error
          console.log('Expired subscription for user:', userId)
          break
        }

        case NOTIFICATION_TYPE.REVOKED: {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'refunded',
              expires_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('user_id', userId)
            .eq('provider', 'google_play')
            .in('status', ['active', 'canceled'])

          if (error) throw error
          console.log('Revoked/refunded subscription for user:', userId)
          break
        }

        default:
          console.log(`Unhandled subscription notification type: ${notificationType}`)
      }
    }

    // ─── Handle One-Time Product Notifications (e.g., lifetime) ───
    if (notification.oneTimeProductNotification) {
      const { notificationType, purchaseToken, sku } = notification.oneTimeProductNotification
      console.log(`One-time product notification: type=${notificationType}, sku=${sku}`)

      if (notificationType === ONE_TIME_NOTIFICATION_TYPE.PURCHASED) {
        // Validate with Google Play API
        const purchaseDetails = await validateProduct(accessToken, packageName, sku, purchaseToken)
        console.log('Product purchase details:', JSON.stringify(purchaseDetails, null, 2))

        const userId = (purchaseDetails as Record<string, string>).obfuscatedExternalAccountId

        if (!userId) {
          console.error('No obfuscatedExternalAccountId in product purchase')
          return new Response(
            JSON.stringify({ success: true, warning: 'No user ID found' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const productConfig = PRODUCT_MAP[sku]
        if (!productConfig) {
          console.warn(`Unknown product SKU: ${sku}`)
          return new Response(
            JSON.stringify({ success: true, warning: `Unknown SKU: ${sku}` }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const now = new Date()
        const expiresAt = productConfig.days
          ? new Date(now.getTime() + productConfig.days * 86400000)
          : null

        const { error } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_type: productConfig.planType,
            status: 'active',
            provider: 'google_play',
            external_id: purchaseToken,
            starts_at: now.toISOString(),
            expires_at: expiresAt?.toISOString() ?? null,
          })

        if (error) throw error
        console.log('Created one-time product subscription for user:', userId, 'Plan:', productConfig.planType)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Google Play webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
