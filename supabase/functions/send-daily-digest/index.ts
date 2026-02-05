import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SpaceInfo {
  name: string;
  slug: string;
}

// Helper para extrair SpaceInfo de array ou objeto
function getSpaceInfo(spaces: SpaceInfo | SpaceInfo[] | null): SpaceInfo | null {
  if (!spaces) return null;
  if (Array.isArray(spaces)) return spaces[0] || null;
  return spaces;
}

interface SpaceUpdate {
  id: string;
  title: string;
  space_id: string;
  published_at: string;
  spaces: SpaceInfo | SpaceInfo[] | null;
}

interface UserDigest {
  user_id: string;
  email: string;
  full_name: string | null;
  notify_daily_email: boolean;
  subscribed_spaces: string[];
  updates: SpaceUpdate[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calcular período: últimas 24 horas (de 18h ontem até 18h hoje)
    const now = new Date();
    const endTime = new Date(now);
    endTime.setHours(21, 0, 0, 0); // 21:00 UTC = 18:00 BRT
    
    const startTime = new Date(endTime);
    startTime.setDate(startTime.getDate() - 1);

    console.log(`Fetching updates from ${startTime.toISOString()} to ${endTime.toISOString()}`);

    // Buscar todas as atualizações publicadas no período
    const { data: updates, error: updatesError } = await supabase
      .from('space_updates')
      .select(`
        id,
        title,
        space_id,
        published_at,
        spaces (
          name,
          slug
        )
      `)
      .eq('is_published', true)
      .gte('published_at', startTime.toISOString())
      .lte('published_at', endTime.toISOString())
      .order('published_at', { ascending: false });

    if (updatesError) {
      console.error('Error fetching updates:', updatesError);
      throw updatesError;
    }

    if (!updates || updates.length === 0) {
      console.log('No updates found in the period');
      return new Response(
        JSON.stringify({ message: 'No updates to send', emailsSent: 0, pushSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${updates.length} updates to include in digest`);

    // Agrupar updates por espaço
    const updatesBySpace = updates.reduce((acc, update) => {
      if (!acc[update.space_id]) {
        acc[update.space_id] = [];
      }
      acc[update.space_id].push(update);
      return acc;
    }, {} as Record<string, SpaceUpdate[]>);

    const spaceIds = Object.keys(updatesBySpace);

    // Buscar todos os usuários que têm inscrições em espaços com atualizações
    const { data: subscriptions, error: subError } = await supabase
      .from('user_space_subscriptions')
      .select('user_id, space_id')
      .in('space_id', spaceIds);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No users subscribed to spaces with updates');
      return new Response(
        JSON.stringify({ message: 'No subscribers found', emailsSent: 0, pushSent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Agrupar espaços por usuário
    const userSpaces: Record<string, string[]> = {};
    subscriptions.forEach(sub => {
      if (!userSpaces[sub.user_id]) {
        userSpaces[sub.user_id] = [];
      }
      userSpaces[sub.user_id].push(sub.space_id);
    });

    const userIds = Object.keys(userSpaces);

    // Buscar dados dos usuários (email, nome, preferências)
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // Buscar preferências dos perfis
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, notify_daily_email')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Preparar digest para cada usuário
    const userDigests: UserDigest[] = [];
    
    for (const userId of userIds) {
      const authUser = users.users.find(u => u.id === userId);
      const profile = profilesMap.get(userId);
      
      if (!authUser?.email) continue;
      
      const userSpaceList = userSpaces[userId] || [];
      const userUpdates = userSpaceList.flatMap(spaceId => updatesBySpace[spaceId] || []);
      
      if (userUpdates.length > 0) {
        userDigests.push({
          user_id: userId,
          email: authUser.email,
          full_name: profile?.full_name || null,
          notify_daily_email: profile?.notify_daily_email ?? false,
          subscribed_spaces: userSpaceList,
          updates: userUpdates
        });
      }
    }

    console.log(`Prepared digests for ${userDigests.length} users`);

    let emailsSent = 0;
    let pushSent = 0;
    const errors: string[] = [];

    // Enviar email para usuários que têm notify_daily_email = true
    for (const digest of userDigests.filter(d => d.notify_daily_email)) {
      try {
        const groupedUpdates = digest.updates.reduce((acc, update) => {
          const spaceInfo = getSpaceInfo(update.spaces);
          const spaceName = spaceInfo?.name || 'Espaço';
          if (!acc[spaceName]) {
            acc[spaceName] = [];
          }
          acc[spaceName].push(update);
          return acc;
        }, {} as Record<string, SpaceUpdate[]>);

        const htmlContent = generateEmailHtml(digest.full_name, groupedUpdates);

        const { error: emailError } = await resend.emails.send({
          from: 'Subhumano <noreply@subhumano.ia.br>',
          to: [digest.email],
          subject: `📬 Resumo do dia - ${updates.length} nova${updates.length > 1 ? 's' : ''} atualização${updates.length > 1 ? 'ões' : ''}`,
          html: htmlContent
        });

        if (emailError) {
          console.error(`Email failed for ${digest.email}:`, emailError);
          errors.push(`Email failed for ${digest.email}: ${emailError.message}`);
        } else {
          emailsSent++;
          console.log(`Email sent to ${digest.email}`);
        }
      } catch (error: any) {
        console.error(`Error sending email to ${digest.email}:`, error);
        errors.push(`Error for ${digest.email}: ${error.message}`);
      }
    }

    // Enviar push notification resumo para todos que têm push subscription
    const { data: pushSubscriptions } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .in('user_id', userDigests.map(d => d.user_id));

    if (pushSubscriptions && pushSubscriptions.length > 0) {
      const pushUserIds = [...new Set(pushSubscriptions.map(s => s.user_id))];
      
      // Chamar send-push-notification para enviar resumo
      const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          title: '📬 Resumo do dia',
          body: `${updates.length} nova${updates.length > 1 ? 's' : ''} atualização${updates.length > 1 ? 'ões' : ''} nos seus espaços`,
          url: '/notifications',
          tag: 'daily-digest',
          userIds: pushUserIds
        })
      });

      const pushResult = await pushResponse.json();
      pushSent = pushResult.sent || 0;
      console.log('Push notification result:', pushResult);
    }

    console.log(`Daily digest complete: ${emailsSent} emails, ${pushSent} push notifications`);

    return new Response(
      JSON.stringify({
        message: 'Daily digest sent',
        updatesCount: updates.length,
        usersCount: userDigests.length,
        emailsSent,
        pushSent,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-daily-digest:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateEmailHtml(userName: string | null, groupedUpdates: Record<string, SpaceUpdate[]>): string {
  const greeting = userName ? `Olá, ${userName.split(' ')[0]}!` : 'Olá!';
  
  let updatesHtml = '';
  
  for (const [spaceName, spaceUpdates] of Object.entries(groupedUpdates)) {
    updatesHtml += `
      <div style="margin-bottom: 24px;">
        <h3 style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">${spaceName}</h3>
        ${spaceUpdates.map(update => {
          const spaceInfo = getSpaceInfo(update.spaces);
          return `
          <div style="background-color: #1a1a1a; border-radius: 8px; padding: 16px; margin-bottom: 8px;">
            <a href="https://subhumano.ia.br/spaces/${spaceInfo?.slug || 'home'}/post/${update.id}" style="color: #ffffff; text-decoration: none; font-weight: 500; font-size: 16px;">
              ${update.title}
            </a>
          </div>
        `;
        }).join('')}
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumo do dia - Subhumano</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0;">SUBHUMANO</h1>
      <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Resumo diário</p>
    </div>
    
    <!-- Greeting -->
    <div style="margin-bottom: 24px;">
      <p style="color: #ffffff; font-size: 18px; margin: 0;">${greeting}</p>
      <p style="color: #9ca3af; font-size: 14px; margin-top: 8px;">
        Aqui está o que rolou hoje nos espaços que você segue:
      </p>
    </div>
    
    <!-- Updates -->
    <div style="margin-bottom: 32px;">
      ${updatesHtml}
    </div>
    
    <!-- CTA -->
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="https://subhumano.ia.br" style="display: inline-block; background-color: #ffffff; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Acessar Subhumano
      </a>
    </div>
    
    <!-- Footer -->
    <div style="border-top: 1px solid #262626; padding-top: 24px; text-align: center;">
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        Você está recebendo este email porque habilitou o resumo diário nas suas preferências.
      </p>
      <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">
        <a href="https://subhumano.ia.br/profile/notifications" style="color: #9ca3af;">Gerenciar preferências</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
