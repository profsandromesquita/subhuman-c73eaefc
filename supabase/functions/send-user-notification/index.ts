import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "resend";

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

    // Validate caller using getUser() — padrão de todas as edge functions do projeto
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

    // Use service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if caller is admin or moderator
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

    const { user_id, title, message, send_email } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'user_id and title are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert in-app notification using service role (bypasses RLS)
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id,
      title,
      message: message || null,
      type: 'announcement',
      sender_id: callerId,
    });

    if (notifError) {
      console.error('Error inserting notification:', notifError);
      throw notifError;
    }

    let emailSent = false;
    let emailErrorMsg: string | null = null;

    // Send email if requested and Resend is configured
    if (send_email && resendApiKey) {
      try {
        // Get user email via admin API
        const { data: userData, error: userFetchError } = await supabase.auth.admin.getUserById(user_id);

        if (userFetchError || !userData?.user?.email) {
          console.error('Could not fetch user email:', userFetchError);
          emailErrorMsg = 'Não foi possível obter o email do usuário';
        } else {
          // Get profile for name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user_id)
            .maybeSingle();

          const userName = profile?.full_name || null;
          const resend = new Resend(resendApiKey);

          const htmlContent = generateNotificationEmail(userName, title, message);

          console.log('Tentando enviar email para:', userData.user.email);
          console.log('API Key (primeiros 12 chars):', resendApiKey.slice(0, 12));

          const sendResult = await resend.emails.send({
            from: 'Subhumano <noreply@subhumano.ia.br>',
            to: [userData.user.email],
            subject: `📣 ${title}`,
            html: htmlContent,
          });

          console.log('Resultado Resend completo:', JSON.stringify(sendResult));

          if (sendResult.error) {
            console.error('Resend error:', JSON.stringify(sendResult.error));
            emailErrorMsg = (sendResult.error as any).message || JSON.stringify(sendResult.error);
          } else {
            emailSent = true;
            console.log(`Email enviado com sucesso para ${userData.user.email}, id: ${sendResult.data?.id}`);
          }
        }
      } catch (emailErr: any) {
        console.error('Error in email sending:', emailErr);
        emailErrorMsg = emailErr?.message || 'Erro inesperado no envio do email';
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailSent, emailError: emailErrorMsg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-user-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateNotificationEmail(userName: string | null, title: string, message: string | null): string {
  const greeting = userName ? `Olá, ${userName.split(' ')[0]}!` : 'Olá!';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Subhumano</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <img src="https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/logo-subhumano.png" alt="Subhumano" width="180" style="display: block; margin: 0 auto 8px auto;" />
      <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Notificação</p>
    </div>

    <!-- Greeting -->
    <div style="margin-bottom: 24px;">
      <p style="color: #ffffff; font-size: 18px; margin: 0;">${greeting}</p>
    </div>

    <!-- Notification card -->
    <div style="background-color: #141414; border: 1px solid #262626; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
      <h2 style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">📣 ${title}</h2>
      ${message ? `<p style="color: #9ca3af; font-size: 15px; line-height: 1.6; margin: 0;">${message.replace(/\n/g, '<br>')}</p>` : ''}
    </div>

    <!-- CTA -->
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="https://subhumano.ia.br/notifications" style="display: inline-block; background-color: #ffffff; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
        Ver na plataforma
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #262626; padding-top: 24px; text-align: center;">
      <img src="https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/logo-subhumano.png" alt="Subhumano" width="120" style="display: block; margin: 0 auto 12px auto;" />
      <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
        Estamos aqui para ajudar você a usar IA com clareza e propósito. Se precisar de algo, conte com a gente.
      </p>
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        Você recebeu esta mensagem da equipe Subhumano.
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
