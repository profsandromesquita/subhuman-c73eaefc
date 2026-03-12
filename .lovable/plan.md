

# Permissões de Podcast (Live) + Campos youtube_url e meet_url

## Contexto

O usuário quer tratar eventos do tipo `live` como "podcasts" e controlar 3 níveis de acesso:
1. **Assistir** (YouTube) -- todos os tiers autenticados
2. **Participar** (Meet como ouvinte) -- a partir do monthly
3. **Convidado/Entrevistador** (Meet como guest) -- yearly+ 

Os flags `canAccessFreeEvents` e `canAccessAllOnlineEvents` existem no `TIER_PERMISSIONS` mas nunca são usados no `canAccessEvent`. Serão removidos e substituídos por novas permissões de podcast.

## Mudanças

### 1. Migração: Adicionar `youtube_url` e `meet_url` na tabela `events`

```sql
ALTER TABLE public.events ADD COLUMN youtube_url text;
ALTER TABLE public.events ADD COLUMN meet_url text;
```

### 2. Admin Events (`src/pages/admin/Events.tsx`)

Adicionar campos "URL do YouTube" e "URL do Google Meet" no formulário, após o campo `access_url`. Adicionar ao `formData`, ao `resetForm`, ao `handleSubmit` e ao `openEditDialog`.

### 3. `useUserAccess.ts` -- Substituir permissões

Remover `canAccessFreeEvents` e `canAccessAllOnlineEvents` da interface e do `TIER_PERMISSIONS`.

Adicionar 3 novas permissões:

| Permissão | freemium | coupon | student | trial | monthly | yearly | lifetime | admin |
|---|---|---|---|---|---|---|---|---|
| `canWatchPodcast` | true | true | true | true | true | true | true | true |
| `canJoinPodcast` | false | false | false | false | true | true | true | true |
| `canBeGuestOnPodcast` | false | false | false | false | false | true | true | true |

Atualizar `canAccessEvent` para incluir `live` nos tipos permitidos:

- **Monthly**: tipos `['palestra', 'workshop', 'curso', 'live']`, modalidades `['online_ao_vivo', 'online_gravado']`
- **Yearly**: tipos `['palestra', 'workshop', 'curso', 'mentoria_grupo', 'live']`, modalidades `['online_gravado', 'online_ao_vivo', 'hibrido']`
- **Lifetime/Admin**: sem mudança (já têm acesso total)

### 4. `src/pages/Events.tsx` -- Botões de podcast no EventCard

Para eventos com `event_type === 'live'`, renderizar botões condicionais:

- **Assistir** (ícone YoutubeLogo): visível se `canWatchPodcast` e `youtube_url` existir. Abre `youtube_url`.
- **Participar** (ícone VideoCamera): visível se `canJoinPodcast` e `meet_url` existir. Abre `meet_url`. Se não tem permissão, mostra botão desabilitado com cadeado.
- **Convidado** (ícone Microphone): visível se `canBeGuestOnPodcast` e `meet_url` existir. Visualmente diferenciado.

Para eventos não-live, manter lógica atual sem alteração.

### 5. `useAdminEvents.ts`

Adicionar `youtube_url` e `meet_url` ao tipo `EventInput` e ao fluxo de create/update.

### Arquivos alterados

1. **Migração SQL** -- 2 colunas novas
2. `src/hooks/useUserAccess.ts` -- permissões
3. `src/pages/Events.tsx` -- botões condicionais
4. `src/pages/admin/Events.tsx` -- formulário admin
5. `src/hooks/useAdminEvents.ts` -- tipo e mutations

Nenhuma mudança em checkout, pagamento, cupons ou navegação.

