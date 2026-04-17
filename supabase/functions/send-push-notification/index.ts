import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLICKEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATEKEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configure web-push
    webpush.setVapidDetails(
      `mailto:${SITE_CONTACT_EMAIL}`,
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    const { title, body: messageBody, url, tag, userIds, spaceId, broadcast } = payload;

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending push notification:', { title, spaceId, userIds: userIds?.length, broadcast });

    // Build subscriptions query
    let subscriptionsQuery = supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth');

    if (userIds && userIds.length > 0) {
      subscriptionsQuery = subscriptionsQuery.in('user_id', userIds);
    } else if (spaceId) {
      // Get space subscribers
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
      
      // Filter by notification preferences
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .in('id', subscriberIds)
        .eq('notify_space_updates', true);

      const notifyUserIds = profiles?.map(p => p.id) || [];
      
      if (notifyUserIds.length === 0) {
        console.log('No users with notifications enabled');
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

    const pushPayload = JSON.stringify({
      title,
      body: messageBody || '',
      url: url || '/',
      tag: tag || 'default'
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    // Send to each subscription
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          pushPayload,
          { TTL: 86400 }
        );
        sent++;
        console.log(`Push sent to ${sub.endpoint.substring(0, 50)}...`);
      } catch (error: any) {
        failed++;
        console.error(`Push failed for ${sub.endpoint.substring(0, 50)}...:`, error.message);
        
        // Mark expired endpoints for cleanup
        if (error.statusCode === 404 || error.statusCode === 410) {
          expiredEndpoints.push(sub.id);
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      console.log(`Removing ${expiredEndpoints.length} expired subscriptions`);
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', expiredEndpoints);
    }

    console.log(`Push results: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        sent, 
        failed, 
        total: subscriptions.length,
        expiredRemoved: expiredEndpoints.length 
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
