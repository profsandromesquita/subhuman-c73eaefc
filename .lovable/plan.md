
# Plano de Implementação: Logo Subhumano na Plataforma

## Análise da Logo

A logo fornecida (`logo-subumano-ia-br-transparente.svg`) é um arquivo SVG vetorial com as seguintes características:

| Característica | Valor |
|----------------|-------|
| Formato | SVG vetorial |
| Dimensões originais | 1200x1200px (quadrada) |
| Fundo | Transparente |
| Compatibilidade | Perfeita para modo escuro |

## Estado Atual da Marca

Atualmente, a marca "subhumano" aparece como **texto estilizado** em vários locais:

| Local | Implementação Atual |
|-------|---------------------|
| Landing Page | `<h1>sub<span>humano</span></h1>` (texto bicolor) |
| Home (header) | `<h1>sub<span>humano</span></h1>` (texto menor) |
| Onboarding Modal | Apenas texto "Subhumano" no título |
| PWA Manifest | Apenas nome "Subhumano" |
| Favicon/Ícones | Ícones PNG genéricos |

## Proposta de Implementação

### Locais para Aplicação da Logo

| Prioridade | Local | Tamanho Recomendado | Justificativa |
|------------|-------|---------------------|---------------|
| Alta | Landing Page (hero) | 120-150px altura | Primeira impressão da marca |
| Alta | Home Page (header) | 32-40px altura | Identificação em uso diário |
| Alta | Favicon/PWA | 192px, 512px | Ícone do app |
| Média | Onboarding Modal | 48-56px altura | Reforço de marca no primeiro uso |
| Média | Telas de Auth (Login/Register) | 40-48px altura | Branding consistente |
| Baixa | Splash/Loading | 80-100px altura | Experiência de carregamento |

### Hierarquia Visual Proposta

```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  LANDING PAGE (primeira visita)                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │        [LOGO 120-150px]                             │    │
│  │                                                     │    │
│  │     O futuro da IA, direto no seu bolso.            │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  HOME PAGE (uso diário)                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [LOGO 32-40px] ─────────── Destaques da semana     │    │
│  │                                                     │    │
│  │  Cards de conteúdo...                               │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AUTH PAGES (Login/Register)                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ← [LOGO 40-48px] centralizada ou alinhada à esq.   │    │
│  │                                                     │    │
│  │     Bem-vindo de volta                              │    │
│  │     (formulário)                                    │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/assets/logo.svg` | Criar | Copiar logo para assets |
| `src/components/Logo.tsx` | Criar | Componente reutilizável da logo |
| `src/pages/Landing.tsx` | Modificar | Substituir texto por logo |
| `src/pages/Home.tsx` | Modificar | Substituir texto por logo no header |
| `src/pages/Login.tsx` | Modificar | Adicionar logo no topo |
| `src/pages/Register.tsx` | Modificar | Adicionar logo no topo |
| `src/components/OnboardingModal.tsx` | Modificar | Adicionar logo pequena |
| `public/icon-192.png` | Substituir | Gerar do SVG |
| `public/icon-512.png` | Substituir | Gerar do SVG |
| `public/favicon.ico` | Substituir | Gerar do SVG |

## Implementação Detalhada

### 1. Componente Logo Reutilizável

Criar um componente único para garantir consistência:

```tsx
// src/components/Logo.tsx
import logoSrc from "@/assets/logo.svg";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "h-8",     // 32px - header home
  md: "h-10",    // 40px - auth pages
  lg: "h-12",    // 48px - onboarding
  xl: "h-32",    // 128px - landing hero
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <img 
      src={logoSrc} 
      alt="Subhumano" 
      className={`${sizeMap[size]} w-auto ${className}`}
    />
  );
}
```

### 2. Atualização Landing Page

Substituir o texto estilizado pela logo visual:

```tsx
// Antes (texto)
<h1 className="text-2xl font-bold tracking-tight">
  sub<span className="text-muted-foreground">humano</span>
</h1>

// Depois (logo)
<Logo size="xl" />
```

### 3. Atualização Home Page

Header mais compacto com logo:

```tsx
// Antes
<h1 className="text-lg font-bold tracking-tight">
  sub<span className="text-muted-foreground">humano</span>
</h1>

// Depois
<Logo size="sm" />
```

### 4. Telas de Autenticação

Adicionar logo no topo das páginas Login e Register:

```tsx
// Adicionar após o header com botão voltar
<div className="flex justify-center mb-8">
  <Logo size="md" />
</div>
```

### 5. Onboarding Modal

Integrar logo no modal de boas-vindas:

```tsx
// No título do modal
<div className="flex flex-col items-center gap-2">
  <Logo size="lg" />
  <h2 className="text-xl font-bold mt-2">
    Bem-vindo!
  </h2>
</div>
```

### 6. PWA e Favicon

Para os ícones do PWA e favicon, serão necessários:

1. **Gerar ícones PNG a partir do SVG** (manualmente ou via ferramenta)
2. **Substituir arquivos existentes**:
   - `public/icon-192.png` (192x192)
   - `public/icon-512.png` (512x512)
   - `public/apple-touch-icon.png` (180x180)
   - `public/favicon.ico` (múltiplos tamanhos)

## Seção Técnica

### Por que usar o componente Logo?

| Benefício | Descrição |
|-----------|-----------|
| Consistência | Mesma aparência em toda a plataforma |
| Manutenibilidade | Alterar em um lugar, atualiza em todos |
| Performance | Import ES6 permite otimização do bundler |
| Acessibilidade | Alt text centralizado |
| Type Safety | Props tipadas com TypeScript |

### Decisões de Design

**Tamanhos escolhidos:**
- **32-40px (sm/md)**: Ideal para headers internos. Não compete com o conteúdo, mas mantém presença
- **48px (lg)**: Destaque em modais sem ser excessivo
- **128-150px (xl)**: Impacto na landing page, primeira impressão memorável

**Posicionamento:**
- Landing: Topo esquerdo (padrão de leitura ocidental)
- Home: Header compacto, alinhado à esquerda
- Auth: Centralizado para foco visual
- Modal: Centralizado com hierarquia clara

### Fallback de Acessibilidade

O componente inclui `alt="Subhumano"` para:
- Leitores de tela
- Indexação de busca
- Fallback se imagem não carregar

## Ordem de Implementação

1. Copiar SVG para `src/assets/logo.svg`
2. Criar componente `src/components/Logo.tsx`
3. Atualizar `Landing.tsx` (maior impacto visual)
4. Atualizar `Home.tsx` (uso diário)
5. Atualizar `Login.tsx` e `Register.tsx`
6. Atualizar `OnboardingModal.tsx`
7. (Opcional) Gerar e substituir ícones PWA

## Resultado Esperado

Após implementação:

1. Marca visual consistente em toda a plataforma
2. Logo profissional substituindo texto estilizado
3. Melhor reconhecimento de marca
4. Experiência premium e polida
5. PWA com ícone oficial da marca

