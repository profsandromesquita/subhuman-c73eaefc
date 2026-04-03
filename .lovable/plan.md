

# Plano: Fase 2 — Envio de email em massa na página de notificações

## Arquivo 1 (NOVO): `supabase/functions/send-bulk-email/index.ts`

Edge Function que recebe `{ user_ids, title, message }`, valida auth + role admin/moderator, e envia emails sequencialmente com delay de 100ms.

- Copiar literalmente `generateNotificationEmail()`, `generatePlainText()` e `convertMarkdownToHtml()` do `send-user-notification/index.ts`
- Mesmos `corsHeaders`
- Auth: Bearer token → `anonClient.auth.getUser()` → check `user_roles` admin/moderator
- Loop sequencial: para cada `user_id`, buscar email via `auth.admin.getUserById()`, buscar `full_name` via `profiles`, gerar HTML/text, enviar via Resend com tags `[{ name: 'type', value: 'bulk-notification' }]`
- Delay 100ms entre envios (`await new Promise(resolve => setTimeout(resolve, 100))`)
- Retorno: `{ sent, failed, errors }`

### Config: `supabase/config.toml`

Adicionar:
```toml
[functions.send-bulk-email]
  verify_jwt = false
```

---

## Arquivo 2 (ALTERADO): `src/pages/admin/settings/Notifications.tsx`

### Edição 1 — Novo campo `sendEmail` no formData (linha 51)

Adicionar `sendEmail: false` ao estado inicial e ao reset (linha 265).

### Edição 2 — Novo toggle de email na UI (após linha 465, antes da contagem)

Toggle idêntico ao de push:
```tsx
<div className="flex items-center gap-3 pt-2">
  <Switch id="sendEmail" checked={formData.sendEmail}
    onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked })} />
  <Label htmlFor="sendEmail" className="text-sm cursor-pointer">
    Enviar também por email
    <span className="text-xs text-muted-foreground ml-2">({recipientCount.users} destinatários)</span>
  </Label>
</div>
```

### Edição 3 — Atualizar texto da contagem (linhas 468-475)

Adicionar `{formData.sendEmail && ` + email para ${recipientCount.users} destinatários`}` ao texto.

### Edição 4 — Importar AlertDialog (topo do arquivo)

Importar `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle` de `@/components/ui/alert-dialog`.

Adicionar state: `const [showEmailConfirm, setShowEmailConfirm] = useState(false);`

### Edição 5 — Lógica de confirmação no botão

Substituir o `onClick={handleSend}` do botão por lógica condicional:
- Se `sendEmail` ativo e `recipientCount.users > 10`: abrir dialog de confirmação
- Senão: chamar `handleSend()` direto

Adicionar AlertDialog no JSX com mensagem "Você está prestes a enviar email para X usuários. Deseja continuar?" e botões Cancelar/Confirmar.

### Edição 6 — Envio de email no handleSend (após push, ~linha 263)

Reorganizar o handleSend para que a variável `subscribers` (do bloco space-specific) fique acessível no escopo do email. Após push:

```typescript
if (formData.sendEmail) {
  try {
    let emailUserIds: string[];
    if (formData.space_id === 'all') {
      const { data: allUsers } = await supabase.from('profiles').select('id');
      emailUserIds = allUsers?.map(u => u.id) || [];
    } else {
      emailUserIds = subscribers?.map(s => s.user_id) || [];
    }
    if (emailUserIds.length > 0) {
      const { data: emailResult, error: emailError } = 
        await supabase.functions.invoke('send-bulk-email', {
          body: { user_ids: emailUserIds, title: formData.title, message: formData.message || null }
        });
      // handle result...
    }
  } catch { ... }
}
```

A variável `subscribers` precisa ser elevada para fora do bloco `else` atual — declarar `let subscribers` antes do `if/else` e atribuir dentro do `else`.

### Edição 7 — Toast dinâmico (substituir toasts atuais ~linhas 254-263)

Construir mensagem de toast baseada nos canais usados:
- `pushOk` e `emailOk` como flags
- Toast final: "Notificação enviada!" / "...com push!" / "...com email!" / "...com push e email!"

---

## O que NÃO muda

- `send-user-notification` (template individual)
- `send-push-notification`, `send-daily-digest`
- Lógica de INSERT de notificações in-app (Fase 1)
- Nenhuma tabela do banco
- Nenhum outro arquivo além dos 2 especificados + config.toml

