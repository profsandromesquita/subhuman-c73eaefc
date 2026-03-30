

# Plano: Redesign do template de email de notificação admin

## Arquivo único: `supabase/functions/send-user-notification/index.ts`

---

## Edição 1 — Nova função `generatePlainText()` (adicionar após linha 152)

```typescript
function generatePlainText(userName: string | null, title: string, message: string | null): string {
  const greeting = userName ? `Olá, ${userName.split(' ')[0]}!` : 'Olá!';
  return [
    greeting, '', title, '', message || '', '',
    'Ver na plataforma: https://subhumano.ia.br/login', '',
    '---',
    'Você recebeu esta mensagem da equipe Subhumano.',
    'Gerenciar preferências: https://subhumano.ia.br/profile/notifications',
  ].join('\n');
}
```

## Edição 2 — Adicionar `text:` ao Resend SDK (linhas 111-116)

Adicionar campo `text` ao objeto de envio:

```typescript
const plainText = generatePlainText(userName, title, message);

const sendResult = await resend.emails.send({
  from: 'Subhumano <noreply@subhumano.ia.br>',
  to: [userData.user.email],
  subject: `📣 ${title}`,
  html: htmlContent,
  text: plainText,
});
```

## Edição 3 — Reescrever `generateNotificationEmail()` (linhas 154-208)

Substituir integralmente por template com:

- **Layout `<table>`** para compatibilidade Outlook
- **Fundo externo** `#f4f4f5`, container `#ffffff` com `border: 1px solid #e5e7eb`
- **Meta tags** `color-scheme: light` e `supported-color-schemes: light`
- **Header:** logo PNG centralizada width=140, separador `#e5e7eb`, sem subtítulo "Notificação"
- **Greeting:** `#1a1a1a`, 20px, font-weight 600, padding 32px 40px
- **Card:** fundo `#f9fafb`, borda `#e5e7eb`, radius 8px, título 18px bold sem emoji, mensagem `#4b5563` com Markdown + `\n→<br>`
- **CTA:** botão `#000000` com texto `#ffffff`, 14px bold, radius 6px, link `/login`
- **Footer:** separador, texto `#9ca3af` 12px, link preferências `#6b7280` com underline, sem logo, sem mensagem de acolhimento

HTML final:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title} - Subhumano</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" bgcolor="#f4f4f5" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table width="600" bgcolor="#ffffff" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;">
          <!-- HEADER -->
          <tr>
            <td align="center" style="padding:32px 40px 24px;">
              <img src="[LOGO_URL]" width="140" alt="Subhumano" style="display:block;">
            </td>
          </tr>
          <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>
          <!-- GREETING -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0;font-size:20px;font-weight:600;color:#1a1a1a;">${greeting}</p>
            </td>
          </tr>
          <!-- CARD -->
          <tr>
            <td style="padding:16px 40px;">
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:24px;">
                <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#1a1a1a;">${title}</p>
                ${message ? `<p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">${convertMarkdownToHtml(message).replace(/\n/g,'<br>')}</p>` : ''}
              </div>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td align="center" style="padding:24px 40px;">
              <a href="https://subhumano.ia.br/login" style="display:inline-block;background:#000000;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Ver na plataforma</a>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>
          <tr>
            <td align="center" style="padding:24px 40px 32px;">
              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">Você recebeu esta mensagem da equipe Subhumano.</p>
              <a href="https://subhumano.ia.br/profile/notifications" style="font-size:12px;color:#6b7280;text-decoration:underline;">Gerenciar preferências</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## O que NÃO muda

- `convertMarkdownToHtml()` — intacta
- Lógica de auth/JWT/admin check
- Insert na tabela notifications
- Modal admin (Users.tsx)
- Nenhum outro arquivo

## Resumo de edições

| Local | Mudança |
|---|---|
| Linha 106-116 | Adicionar `generatePlainText()` + campo `text:` no Resend |
| Linha 152+ | Nova função `generatePlainText()` |
| Linhas 154-208 | Reescrita completa de `generateNotificationEmail()` |

