

# Plano: Corrigir template de email de notificação admin

## Arquivo único: `supabase/functions/send-user-notification/index.ts`

Função `generateNotificationEmail()` (linhas 147-197). 4 bugs + 1 melhoria.

---

## Bug 1 — Quebras de linha (linha 174)

**Antes:** `${message}`
**Depois:** `${message.replace(/\n/g, '<br>')}`

## Bug 2 — Logo no header (linhas 161-163)

**Antes:**
```html
<h1 style="...">SUBHUMANO</h1>
<p style="...">Notificação</p>
```

**Depois:**
```html
<img src="https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/logo-subhumano.png" alt="Subhumano" width="180" style="display: block; margin: 0 auto 8px auto;" />
<p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Notificação</p>
```

## Bug 3 — URL do botão CTA (linha 179)

**Antes:** `href="https://subhumano.ia.br/notificacoes"`
**Depois:** `href="https://subhumano.ia.br/notifications"`

## Bug 4 — URL do footer (linha 190)

**Antes:** `href="https://subhumano.ia.br/perfil/notificacoes"`
**Depois:** `href="https://subhumano.ia.br/profile/notifications"`

## Melhoria — Footer redesenhado (linhas 185-192)

Substituir footer atual por versão com logo pequena (width=120), mensagem de acolhimento, texto original e link corrigido. Tudo centralizado, cores consistentes (#9ca3af para acolhimento, #6b7280 para rodapé).

---

## Não alterado

- Lógica de envio Resend, JWT, validação admin
- Insert na tabela notifications
- Modal admin (Users.tsx)
- Qualquer outro arquivo

