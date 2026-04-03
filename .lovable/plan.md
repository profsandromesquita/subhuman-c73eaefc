

# Plano: Fase 1 — Correções de qualidade na página de notificações em massa

## Arquivo: `src/pages/admin/settings/Notifications.tsx`

Nenhuma migration necessária — a RLS policy "Admins can insert notifications" já permite INSERT com qualquer `user_id`.

---

### Correção 1 — Label "Usuários ativos" → "Usuários com push"

**Linha 248:** Alterar o texto de `Usuários ativos` para `Usuários com push`.

---

### Correção 2 — Notificação in-app respeitar filtro de espaço

**No `handleSend` (linhas 108-115):** Substituir o INSERT único por lógica condicional:

- **Se `space_id === 'all'`:** manter INSERT com `user_id: null` (broadcast).
- **Se espaço específico:**
  1. Buscar `user_id` de `user_space_subscriptions` onde `space_id` = espaço selecionado.
  2. Montar array de objetos com `user_id` individual + `sender_id: (await supabase.auth.getUser()).data.user.id`.
  3. INSERT em batch (um `.insert([...])` com todos os registros).

**Na query do histórico (linhas 76-81):** Ajustar para também mostrar notificações enviadas pelo admin com `user_id` específico. Usar um OR: `user_id IS NULL` **ou** `sender_id = admin_id` (buscar o ID do admin logado). Isso garante que notificações direcionadas a espaços apareçam no histórico.

**No mapeamento de `space_name` do histórico:** Sem alteração — já usa `space_id` para resolver nome.

---

### Correção 3 — Contagem de destinatários antes do envio

**Novo state:**
```typescript
const [recipientCount, setRecipientCount] = useState({ users: 0, devices: 0 });
```

**Novo `useEffect` reagindo a `formData.space_id`:**
- Se `all`: COUNT de `profiles` (total de usuários) + COUNT de `push_subscriptions`.
- Se espaço específico: COUNT de `user_space_subscriptions` filtrado + COUNT de `push_subscriptions` com JOIN nos `user_id` inscritos no espaço (via query dos user_ids primeiro, depois filter `.in('user_id', ids)`).

**Novo elemento entre o toggle de push e o botão (entre linhas 352 e 354):**
```
📊 Esta notificação será enviada para X usuários [inscritos em {nome}] [+ push para Y dispositivos]
```
- Ícone: `Users` do `@phosphor-icons/react`
- Cor: `text-muted-foreground`, `text-sm`
- A parte de push só aparece se `formData.sendPush === true`

---

### Resumo das mudanças

| Correção | O que muda | Linhas afetadas |
|---|---|---|
| 1. Label | Texto "Usuários ativos" → "Usuários com push" | 248 |
| 2. In-app filtrado | `handleSend` INSERT condicional + histórico query ajustada | 76-81, 108-115 |
| 3. Contagem | Novo state + useEffect + elemento informativo | Novo código entre 352-354 |

### O que NÃO muda

- Edge Function `send-push-notification`
- Lógica de push (payload com `spaceId` ou `broadcast`)
- Nenhum outro arquivo
- Nenhuma migration de banco

