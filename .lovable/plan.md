

# Plano: Modal de Onboarding para Novos Usuários

## Problema Identificado

Quando um usuário acessa o Subhumano pela primeira vez, a página Início aparece completamente vazia porque ele ainda não escolheu nenhum espaço para seguir. Isso gera uma experiência confusa onde o usuário não sabe qual é o próximo passo.

### Estado Atual

```text
Novo usuário faz login
        │
        ▼
Redirecionado para /home
        │
        ▼
Vê página vazia com mensagens:
  - "Inscreva-se em espaços para ver os destaques"
  - "Nenhuma discussão em alta no momento"
  - "Você ainda não segue nenhum espaço"
        │
        ▼
Usuário fica perdido, não sabe o que fazer
```

## Solução Proposta

Criar um modal de onboarding interativo que aparece automaticamente quando o usuário logado não possui nenhum espaço inscrito. O modal deve:

1. Explicar brevemente o funcionamento da plataforma
2. Guiar visualmente o usuário até a aba Espaços
3. Usar o vídeo fornecido (opcional) ou animações
4. Ser dispensável mas persistente (aparece até o usuário escolher pelo menos 1 espaço)

## Arquitetura da Solução

### Novo Fluxo de Onboarding

```text
Novo usuário faz login
        │
        ▼
Redirecionado para /home
        │
        ├── Tem espaços inscritos? → Sim → Exibe feed normal
        │
        └── Não tem espaços?
                │
                ▼
        Exibe OnboardingModal automaticamente
                │
                ▼
        Usuário clica "Ir para Espaços"
                │
                ▼
        Navega para /spaces com destaque visual
                │
                ▼
        Usuário escolhe pelo menos 1 espaço
                │
                ▼
        Modal não aparece mais
```

## Componentes a Criar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/OnboardingModal.tsx` | Novo componente | Modal interativo de onboarding |
| `src/pages/Home.tsx` | Modificar | Integrar o modal |

## Implementação Detalhada

### 1. Componente OnboardingModal

Criar um modal elegante e animado com Framer Motion:

```tsx
// src/components/OnboardingModal.tsx
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SquaresFour, ArrowRight, Sparkle } from "@phosphor-icons/react";

interface OnboardingModalProps {
  isOpen: boolean;
  onNavigateToSpaces: () => void;
  onDismiss: () => void;
}

export function OnboardingModal({ 
  isOpen, 
  onNavigateToSpaces,
  onDismiss 
}: OnboardingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-w-sm mx-auto bg-card border-border">
        {/* Ícone animado */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center"
        >
          <SquaresFour className="w-10 h-10 text-primary" weight="duotone" />
        </motion.div>

        {/* Título e descrição */}
        <div className="text-center space-y-3 mt-4">
          <h2 className="text-xl font-bold">
            Bem-vindo ao Subhumano!
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Para começar, escolha os <strong className="text-foreground">Espaços</strong> que 
            mais combinam com você. A plataforma vai filtrar 
            as melhores atualizações de IA para você.
          </p>
        </div>

        {/* Indicador visual do menu */}
        <motion.div 
          className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Clique em</span>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary font-medium">
              <SquaresFour className="w-4 h-4" weight="fill" />
              Espaços
            </div>
            <span className="text-muted-foreground">no menu abaixo</span>
          </div>
          
          {/* Seta animada apontando para baixo */}
          <motion.div
            className="flex justify-center mt-3"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ArrowDown className="w-6 h-6 text-primary" />
          </motion.div>
        </motion.div>

        {/* Botões de ação */}
        <div className="mt-6 space-y-3">
          <Button
            onClick={onNavigateToSpaces}
            className="w-full bg-white text-black font-semibold py-3 hover:bg-gray-100"
          >
            <Sparkle className="w-4 h-4 mr-2" weight="fill" />
            Escolher meus espaços
          </Button>

          <button
            onClick={onDismiss}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Ver a home primeiro
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 2. Lógica de Exibição do Modal

O modal deve aparecer quando:
- Usuário está logado
- Não possui nenhum espaço inscrito
- Não dispensou o modal na sessão atual

Modificar `src/pages/Home.tsx`:

```tsx
// Dentro de Home.tsx
const [showOnboarding, setShowOnboarding] = useState(false);

// Verifica se deve mostrar o onboarding
useEffect(() => {
  const hasSeenOnboarding = sessionStorage.getItem('onboarding-dismissed');
  
  if (
    user && 
    !loadingSpaces && 
    subscribedSpaces.length === 0 && 
    !hasSeenOnboarding
  ) {
    // Pequeno delay para não sobrepor outros elementos
    const timer = setTimeout(() => setShowOnboarding(true), 500);
    return () => clearTimeout(timer);
  }
}, [user, loadingSpaces, subscribedSpaces]);

const handleNavigateToSpaces = () => {
  setShowOnboarding(false);
  navigate('/spaces');
};

const handleDismissOnboarding = () => {
  setShowOnboarding(false);
  sessionStorage.setItem('onboarding-dismissed', 'true');
};
```

### 3. Design Visual

O modal seguirá o design system do Subhumano:

| Elemento | Estilo |
|----------|--------|
| Background | `bg-card` (#141414) |
| Ícone principal | Duotone, cor primária, animado |
| Texto título | `text-xl font-bold` branco |
| Texto descrição | `text-muted-foreground text-sm` |
| Destaque "Espaços" | Badge com `bg-primary/10 text-primary` |
| Botão principal | `bg-white text-black` (padrão CTA) |
| Botão secundário | `text-muted-foreground` link sutil |

### 4. Animações

Usar Framer Motion para criar uma experiência fluida:

```tsx
// Animação da seta apontando para baixo
<motion.div
  animate={{ y: [0, 8, 0] }}
  transition={{ 
    repeat: Infinity, 
    duration: 1.5, 
    ease: "easeInOut" 
  }}
>
  <ArrowDown className="w-6 h-6 text-primary" />
</motion.div>

// Destaque pulsante no ícone de Espaços
<motion.div
  animate={{ 
    scale: [1, 1.1, 1],
    opacity: [0.5, 1, 0.5] 
  }}
  transition={{ repeat: Infinity, duration: 2 }}
>
  <SquaresFour />
</motion.div>
```

## Fluxo de Experiência do Usuário

```text
┌─────────────────────────────────────────────────────────┐
│                                                         │
│         ┌───────────────────────────────┐               │
│         │                               │               │
│         │    ╭──────────────────╮       │               │
│         │    │   ⊞              │       │               │
│         │    │  Espaços         │       │               │
│         │    ╰──────────────────╯       │               │
│         │                               │               │
│         │  Bem-vindo ao Subhumano!      │               │
│         │                               │               │
│         │  Para começar, escolha os     │               │
│         │  Espaços que mais combinam    │               │
│         │  com você.                    │               │
│         │                               │               │
│         │  ┌─────────────────────────┐  │               │
│         │  │ Clique em [Espaços] ▼   │  │               │
│         │  │          ↓              │  │               │
│         │  └─────────────────────────┘  │               │
│         │                               │               │
│         │  [ Escolher meus espaços ]    │               │
│         │                               │               │
│         │     Ver a home primeiro       │               │
│         │                               │               │
│         └───────────────────────────────┘               │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  🏠 Início   ⊞ Espaços   💬 Canais   🔔 Avisos   👤     │
└─────────────────────────────────────────────────────────┘
```

## Alternativa: Usar o Vídeo WebM

Se preferir usar o vídeo que você enviou em vez de animações:

```tsx
// Opção com vídeo
<video
  src="/onboarding-guide.webm"
  autoPlay
  loop
  muted
  playsInline
  className="w-full rounded-xl"
/>
```

Para isso:
1. Copiar o arquivo webm para `public/onboarding-guide.webm`
2. Usar a tag `<video>` no modal

Recomendo usar animações CSS/Framer Motion para:
- Menor tamanho de arquivo
- Melhor performance em dispositivos móveis
- Mais controle sobre a experiência

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/OnboardingModal.tsx` | Criar |
| `src/pages/Home.tsx` | Modificar (adicionar modal) |

## Seção Tecnica

### Persistência do Estado

| Storage | Uso |
|---------|-----|
| `sessionStorage` | Dispensar modal temporariamente (volta ao fechar browser) |
| Banco de dados | Não necessário - o modal para de aparecer naturalmente quando o usuário inscreve-se em espaços |

### Prioridade de Modais

Se o usuário for novo, pode haver conflito com outros modais (como push notifications). Ordem de prioridade:

1. OnboardingModal (primeiro a aparecer)
2. PushPermissionBanner (só após interação)

Para evitar sobreposição:
```tsx
// Só mostra push banner se não estiver em onboarding
{!showOnboarding && <PushPermissionBanner />}
```

### Acessibilidade

- Modal com `role="dialog"`
- Foco automaticamente movido para o modal
- Tecla ESC fecha o modal
- Botões com labels descritivos

## Resultado Esperado

Após implementação:

1. Novos usuários verão um modal amigável explicando o próximo passo
2. O modal direciona visualmente para a aba "Espaços"
3. Animação de seta reforça a localização do menu
4. Usuário pode dispensar o modal se preferir explorar primeiro
5. Modal não aparece mais após o usuário inscrever-se em pelo menos 1 espaço

