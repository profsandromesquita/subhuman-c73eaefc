import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  userIds?: string[];
  spaceId?: string;
  broadcast?: boolean;
}

interface PushSubscription {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Base64 URL encoding helper
function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Base64 URL decoding helper
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

// Convert raw private key to JWK format for ECDSA P-256
async function importPrivateKey(rawPrivateKeyBase64: string): Promise<CryptoKey> {
  const rawKeyBytes = base64UrlDecode(rawPrivateKeyBase64);
  
  // Raw private key is 32 bytes for P-256
  if (rawKeyBytes.length !== 32) {
    throw new Error(`Invalid private key length: ${rawKeyBytes.length} bytes (expected 32)`);
  }

  // Create JWK from raw private key
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: base64UrlEncode(rawKeyBytes),
    // We need x and y coordinates. For VAPID, we can derive them from public key
    // or use a placeholder since we only need to sign, not verify
    x: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    y: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
  };

  try {
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  } catch (e) {
    // If JWK doesn't work, try raw import with PKCS8 wrapper
    // PKCS8 header for EC P-256 private key
    const pkcs8Header = new Uint8Array([
      0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
      0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
      0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
    ]);
    
    const pkcs8Key = new Uint8Array(pkcs8Header.length + rawKeyBytes.length);
    pkcs8Key.set(pkcs8Header);
    pkcs8Key.set(rawKeyBytes, pkcs8Header.length);
    
    return await crypto.subtle.importKey(
      'pkcs8',
      pkcs8Key,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  }
}

// Create VAPID JWT token
async function createVapidJwt(
  endpoint: string, 
  subject: string, 
  privateKeyBase64: string
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: expiration, sub: subject };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const cryptoKey = await importPrivateKey(privateKeyBase64);

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw format for JWT
  const signatureBytes = new Uint8Array(signature);
  let r: Uint8Array;
  let s: Uint8Array;

  // ES256 signatures from Web Crypto are in DER format, need to extract r and s
  if (signatureBytes[0] === 0x30) {
    // DER format
    const rLength = signatureBytes[3];
    const rStart = 4;
    const rEnd = rStart + rLength;
    const sLength = signatureBytes[rEnd + 1];
    const sStart = rEnd + 2;
    
    r = signatureBytes.slice(rStart, rEnd);
    s = signatureBytes.slice(sStart, sStart + sLength);
    
    // Remove leading zeros if present
    while (r.length > 32 && r[0] === 0) r = r.slice(1);
    while (s.length > 32 && s[0] === 0) s = s.slice(1);
    
    // Pad to 32 bytes if needed
    if (r.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(r, 32 - r.length);
      r = padded;
    }
    if (s.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(s, 32 - s.length);
      s = padded;
    }
  } else {
    // Already in raw format (64 bytes)
    r = signatureBytes.slice(0, 32);
    s = signatureBytes.slice(32);
  }

  const rawSignature = new Uint8Array(64);
  rawSignature.set(r);
  rawSignature.set(s, 32);

  return `${unsignedToken}.${base64UrlEncode(rawSignature)}`;
}

// Encrypt payload using Web Push encryption (simplified version)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const payloadBytes = new TextEncoder().encode(payload);
  
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Import subscriber's public key
  const subscriberPublicKeyBytes = base64UrlDecode(p256dhKey);
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriberPublicKeyBytes.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );

  // Export local public key
  const localPublicKeyBuffer = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyBuffer);

  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Decode auth secret
  const authSecretBytes = base64UrlDecode(authSecret);

  // Derive encryption key using HKDF
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(sharedSecret),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // PRK = HKDF-Extract(auth_secret, ecdh_secret)
  const ikm = new Uint8Array(sharedSecret);
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  
  const prkKey = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const prk = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: authSecretBytes.buffer as ArrayBuffer,
      info: authInfo
    },
    prkKey,
    256
  );

  // CEK info
  const cekInfo = new Uint8Array([
    ...new TextEncoder().encode('Content-Encoding: aes128gcm\0'),
  ]);

  const cekKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(prk),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const cek = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: cekInfo
    },
    cekKey,
    128
  );

  // Nonce info
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonce = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: nonceInfo
    },
    cekKey,
    96
  );

  // Encrypt with AES-GCM
  const encryptionKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(cek),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Add padding (RFC 8291)
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload[0] = 0; // padding delimiter
  paddedPayload[1] = 0; // no padding
  paddedPayload.set(payloadBytes, 2);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(nonce),
      tagLength: 128
    },
    encryptionKey,
    paddedPayload
  );

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    localPublicKey
  };
}

// Build aes128gcm encoded body
function buildAes128gcmBody(
  encrypted: Uint8Array,
  salt: Uint8Array,
  localPublicKey: Uint8Array
): Uint8Array {
  // Header: salt (16) + rs (4) + idlen (1) + keyid (65)
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = 65; // keyid length
  header.set(localPublicKey, 21);

  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header, 0);
  body.set(encrypted, header.length);

  return body;
}

// Send push to a specific subscription
async function sendPush(
  subscription: PushSubscription,
  payload: { title: string; body?: string; url?: string; tag?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; endpoint: string; statusCode?: number; error?: string }> {
  try {
    const payloadString = JSON.stringify(payload);

    // Create VAPID JWT
    const jwt = await createVapidJwt(
      subscription.endpoint,
      vapidSubject,
      vapidPrivateKey
    );

    // Encrypt the payload
    const { encrypted, salt, localPublicKey } = await encryptPayload(
      payloadString,
      subscription.p256dh,
      subscription.auth
    );

    // Build the request body
    const body = buildAes128gcmBody(encrypted, salt, localPublicKey);

    // Send the request
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'TTL': '86400',
        'Urgency': 'normal'
      },
      body: body.buffer as ArrayBuffer
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Push failed for ${subscription.endpoint.substring(0, 60)}...:`, response.status, errorText);
      return { 
        success: false, 
        endpoint: subscription.endpoint, 
        statusCode: response.status,
        error: errorText 
      };
    }

    await response.text(); // consume body
    console.log(`Push sent successfully to ${subscription.endpoint.substring(0, 60)}...`);
    return { success: true, endpoint: subscription.endpoint };
  } catch (error: any) {
    console.error(`Push error for ${subscription.endpoint.substring(0, 60)}...:`, error.message);
    return { 
      success: false, 
      endpoint: subscription.endpoint, 
      error: error.message 
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('VAPID public key length:', vapidPublicKey.length);
    console.log('VAPID private key length:', vapidPrivateKey.length);

    const vapidSubject = 'mailto:contato@subhumano.ia.br';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PushPayload = await req.json();
    const { title, body: messageBody, url, tag, userIds, spaceId, broadcast } = body;

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending push notification:', { title, spaceId, userIds: userIds?.length, broadcast });

    // Buscar subscriptions baseado nos critérios
    let subscriptionsQuery = supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth');

    if (userIds && userIds.length > 0) {
      // Enviar para usuários específicos
      subscriptionsQuery = subscriptionsQuery.in('user_id', userIds);
    } else if (spaceId) {
      // Buscar usuários inscritos no espaço
      const { data: spaceSubscribers } = await supabase
        .from('user_space_subscriptions')
        .select('user_id')
        .eq('space_id', spaceId);

      if (!spaceSubscribers || spaceSubscribers.length === 0) {
        console.log('No subscribers for space:', spaceId);
        return new Response(
          JSON.stringify({ sent: 0, message: 'No subscribers for this space' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const subscriberIds = spaceSubscribers.map(s => s.user_id);
      
      // Filtrar por preferências de notificação
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .in('id', subscriberIds)
        .eq('notify_space_updates', true);

      const notifyUserIds = profiles?.map(p => p.id) || [];
      
      if (notifyUserIds.length === 0) {
        console.log('No users with notifications enabled for space:', spaceId);
        return new Response(
          JSON.stringify({ sent: 0, message: 'No users with notifications enabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      subscriptionsQuery = subscriptionsQuery.in('user_id', notifyUserIds);
    } else if (!broadcast) {
      return new Response(
        JSON.stringify({ error: 'Must specify userIds, spaceId, or broadcast=true' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: subscriptions, error: subError } = await subscriptionsQuery;

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found');
      return new Response(
        JSON.stringify({ sent: 0, message: 'No push subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions to notify`);

    // Enviar push para cada subscription
    const pushPayload = {
      title,
      body: messageBody,
      url: url || '/',
      tag: tag || 'subhumano-update'
    };

    const results = await Promise.allSettled(
      subscriptions.map(sub => 
        sendPush(sub, pushPayload, vapidPublicKey, vapidPrivateKey, vapidSubject)
      )
    );

    // Contar sucessos e falhas
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    // Log detailed results
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        if (!r.value.success) {
          console.log(`Subscription ${i} failed:`, r.value.statusCode, r.value.error);
        }
      } else {
        console.log(`Subscription ${i} rejected:`, r.reason);
      }
    });

    // Remover subscriptions que falharam com 404/410 (token expirado)
    const expiredEndpoints = results
      .filter(r => {
        if (r.status !== 'fulfilled') return false;
        const result = r.value;
        return !result.success && (result.statusCode === 404 || result.statusCode === 410);
      })
      .map(r => (r as PromiseFulfilledResult<any>).value.endpoint);

    if (expiredEndpoints.length > 0) {
      console.log(`Removing ${expiredEndpoints.length} expired subscriptions`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }

    console.log(`Push results: ${successful} sent, ${failed} failed, ${expiredEndpoints.length} expired`);

    return new Response(
      JSON.stringify({ 
        sent: successful, 
        failed,
        expired: expiredEndpoints.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
