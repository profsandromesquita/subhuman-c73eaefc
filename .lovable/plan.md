

# Plano: Corrigir Sincronização de Horários nos Eventos

## Causa Raiz

O input `datetime-local` no admin retorna strings como `"2026-03-06T10:00"` (sem timezone). Quando enviadas ao banco (`timestamptz`), o Supabase interpreta como **UTC**. Na exibição, `new Date()` converte UTC para horário local (UTC-3 no Brasil), resultando em 10h → 7h.

O mesmo problema ocorre ao editar: a linha `s.starts_at.slice(0, 16)` corta o sufixo de timezone do valor UTC retornado pelo banco, mostrando o horário UTC no campo de edição.

## Correção

**Dois pontos de ajuste:**

### 1. Ao salvar (admin → banco): anexar offset local

No `useAdminEvents.ts`, antes de inserir sessions, converter a string local para ISO com timezone:

```typescript
// "2026-03-06T10:00" → "2026-03-06T10:00:00-03:00"
function localToTimestamptz(localStr: string): string {
  const date = new Date(localStr);
  return date.toISOString(); // ou usar offset explícito
}
```

Usar `new Date(localStr).toISOString()` faz o JS interpretar como local e converter para UTC corretamente. Isso garante que "10:00 local" vira "13:00:00Z" no banco.

### 2. Ao carregar para edição (banco → admin): converter UTC para local

No `openEditModal` em `admin/Events.tsx`, a linha `s.starts_at.slice(0, 16)` está cortando o timestamp UTC. Precisa converter para local:

```typescript
function utcToLocalInput(utcStr: string): string {
  const date = new Date(utcStr);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}
```

### 3. Exibição pública — já funciona

Os componentes públicos (`Events.tsx`, `LandingEvents.tsx`, `Plans.tsx`) usam `new Date(s.starts_at)` + `format()`, que automaticamente converte UTC para local. O problema é apenas que o valor salvo no banco está errado (UTC quando deveria representar horário local). Com a correção no passo 1, a exibição ficará correta automaticamente.

## Arquivos impactados

| Arquivo | Alteração |
|---|---|
| `src/hooks/useAdminEvents.ts` | Converter `starts_at`/`ends_at` com `new Date().toISOString()` antes de salvar |
| `src/pages/admin/Events.tsx` | Converter timestamps UTC para local no `openEditModal` |

## Risco

Baixo. Eventos já cadastrados continuarão com o horário deslocado (dados históricos). Novos eventos serão salvos corretamente. Para corrigir eventos existentes, o admin pode re-salvar cada um.

