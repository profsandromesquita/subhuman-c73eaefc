

# Plano: Melhorias na Pagina de Eventos

## 1. Auditoria Completa

### 1.1 Estado Atual da Tabela `events`

A tabela possui os campos: `title`, `description`, `event_type`, `modality`, `price`, `is_free`, `cover_url`, `location`, `max_participants`, `checkout_url`, `ticto_offer_id`, `is_published`, `is_active`, `slug`, `created_by`.

**Problemas identificados:**
- Nao existe campo `access_url` (URL da area de membros para quem ja comprou/tem acesso)
- Nao existe campo para definir quais tiers podem acessar o evento (permissoes granulares por evento)
- O `checkout_url` existe mas o botao "Acessar" na pagina publica nao redireciona para nenhum lugar — e um botao sem `onClick`

### 1.2 Estado Atual de `useUserAccess.ts`

A funcao `canAccessEvent` e simplista:
```typescript
if (tier === 'admin') return true;
if (tier === 'lifetime') return true;
if (['monthly', 'yearly'].includes(tier)) return true;
return purchasedEventIds.includes(eventId);
```

Todos os assinantes (monthly/yearly/lifetime) tem acesso a TODOS os eventos indiscriminadamente. Nao ha diferenciacao por `event_type` + `modality`.

### 1.3 Estado Atual de `Events.tsx` (pagina publica)

O `EventCard` usa uma logica binaria:
- `isPurchased || isSubscriber` → botao "Acessar" (sem link, nao faz nada)
- Senao → botao "Adquirir" que redireciona para `/plans`

**Problemas:**
1. Botao "Acessar" nao tem destino (sem `onClick`, sem `href`)
2. Botao "Adquirir" redireciona para `/plans` em vez de usar o `checkout_url` do proprio evento
3. Nao diferencia permissoes por tipo/modalidade do evento
4. Eventos passados aparecem misturados sem separacao visual

### 1.4 Estado Atual do Admin (`admin/Events.tsx`)

O formulario ja tem campos para `checkout_url` e `ticto_offer_id`, mas:
- Nao ha campo `access_url` (link da area de membros)
- Nao ha campo para definir quais tiers podem acessar

### 1.5 Regras de Acesso Solicitadas (Matriz)

| Tier | Visualizar/Ler | Tipos com Acesso | Modalidades com Acesso | Compra |
|---|---|---|---|---|
| Freemium | Sim | Nenhum | Nenhum | Habilitada |
| Promo (coupon) | Sim | Nenhum | Nenhum | Habilitada |
| Mensal | Sim | Palestra, Workshop, Curso | Online gravado | Habilitada (outros) |
| Anual | Sim | Palestra, Workshop, Curso, Mentoria grupo | Online gravado, ao vivo, hibrido | Habilitada (outros) |
| Vitalicio | Sim | Palestra, Workshop, Curso, Mentoria grupo, Mentoria individual | Online gravado, ao vivo, hibrido, presencial | Habilitada (outros) |
| Admin/Mod | Sim | Todos | Todos | - |

### 1.6 Riscos da Alteracao

1. **Banco de dados**: Precisamos adicionar coluna `access_url` na tabela `events`. Migracao simples, sem risco a dados existentes.
2. **`useUserAccess`**: A funcao `canAccessEvent` precisa receber o evento inteiro (tipo + modalidade) em vez de apenas o `eventId`. Isso muda a assinatura da funcao e impacta todos os consumidores.
3. **`EventCard`**: Precisa de refatoracao significativa dos botoes.
4. **Admin form**: Adicionar campo `access_url` — baixo risco.
5. **Outros consumidores de `canAccessEvent`**: Preciso verificar quem mais usa.

---

## 2. Plano de Implementacao

### Etapa 1: Migracao de Banco — Adicionar `access_url` a tabela `events`

```sql
ALTER TABLE public.events ADD COLUMN access_url text;
```

Adiciona o campo para o link da area de membros (ex: Ticto). Sem breaking changes.

Tambem adicionar novas opcoes de `event_type` e `modality` que estao faltando para cobrir a matriz de permissoes:

Atualmente temos:
- `event_type`: workshop, palestra, live, aula_ao_vivo, mentoria, curso
- `modality`: online, presencial, hibrido

Precisamos diferenciar "mentoria em grupo" de "mentoria individual" e "online gravado" de "online ao vivo". Opcoes:
- Adicionar `event_type`: `mentoria_grupo`, `mentoria_individual` (substituindo o generico `mentoria`)
- Adicionar `modality`: `online_gravado`, `online_ao_vivo` (substituindo o generico `online`)

### Etapa 2: Refatorar `useUserAccess.ts` — `canAccessEvent` granular

Mudar a assinatura de `canAccessEvent(eventId: string)` para `canAccessEvent(eventId: string, eventType?: string, modality?: string)`.

Nova logica:

```typescript
canAccessEvent = (eventId, eventType, modality) => {
  if (tier === 'admin') return true;

  // Comprou o evento individualmente
  if (purchasedEventIds.includes(eventId)) return true;

  // Freemium, coupon, student, trial: sem acesso por tier
  if (['freemium', 'coupon', 'student', 'trial'].includes(tier)) return false;

  // Monthly: palestras, workshops, cursos online gravados
  if (tier === 'monthly') {
    const allowedTypes = ['palestra', 'workshop', 'curso'];
    const allowedModalities = ['online_gravado'];
    return allowedTypes.includes(eventType) && allowedModalities.includes(modality);
  }

  // Yearly: + mentoria_grupo, + online_ao_vivo, hibrido
  if (tier === 'yearly') {
    const allowedTypes = ['palestra', 'workshop', 'curso', 'mentoria_grupo'];
    const allowedModalities = ['online_gravado', 'online_ao_vivo', 'hibrido'];
    return allowedTypes.includes(eventType) && allowedModalities.includes(modality);
  }

  // Lifetime: tudo
  if (tier === 'lifetime') return true;

  return false;
};
```

### Etapa 3: Atualizar `Events.tsx` — Pagina publica modernizada

**3a. Refatorar `EventCard` com logica de botoes correta:**

- Se evento passado: botao "Encerrado" (disabled) — manter
- Se usuario tem acesso (via `canAccessEvent` com tipo/modalidade):
  - Se `access_url` existe: botao "Acessar" redireciona para `access_url`
  - Se `session_url` na proxima sessao: botao "Acessar" redireciona para `session_url`
  - Senao: botao "Acessar" disabled com texto "Em breve"
- Se usuario NAO tem acesso:
  - Se `checkout_url` existe: botao "Adquirir – R$ X" abre `checkout_url` com `?src={userId}&email={userEmail}` (padrao Ticto)
  - Se `checkout_url` nao existe: botao "Em breve" (disabled)

**3b. Separacao visual: Futuros vs Passados**

Dividir a lista em duas secoes:
- "Proximos Eventos" — eventos com sessoes futuras (exibidos primeiro, destaque)
- "Eventos Anteriores" — eventos passados, estilo mais sutil (opacidade reduzida), gerando autoridade/historico

**3c. Design moderno mobile-first:**

- Cards com cover image em aspect-ratio 16:9
- Badge de tipo + modalidade
- Titulo, descricao (2 linhas max)
- Data formatada
- Preco ou "Incluso no plano"
- Botoes de acao contextuais
- Secao "Eventos Anteriores" com contador (ex: "12 eventos realizados")

### Etapa 4: Atualizar Admin `admin/Events.tsx`

**4a. Adicionar campo `access_url` ao formulario:**

Novo campo "URL da area de membros" abaixo do `checkout_url`, com placeholder "https://members.ticto.app/..."

**4b. Atualizar opcoes de tipo e modalidade:**

Adicionar as novas opcoes de `event_type` e `modality` nos selects do formulario admin:

```
typeOptions: + mentoria_grupo ("Mentoria em Grupo"), + mentoria_individual ("Mentoria Individual")
modalityOptions: online_gravado ("Online Gravado"), online_ao_vivo ("Online ao Vivo"), presencial, hibrido
```

**4c. Atualizar `useAdminEvents.ts`:**

Incluir `access_url` no payload de create/update.

### Etapa 5: Atualizar hooks e tipos

- `useAdminEvents.ts`: Adicionar `access_url` ao `CreateEventInput`
- `useEvents.ts`: Sem mudanca (ja faz `select("*")`)
- Atualizar labels nos dicionarios de ambas as paginas (publica e admin)

### Etapa 6: Atualizar `Events.tsx` na pagina publica — labels e filtros

Adicionar as novas opcoes de tipo e modalidade nos filtros da pagina publica:

```
typeOptions: workshop, palestra, curso, mentoria_grupo, mentoria_individual, live, aula_ao_vivo
modalityOptions: online_gravado, online_ao_vivo, presencial, hibrido
```

---

## 3. Arquivos Impactados

| Arquivo | Tipo de Mudanca |
|---|---|
| `supabase/migrations/` | Nova migracao: `access_url` |
| `src/hooks/useUserAccess.ts` | Refatorar `canAccessEvent` |
| `src/pages/Events.tsx` | Redesign completo dos cards e logica de botoes |
| `src/pages/admin/Events.tsx` | Adicionar campo `access_url`, novas opcoes tipo/modalidade |
| `src/hooks/useAdminEvents.ts` | Adicionar `access_url` ao payload |

**Arquivos NAO impactados:**
- `useSubscription`, `useAuth`, `AuthContext` — nao sao alterados
- `Plans.tsx` — nao e alterado (ja tem seus proprios links)
- `BottomNav`, `AppLayout` — nao sao alterados
- RLS policies — sem mudanca (campo novo e apenas texto, sem restricao)
- Webhooks (Ticto, Google Play) — nao sao alterados

## 4. Prerequisitos

Antes de implementar, preciso confirmar:
- Os nomes exatos das novas categorias de tipo/modalidade estao corretos? (mentoria_grupo, mentoria_individual, online_gravado, online_ao_vivo)
- O workshop atual "Crie seu site em 6h" ja tem um link de area de membros na Ticto para preencher no `access_url`?

