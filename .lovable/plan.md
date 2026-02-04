
# Plano de Correção: Navegação de Notificações para Espaço Correto

## Diagnóstico

Ao clicar em uma notificação do tipo "update" (como "Novo em Programação e Automação"), o usuário é redirecionado para `/spaces` genérico ao invés do espaço específico `/spaces/programacao-e-automacao`.

**Causa raiz identificada:**

1. O hook `useNotifications` faz join com `spaces(name)` mas não inclui o campo `slug`
2. A função `handleNotificationClick` navega para `/spaces` sem usar o slug do espaço

## Solução Proposta

### Arquivo 1: `src/hooks/useNotifications.ts`

Modificar o select para incluir o `slug` do espaço:

```text
Linha 79-81 - Alterar:
.select(`
  id, type, title, message, is_read, created_at, space_id,
  spaces(name)
`)

Para:
.select(`
  id, type, title, message, is_read, created_at, space_id,
  spaces(name, slug)
`)
```

Adicionar `space_slug` à interface `Notification`:

```text
Interface Notification (linha 6-15):
Adicionar: space_slug?: string;
```

Mapear o slug no retorno:

```text
Linha 89-98 - Adicionar:
space_slug: (n.spaces as any)?.slug || null,
```

### Arquivo 2: `src/pages/Notifications.tsx`

Alterar a navegação para usar o slug do espaço:

```text
Linha 62-67 - Alterar:
if (notification.type === "update" && notification.space_id) {
  navigate(`/spaces`);
}

Para:
if (notification.type === "update" && notification.space_slug) {
  navigate(`/spaces/${notification.space_slug}`);
} else if (notification.type === "update" && notification.space_id) {
  // Fallback para lista de espaços se slug não disponível
  navigate(`/spaces`);
}
```

## Resumo das Alterações

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useNotifications.ts` | Adicionar `slug` ao select e interface |
| `src/pages/Notifications.tsx` | Usar `space_slug` na navegação |

## Resultado Esperado

Ao clicar em "Novo em Programação e Automação", o usuário será direcionado para `/spaces/programacao-e-automacao` mostrando o conteúdo correto do espaço.

## Seção Técnica

### Estrutura de dados atual

```typescript
// Notificação retornada do banco
{
  id: "uuid",
  type: "update",
  title: "Novo em Programação e Automação",
  message: "Clawdbot/Moltbot...",
  space_id: "uuid-do-espaco",
  spaces: { name: "Programação e Automação" } // SEM SLUG
}
```

### Estrutura após correção

```typescript
// Notificação com slug
{
  id: "uuid",
  type: "update",
  title: "Novo em Programação e Automação",
  message: "Clawdbot/Moltbot...",
  space_id: "uuid-do-espaco",
  space_slug: "programacao-e-automacao", // NOVO
  spaces: { name: "Programação e Automação", slug: "programacao-e-automacao" }
}
```

### Rota destino

A rota `/spaces/:spaceSlug` já existe em `App.tsx` (linha 82) e o componente `SpaceDetail` já usa o parâmetro `spaceSlug` para buscar e exibir o conteúdo do espaço.
