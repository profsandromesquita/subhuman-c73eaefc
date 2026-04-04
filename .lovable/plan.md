

# Plano: Fase 3 — Filtros avançados de destinatários

## Arquivo ÚNICO: `src/pages/admin/settings/Notifications.tsx`

Nenhuma migration necessária. Nenhuma Edge Function alterada.

---

### Conceito

Adicionar uma seção colapsável "Filtros de destinatários" no formulário, com 3 filtros que refinam a lista de user_ids **antes** do envio. Os filtros são aplicados via queries ao Supabase e se combinam com o filtro de espaço já existente (interseção).

---

### Novos campos no formData

```typescript
filterIncompleteProfile: false,    // boolean
filterPlanType: 'all',             // 'all' | 'none' | 'monthly' | 'yearly' | 'lifetime' | 'trial' | 'promo'
filterRegisteredAfter: '',         // ISO date string ou ''
```

---

### Nova seção na UI: "Filtros de destinatários"

Posição: após o select de Tipo e antes dos toggles de push/email.

Usar um `Collapsible` (shadcn) com trigger "Filtros de destinatários" + ícone `Funnel` (Phosphor).

Conteúdo colapsável com 3 filtros em grid:

1. **Perfil incompleto** — Switch toggle  
   Label: "Apenas perfis incompletos"  
   Sublabel: "Usuários sem nome, cidade ou ocupação preenchidos"

2. **Plano de assinatura** — Select  
   Opções: Todos (default) | Sem assinatura (freemium) | Mensal | Anual | Vitalício | Trial | Promo

3. **Cadastrado após** — Input type="date"  
   Label: "Cadastrado a partir de"  
   Placeholder: vazio (sem filtro)

---

### Lógica de filtragem — nova função `getFilteredUserIds()`

Função assíncrona que retorna `string[]` de user_ids filtrados:

1. **Base**: Se espaço específico → buscar user_ids de `user_space_subscriptions`. Se "todos" → buscar todos os `id` de `profiles`.

2. **Filtro perfil incompleto**: Se ativo, filtrar profiles onde `full_name IS NULL OR city IS NULL OR occupation_type IS NULL`.

3. **Filtro plano**: 
   - `'all'`: sem filtro de plano
   - `'none'`: user_ids que **NÃO** têm registro em `subscriptions` com `status = 'active'`
   - Outros: user_ids que **têm** registro em `subscriptions` com `plan_type = X` e `status = 'active'`

4. **Filtro data de cadastro**: Se preenchido, filtrar `profiles.created_at >= data`.

5. Retornar a interseção de todos os filtros ativos.

---

### Atualização do `recipientCount`

O `useEffect` existente (linhas 78-116) será refatorado para usar `getFilteredUserIds()`. A contagem de usuários será o `.length` do array filtrado. A contagem de dispositivos push será feita com `.in('user_id', filteredIds)`.

O useEffect deve reagir a **todos** os campos de filtro além de `space_id`.

---

### Atualização do `handleSend`

Substituir a lógica atual de buscar user_ids (tanto para in-app quanto para email) por `getFilteredUserIds()`:

- **In-app (espaço = all + sem filtros)**: manter broadcast (`user_id: null`).
- **In-app (qualquer filtro ativo OU espaço específico)**: batch insert com user_ids filtrados.
- **Push**: se filtros ativos, enviar com `userIds` array para a Edge Function (novo campo no payload). Se broadcast sem filtros, manter comportamento atual.
- **Email**: usar os mesmos user_ids filtrados.

**Atenção sobre push**: A Edge Function `send-push-notification` atualmente aceita `broadcast: true` ou `spaceId`. Para suportar filtros, será necessário verificar se ela aceita um array de `userIds`. Se não aceitar, o push continuará como broadcast/space e apenas in-app e email serão filtrados. O push será documentado como limitação desta fase.

---

### Reset dos filtros

No reset do formData (linha 350), incluir os novos campos com valores default.

---

### Importações adicionais

- `Collapsible, CollapsibleContent, CollapsibleTrigger` de `@/components/ui/collapsible`
- `Funnel` de `@phosphor-icons/react`

---

## O que NÃO muda

- Edge Functions (`send-bulk-email`, `send-push-notification`, `send-user-notification`)
- Tabelas do banco (sem migrations)
- Nenhum outro arquivo
- Toggles de push e email (mantidos)
- Histórico de envios (mantido)
- Dialog de confirmação de email (mantido)

