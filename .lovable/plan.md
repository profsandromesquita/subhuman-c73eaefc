
# Plano: Restaurar Acesso à Funcionalidade de Avisos (Notificações)

## Diagnóstico

Confirmei que durante a implementação da funcionalidade Podcast, o item "Avisos" foi substituído na barra de navegação inferior. A situação atual é:

| Item | Status |
|------|--------|
| Página `/notifications` | Funcional e completa |
| Hook `useNotifications` | Funcional e integrado ao banco |
| Acesso via BottomNav | Removido (substituído por Podcast) |
| Rota no App.tsx | Ativa e protegida |

O plano original previa mover o acesso às notificações para o **header da Home** ou **perfil do usuário**.

---

## Solução Proposta

Adicionar um ícone de notificações (sino) no **header da página Home**, ao lado do logo, com indicador de notificações não lidas.

### Design Visual

```text
┌─────────────────────────────────────────────────┐
│                                                 │
│  ┌────────┐                        ┌────────┐  │
│  │SUBHMNO │                        │ 🔔 (3) │  │
│  └────────┘                        └────────┘  │
│                                                 │
│  Destaques da semana               Ver tudo >  │
│  ...                                           │
└─────────────────────────────────────────────────┘
```

**Elementos do ícone:**
- Ícone `Bell` do Phosphor Icons
- Badge vermelho/foreground com contador de não lidas (se > 0)
- Clicável, navega para `/notifications`

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/Home.tsx` | Adicionar ícone de notificações no header |

---

## Implementação Detalhada

### Modificações em Home.tsx

**1. Novos imports:**
```typescript
import { Bell } from "@phosphor-icons/react";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";
```

**2. Hook para contador:**
```typescript
const { data: unreadCount = 0 } = useUnreadNotificationsCount();
```

**3. Header atualizado (linhas 96-102):**

Atualizar de:
```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex items-center"
>
  <Logo size="sm" />
</motion.div>
```

Para:
```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex items-center justify-between"
>
  <Logo size="sm" />
  
  <button 
    onClick={() => navigate("/notifications")}
    className="relative p-2 rounded-lg hover:bg-accent transition-colors"
    aria-label="Notificações"
  >
    <Bell className="w-5 h-5" weight={unreadCount > 0 ? "fill" : "regular"} />
    {unreadCount > 0 && (
      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-foreground text-background rounded-full px-1">
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    )}
  </button>
</motion.div>
```

---

## Comportamento Esperado

| Cenário | Resultado |
|---------|-----------|
| Usuário sem notificações não lidas | Ícone outline normal |
| Usuário com 5 não lidas | Ícone preenchido + badge "5" |
| Usuário com 100+ não lidas | Ícone preenchido + badge "99+" |
| Clique no ícone | Navega para `/notifications` |

---

## Alternativa: Adicionar também no Perfil

Opcionalmente, podemos adicionar um link para notificações na página de perfil. Porém, o header da Home é o local mais visível e adequado para este tipo de indicador.

---

## Resultado Final

```text
ANTES:                              DEPOIS:
┌───────────────────────┐           ┌───────────────────────┐
│  SUBHMNO              │           │  SUBHMNO        🔔(3) │
│                       │           │                       │
│  [Conteúdo...]        │           │  [Conteúdo...]        │
│                       │           │                       │
│ ─────────────────────│           │ ─────────────────────│
│ 🏠  📦  🎙️  💬  👤   │           │ 🏠  📦  🎙️  💬  👤   │
└───────────────────────┘           └───────────────────────┘

BottomNav sem Avisos               BottomNav + Bell no header
(funcionalidade "perdida")         (acesso restaurado)
```

---

## Escopo Mínimo

Esta implementação requer **apenas 1 arquivo modificado** (`Home.tsx`) e adiciona aproximadamente 15 linhas de código, mantendo toda a funcionalidade de notificações existente.
