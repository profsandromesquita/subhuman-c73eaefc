import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

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

// Envia push para uma subscription específica usando web-push
async function sendPush(
  subscription: PushSubscription,
  payload: { title: string; body?: string; url?: string; tag?: string }
): Promise<{ success: boolean; endpoint: string; statusCode?: number; error?: string }> {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );

    console.log(`Push sent successfully to ${subscription.endpoint.substring(0, 50)}...`);
    return { success: true, endpoint: subscription.endpoint };
  } catch (error: any) {
    console.error(`Push error for ${subscription.endpoint.substring(0, 50)}...:`, error.statusCode, error.message);
    return { 
      success: false, 
      endpoint: subscription.endpoint, 
      statusCode: error.statusCode,
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

    // Configurar web-push com chaves VAPID
    webpush.setVapidDetails(
      'mailto:contato@subhumano.ia.br',
      vapidPublicKey,
      vapidPrivateKey
    );

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
      subscriptions.map(sub => sendPush(sub, pushPayload))
    );

    // Contar sucessos e falhas
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

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
