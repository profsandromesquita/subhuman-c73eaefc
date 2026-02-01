
# Plano: Adicionar Logo nas Páginas Internas Restantes

## Problema Identificado

A logo foi implementada apenas em:
- Landing Page (hero)
- Home Page (header)
- Login / Register (topo)
- Onboarding Modal

Mas **não foi incluída** nas demais páginas internas com headers próprios:
- `/spaces` (Espaços)
- `/channels` (Canais)
- `/notifications` (Notificações)
- `/profile` (Perfil)

## Estado Atual das Páginas

| Página | Header Atual | Problema |
|--------|--------------|----------|
| `/spaces` | `<h1>Espaços</h1>` | Sem logo |
| `/channels` | `<h1>Canais</h1>` | Sem logo |
| `/notifications` | `<h1>Notificações</h1>` | Sem logo |
| `/profile` | Avatar + Nome | Sem logo |

## Padrão Proposto

Vou seguir o mesmo padrão já implementado na Home, onde a logo aparece no topo da página, alinhada à esquerda, antes do conteúdo principal.

```text
┌─────────────────────────────────────────┐
│  [LOGO sm]                              │ ← Logo no topo
│                                         │
│  Espaços                                │ ← Título da seção
│  Escolha os temas que você...           │
│                                         │
│  Cards de conteúdo...                   │
│                                         │
└─────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/Spaces.tsx` | Adicionar Logo no topo do header |
| `src/pages/Channels.tsx` | Adicionar Logo no topo do header |
| `src/pages/Notifications.tsx` | Adicionar Logo no topo do header |
| `src/pages/Profile.tsx` | Adicionar Logo no topo (acima do avatar) |

## Implementação Detalhada

### 1. Spaces.tsx

Adicionar a logo antes do título "Espaços":

```tsx
import { Logo } from "@/components/Logo";

// No início do conteúdo (antes do motion.div com o título):
<Logo size="sm" className="mb-4" />

<motion.div ...>
  <h1 className="text-2xl font-bold mb-1">Espaços</h1>
  ...
</motion.div>
```

### 2. Channels.tsx

Mesmo padrão:

```tsx
import { Logo } from "@/components/Logo";

// No início do conteúdo:
<Logo size="sm" className="mb-4" />

<motion.div ...>
  <h1 className="text-2xl font-bold mb-1">Canais</h1>
  ...
</motion.div>
```

### 3. Notifications.tsx

Mesmo padrão:

```tsx
import { Logo } from "@/components/Logo";

// No início do conteúdo:
<Logo size="sm" className="mb-4" />

<motion.div ...>
  <h1 className="text-2xl font-bold mb-1">Notificações</h1>
  ...
</motion.div>
```

### 4. Profile.tsx

Na página de perfil, a logo ficará acima do avatar:

```tsx
import { Logo } from "@/components/Logo";

// No início do conteúdo:
<Logo size="sm" className="mb-4" />

<motion.div ... className="flex items-center gap-4 mb-8">
  <Avatar className="h-16 w-16">
    ...
  </Avatar>
  ...
</motion.div>
```

## Resultado Visual Esperado

Todas as páginas internas terão um header consistente:

```text
SPACES / CHANNELS / NOTIFICATIONS:
┌───────────────────────────────────┐
│  [LOGO]                           │
│                                   │
│  Título da Página                 │
│  Subtítulo descritivo...          │
│                                   │
│  [Conteúdo...]                    │
└───────────────────────────────────┘

PROFILE:
┌───────────────────────────────────┐
│  [LOGO]                           │
│                                   │
│  [Avatar] Nome do Usuário         │
│           email@exemplo.com       │
│                                   │
│  [Menu items...]                  │
└───────────────────────────────────┘
```

## Seção Técnica

### Tamanho da Logo

Usarei `size="sm"` (32px de altura) para todas as páginas internas, mantendo consistência com a Home e evitando que a logo compita visualmente com o conteúdo principal.

### Espaçamento

- `className="mb-4"` (16px) abaixo da logo para separação sutil
- Mantém a hierarquia visual: Logo → Título → Conteúdo

### Animação

A logo não terá animação de entrada nestas páginas, pois:
1. O conteúdo já tem animações próprias (framer-motion)
2. Evita excesso de movimento visual
3. A logo serve como âncora estática de identidade
