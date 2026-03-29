

# Plano: Ajustes finais no template de email + helper Markdown

## Resumo

2 arquivos, 3 correções + 1 melhoria.

---

## Arquivo 1: `supabase/functions/send-user-notification/index.ts`

### Correção 1 — Logo header menor (linha 162)
**Antes:** `width="180"`
**Depois:** `width="80"`

### Correção 2 — CTA aponta para /login (linha 179)
**Antes:** `href="https://subhumano.ia.br/notifications"`
**Depois:** `href="https://subhumano.ia.br/login"`

O link de "Gerenciar preferências" (linha 194) já aponta para `/profile/notifications` — sem alteração necessária.

### Melhoria Parte B — Função `convertMarkdownToHtml` + aplicação na mensagem

Nova função auxiliar antes de `generateNotificationEmail`:

```typescript
function convertMarkdownToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<br>• $1');
}
```

Alterar a injeção da mensagem (linha 174):

**Antes:**
```typescript
${message ? `<p style="...">${message.replace(/\n/g, '<br>')}</p>` : ''}
```

**Depois:**
```typescript
${message ? `<p style="...">${convertMarkdownToHtml(message).replace(/\n/g, '<br>')}</p>` : ''}
```

---

## Arquivo 2: `src/pages/admin/Users.tsx`

### Melhoria Parte A — Helper text abaixo do textarea (após linha 544)

Adicionar após o `</Textarea>`:

```tsx
<p className="text-xs text-muted-foreground mt-1">
  Formatação suportada: **negrito**, *itálico*, - item de lista
</p>
```

---

## Não alterado

- Lógica de envio Resend, JWT, validação admin
- Insert na tabela notifications
- Nenhum outro arquivo ou template

