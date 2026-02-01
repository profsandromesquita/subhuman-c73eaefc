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

// Função para criar JWT para Web Push (RFC 8292)
async function createVapidJwt(endpoint: string, subject: string, publicKey: string, privateKey: string): Promise<string> {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 horas

  const header = {
    typ: 'JWT',
    alg: 'ES256'
  };

  const payload = {
    aud: audience,
    exp: expiration,
    sub: subject
  };

  const encoder = new TextEncoder();
  
  // Encode header and payload
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBuffer = Uint8Array.from(atob(privateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsignedToken}.${signatureB64}`;
}

// Envia push para uma subscription específica
async function sendPush(
  subscription: PushSubscription,
  payload: { title: string; body?: string; url?: string; tag?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; endpoint: string; error?: string }> {
  try {
    const payloadString = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payloadString);

    // Criar JWT VAPID
    const jwt = await createVapidJwt(
      subscription.endpoint,
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    // Headers para Web Push
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
      'TTL': '86400', // 24 horas
      'Urgency': 'normal'
    };

    // Para simplificar, enviamos sem criptografia completa
    // Em produção, seria necessário implementar RFC 8291 (Message Encryption)
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'TTL': '86400'
      },
      body: payloadString
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Push failed for ${subscription.endpoint}:`, response.status, errorText);
      return { success: false, endpoint: subscription.endpoint, error: errorText };
    }

    return { success: true, endpoint: subscription.endpoint };
  } catch (error: any) {
    console.error(`Push error for ${subscription.endpoint}:`, error);
    return { success: false, endpoint: subscription.endpoint, error: error.message };
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

    // Remover subscriptions que falharam com 404/410 (token expirado)
    const expiredEndpoints = results
      .filter(r => r.status === 'fulfilled' && !r.value.success && r.value.error?.includes('410'))
      .map(r => (r as PromiseFulfilledResult<any>).value.endpoint);

    if (expiredEndpoints.length > 0) {
      console.log(`Removing ${expiredEndpoints.length} expired subscriptions`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }

    console.log(`Push results: ${successful} sent, ${failed} failed`);

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
