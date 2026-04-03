

# Plano: Padronizar template de notificação admin com design do digest

## Arquivo: `supabase/functions/send-user-notification/index.ts`

### Edição 1 — Extrair variável fontFamily (linha 159, após greeting)

Adicionar após `const greeting = ...`:

```typescript
const fontFamily = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
```

Remover `const logoUrl = ...` (não será mais usado).

### Edição 2 — Substituir logo por banner (linhas 176-179)

**Remover:**
```html
<tr>
  <td align="center" style="padding:32px 40px 24px;">
    <img src="${logoUrl}" width="140" alt="Subhumano" style="display:block;">
  </td>
</tr>
```

**Inserir:**
```html
<!-- Banner -->
<tr>
  <td style="padding:16px 0 0;">
    <a href="https://subhumano.ia.br/login" style="text-decoration:none;">
      <img src="https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/banner-email-subhumano.png" width="600" height="200" alt="Subhumano - Ecossistema de Inteligência Artificial" style="display:block;width:100%;height:auto;border-radius:0;">
    </a>
  </td>
</tr>
```

### Edição 3 — Aplicar fontFamily em todos os elementos inline

Substituir todas as ocorrências de `font-family:...sans-serif` hardcoded no body e nos elementos internos por `font-family:${fontFamily}`. Elementos afetados: `<body>`, greeting `<p>`, card `<p>` (título e mensagem), botão `<a>`, e todos os elementos do novo footer.

### Edição 4 — Substituir footer simples por footer completo (linhas 200-206)

**Remover** o footer atual (separador + 2 linhas de texto).

**Inserir** o footer idêntico ao do digest (copiado literalmente das linhas 425-467 do digest):

```html
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
    <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;font-family:${fontFamily};">Você recebeu esta mensagem da equipe Subhumano.</p>
    <a href="https://subhumano.ia.br/profile/notifications" style="font-size:11px;color:#6b7280;text-decoration:underline;font-family:${fontFamily};">Gerenciar preferências</a>
  </td>
</tr>
<tr>
  <td align="center" style="padding:16px 40px 32px;">
    <p style="margin:0;font-size:11px;color:#d1d5db;font-family:${fontFamily};">© 2026 Subhumano. Todos os direitos reservados.</p>
  </td>
</tr>
```

### Edição 5 — Adicionar tags ao Resend (linha 103-109)

Adicionar `tags` ao objeto do `resend.emails.send()`:

```typescript
const sendResult = await resend.emails.send({
  from: 'Subhumano <noreply@subhumano.ia.br>',
  to: [userData.user.email],
  subject: `📣 ${title}`,
  html: htmlContent,
  text: plainText,
  tags: [{ name: 'type', value: 'admin-notification' }],
});
```

## O que NÃO muda

- `convertMarkdownToHtml()`, `generatePlainText()`
- Card de conteúdo (#f9fafb com título + mensagem + Markdown)
- Lógica de envio (JWT, validação, inserção de notificação)
- Botão "Ver na plataforma" → /login
- Nenhum outro arquivo

