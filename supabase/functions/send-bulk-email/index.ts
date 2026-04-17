import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND');

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerId = user.id;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .in('role', ['admin', 'moderator'])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin or moderator required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_ids, title, message } = await req.json();

    if (!Array.isArray(user_ids) || user_ids.length === 0 || !title) {
      return new Response(JSON.stringify({ error: 'user_ids (non-empty array) and title are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resend = new Resend(resendApiKey);
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of user_ids) {
      try {
        const { data: userData, error: userFetchError } = await supabase.auth.admin.getUserById(userId);

        if (userFetchError || !userData?.user?.email) {
          console.error(`Could not fetch email for user ${userId}:`, userFetchError);
          errors.push(`User ${userId}: email not found`);
          failed++;
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .maybeSingle();

        const userName = profile?.full_name || null;
        const htmlContent = generateNotificationEmail(userName, title, message);
        const plainText = generatePlainText(userName, title, message);

        const sendResult = await resend.emails.send({
          from: SITE_FROM_EMAIL,
          to: [userData.user.email],
          subject: `📣 ${title}`,
          html: htmlContent,
          text: plainText,
          tags: [{ name: 'type', value: 'bulk-notification' }],
        });

        if (sendResult.error) {
          console.error(`Resend error for ${userData.user.email}:`, JSON.stringify(sendResult.error));
          errors.push(`${userData.user.email}: ${(sendResult.error as any).message || 'send failed'}`);
          failed++;
        } else {
          sent++;
          console.log(`Email sent to ${userData.user.email}, id: ${sendResult.data?.id}`);
        }
      } catch (err: any) {
        console.error(`Error sending to user ${userId}:`, err);
        errors.push(`User ${userId}: ${err?.message || 'unexpected error'}`);
        failed++;
      }

      // Throttle: 100ms between sends
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Bulk email complete: ${sent} sent, ${failed} failed out of ${user_ids.length}`);

    return new Response(
      JSON.stringify({ sent, failed, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-bulk-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function convertMarkdownToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<br>• $1');
}

function generatePlainText(userName: string | null, title: string, message: string | null): string {
  const greeting = userName ? `Olá, ${userName.split(' ')[0]}!` : 'Olá!';
  return [
    greeting, '', title, '', message || '', '',
    `Ver na plataforma: ${SITE_URL}/login`, '',
    '---',
    'Você recebeu esta mensagem da equipe Subhumano.',
    `Gerenciar preferências: ${SITE_URL}/profile/notifications`,
  ].join('\n');
}

function generateNotificationEmail(userName: string | null, title: string, message: string | null): string {
  const greeting = userName ? `Olá, ${userName.split(' ')[0]}!` : 'Olá!';
  const fontFamily = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const bannerUrl = 'https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/banner-email-subhumano.png';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title} - Subhumano</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${fontFamily};">
  <table width="100%" bgcolor="#f4f4f5" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;">
          <!-- Banner -->
          <tr>
            <td style="padding:16px 0 0;">
              <a href="${SITE_URL}/login" style="text-decoration:none;">
                <img src="${bannerUrl}" width="600" height="200" alt="Subhumano - Ecossistema de Inteligência Artificial" style="display:block;width:100%;height:auto;border-radius:0;">
              </a>
            </td>
          </tr>
          <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0;font-size:20px;font-weight:600;color:#1a1a1a;font-family:${fontFamily};">${greeting}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px;">
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:24px;">
                <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#1a1a1a;font-family:${fontFamily};">${title}</p>
                ${message ? `<p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;font-family:${fontFamily};">${convertMarkdownToHtml(message).replace(/\n/g, '<br>')}</p>` : ''}
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 40px;">
              <a href="${SITE_URL}/login" style="display:inline-block;background:#000000;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;font-family:${fontFamily};">Ver na plataforma</a>
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
                <a href="${SITE_URL}/login" style="color:#6b7280;text-decoration:underline;">Site</a>
                <span style="color:#d1d5db;"> · </span>
                <a href="${SITE_URL}/spaces" style="color:#6b7280;text-decoration:underline;">Espaços</a>
                <span style="color:#d1d5db;"> · </span>
                <a href="${SITE_URL}/channels" style="color:#6b7280;text-decoration:underline;">Canais</a>
                <span style="color:#d1d5db;"> · </span>
                <a href="${SITE_URL}/podcasts" style="color:#6b7280;text-decoration:underline;">Podcasts</a>
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
              <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;font-family:${fontFamily};">Você recebeu esta mensagem da equipe Subhumano.</p>
              <a href="${SITE_URL}/profile/notifications" style="font-size:11px;color:#6b7280;text-decoration:underline;font-family:${fontFamily};">Gerenciar preferências</a>
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