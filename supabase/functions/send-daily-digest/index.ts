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

function extractExcerpt(htmlContent: string | null, maxLength = 120): string {
  if (!htmlContent) return '';
  const text = htmlContent.replace(/<[^>]*>/g, '').trim();
  const decoded = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  if (decoded.length <= maxLength) return decoded;
  return decoded.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

interface SpaceUpdate {
  id: string;
  title: string;
  slug: string;
  space_id: string;
  published_at: string;
  thumbnail_url: string | null;
  content: string | null;
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
    const resendApiKey = Deno.env.get('RESEND');

    if (!resendApiKey) {
      console.error('RESEND not configured');
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
        slug,
        space_id,
        published_at,
        thumbnail_url,
        content,
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
          notify_daily_email: profile?.notify_daily_email ?? true,
          subscribed_spaces: userSpaceList,
          updates: userUpdates
        });
      }
    }

    console.log(`Prepared digests for ${userDigests.length} users`);

    let emailsSent = 0;
    let pushSent = 0;
    const errors: string[] = [];
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

        const userUpdateCount = digest.updates.length;
        const htmlContent = generateEmailHtml(digest.full_name, groupedUpdates);
        const plainText = generatePlainText(digest.full_name, groupedUpdates);

        const { error: emailError } = await resend.emails.send({
          from: 'Subhumano <noreply@subhumano.ia.br>',
          to: [digest.email],
          subject: `📬 Resumo do dia - ${userUpdateCount} ${userUpdateCount === 1 ? 'nova atualização' : 'novas atualizações'}`,
          html: htmlContent,
          text: plainText,
          tags: [
            { name: 'type', value: 'daily-digest' },
          ],
        });

        if (emailError) {
          console.error(`Email failed for ${digest.email}:`, emailError);
          errors.push(`Email failed for ${digest.email}: ${emailError.message}`);
        } else {
          emailsSent++;
          console.log(`Email sent to ${digest.email}`);
        }
        await sleep(250);
      } catch (error: any) {
        console.error(`Error sending email to ${digest.email}:`, error);
        errors.push(`Error for ${digest.email}: ${error.message}`);
        await sleep(250);
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
          body: `${updates.length} ${updates.length === 1 ? 'nova atualização' : 'novas atualizações'} nos seus espaços`,
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

function generatePlainText(userName: string | null, groupedUpdates: Record<string, SpaceUpdate[]>): string {
  const greeting = userName ? `Olá, ${userName.split(' ')[0]}!` : 'Olá!';
  const lines = [greeting, '', 'Novidades nos espaços que você segue:', ''];
  for (const [spaceName, updates] of Object.entries(groupedUpdates)) {
    lines.push(`--- ${spaceName} ---`);
    for (const update of updates) {
      const spaceInfo = getSpaceInfo(update.spaces);
      lines.push(`• ${update.title}`);
      lines.push(`  https://subhumano.ia.br/spaces/${spaceInfo?.slug || 'home'}/post/${update.slug}`);
    }
    lines.push('');
  }
  lines.push('---');
  lines.push('Explorar Subhumano: https://subhumano.ia.br/login');
  lines.push('Gerenciar preferências: https://subhumano.ia.br/profile/notifications');
  return lines.join('\n');
}

function generateEmailHtml(userName: string | null, groupedUpdates: Record<string, SpaceUpdate[]>): string {
  const greeting = userName ? `Olá, ${userName.split(' ')[0]}!` : 'Olá!';
  const logoUrl = 'https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/logo-subhumano.png';
  const fontFamily = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  let updatesHtml = '';

  for (const [spaceName, spaceUpdates] of Object.entries(groupedUpdates)) {
    updatesHtml += `
      <tr>
        <td style="padding:24px 40px 0;">
          <p style="margin:0;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">${spaceName}</p>
        </td>
      </tr>`;

    for (const update of spaceUpdates) {
      const spaceInfo = getSpaceInfo(update.spaces);
      const articleUrl = `https://subhumano.ia.br/spaces/${spaceInfo?.slug || 'home'}/post/${update.slug}`;
      const excerpt = extractExcerpt(update.content);

      const thumbnailCell = update.thumbnail_url
        ? `<td width="160" valign="top" style="padding:0;">
            <a href="${articleUrl}" style="text-decoration:none;">
              <img src="${update.thumbnail_url}" width="160" height="107" alt="" style="display:block;object-fit:cover;border-radius:8px 0 0 8px;">
            </a>
          </td>`
        : `<td width="160" valign="top" style="padding:0;">
            <div style="width:160px;height:107px;background:#e5e7eb;border-radius:8px 0 0 8px;display:table;">
              <div style="display:table-cell;vertical-align:middle;text-align:center;">
                <span style="color:#9ca3af;font-size:12px;font-family:${fontFamily};">Subhumano</span>
              </div>
            </div>
          </td>`;

      updatesHtml += `
      <tr>
        <td style="padding:12px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr>
              ${thumbnailCell}
              <td valign="top" style="padding:12px 16px;">
                <a href="${articleUrl}" style="color:#1a1a1a;text-decoration:none;font-size:15px;font-weight:600;line-height:1.3;display:block;margin-bottom:6px;font-family:${fontFamily};">${update.title}</a>
                ${excerpt ? `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.4;font-family:${fontFamily};">${excerpt}</p>` : ''}
                <a href="${articleUrl}" style="color:#000000;font-size:12px;font-weight:600;text-decoration:none;font-family:${fontFamily};">Ler artigo →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Resumo do dia - Subhumano</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${fontFamily};">
  <table width="100%" bgcolor="#f4f4f5" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;">
          <!-- Banner -->
          <tr>
            <td style="padding:16px 0 0;">
              <a href="https://subhumano.ia.br/login" style="text-decoration:none;">
                <img src="https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/banner-email-subhumano.png" width="600" height="200" alt="Subhumano - Ecossistema de Inteligência Artificial" style="display:block;width:100%;height:auto;border-radius:0;">
              </a>
            </td>
          </tr>
          <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>
          <!-- Greeting -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0;font-size:20px;font-weight:600;color:#1a1a1a;">${greeting}</p>
              <p style="margin:8px 0 0;font-size:15px;color:#4b5563;">Aqui está o que rolou hoje nos espaços que você segue:</p>
            </td>
          </tr>
          <!-- Updates -->
          ${updatesHtml}
          <!-- CTA -->
          <tr>
            <td align="center" style="padding:32px 40px;">
              <a href="https://subhumano.ia.br/login" style="display:inline-block;background:#000000;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Explorar Subhumano</a>
            </td>
          </tr>
          <!-- Footer -->
          <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>
          <tr>
            <td align="center" style="padding:24px 40px 0;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;font-family:${fontFamily};">Subhumano</p>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;font-family:${fontFamily};">Ecossistema de Inteligência Artificial</p>
              <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;font-family:${fontFamily};">Mantido pelo ITIA — Instituto de Tecnologia e Inteligência Artificial</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 40px 0;">
              <p style="margin:0;font-size:12px;font-family:${fontFamily};">
                <a href="https://subhumano.ia.br/login" style="color:#6b7280;text-decoration:underline;">Site</a>
                <span style="color:#d1d5db;"> · </span>
                <a href="https://subhumano.ia.br/spaces" style="color:#6b7280;text-decoration:underline;">Espaços</a>
                <span style="color:#d1d5db;"> · </span>
                <a href="https://subhumano.ia.br/channels" style="color:#6b7280;text-decoration:underline;">Canais</a>
                <span style="color:#d1d5db;"> · </span>
                <a href="https://subhumano.ia.br/podcasts" style="color:#6b7280;text-decoration:underline;">Podcasts</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 40px 0;">
              <p style="margin:0;font-size:12px;font-family:${fontFamily};">
                <a href="https://instagram.com/subhumano.ia" style="color:#6b7280;text-decoration:underline;">Instagram</a>
                <span style="color:#d1d5db;"> · </span>
                <a href="https://youtube.com/@subhumano.ia" style="color:#6b7280;text-decoration:underline;">YouTube</a>
                <span style="color:#d1d5db;"> · </span>
                <a href="https://linkedin.com/company/subhumano" style="color:#6b7280;text-decoration:underline;">LinkedIn</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 40px 0;">
              <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;font-family:${fontFamily};">Você está recebendo este email porque habilitou o resumo diário nas suas preferências.</p>
              <a href="https://subhumano.ia.br/profile/notifications" style="font-size:11px;color:#6b7280;text-decoration:underline;font-family:${fontFamily};">Gerenciar preferências</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 40px 32px;">
              <p style="margin:0;font-size:11px;color:#d1d5db;font-family:${fontFamily};">© 2026 Subhumano. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
