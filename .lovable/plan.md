
# Plano: Sistema de Engajamento para Podcasts

## Objetivo
Implementar funcionalidades completas de **comentários**, **curtidas**, **salvar** e **compartilhar** nos episódios de podcast, replicando a mesma estrutura existente em artigos (space_updates) e canais (channel_posts).

---

## Visão Geral da Arquitetura

```text
┌─────────────────────────────────────────────────────────────────┐
│                    PÁGINA PodcastDetail.tsx                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PodcastHeader (Voltar, Salvar, Compartilhar)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PodcastPlayer (Player de áudio existente)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Info (Título, Espaço, Tags, Descrição)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PostEngagement (Curtidas, Comentários - REUTILIZADO)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  CommentSection (Lista de comentários - REUTILIZADO)    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  CommentInput (Input fixo no rodapé - REUTILIZADO)      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Criação das Tabelas no Banco de Dados

Criar 4 novas tabelas seguindo o padrão existente:

### 1.1 Tabela `podcast_likes`
```sql
CREATE TABLE public.podcast_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(podcast_id, user_id)
);
```

### 1.2 Tabela `podcast_comments`
```sql
CREATE TABLE public.podcast_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.podcast_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.3 Tabela `podcast_comment_likes`
```sql
CREATE TABLE public.podcast_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.podcast_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);
```

### 1.4 Tabela `saved_podcasts`
```sql
CREATE TABLE public.saved_podcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(podcast_id, user_id)
);
```

### 1.5 Políticas RLS
Aplicar políticas seguindo o padrão existente:
- **SELECT**: Público para visualização
- **INSERT**: Autenticado pode inserir próprios registros
- **UPDATE**: Usuário pode editar próprios comentários
- **DELETE**: Usuário pode remover próprios registros

---

## Fase 2: Atualização do Hook `usePodcasts.ts`

### Novas Mutations a Adicionar

```typescript
// Curtir/Descurtir podcast
export function useLikePodcast()

// Adicionar comentário
export function useAddPodcastComment()

// Curtir comentário
export function useLikePodcastComment()

// Salvar/Remover dos salvos
export function useSavePodcast()
```

### Query Atualizada
Atualizar `usePodcast()` para incluir contagem de engajamento e status do usuário:
- likes_count
- comments_count
- is_liked
- is_saved

---

## Fase 3: Criação do Componente `PodcastHeader`

Novo componente em `src/components/podcast/PodcastHeader.tsx`:

```typescript
interface PodcastHeaderProps {
  isSaved: boolean;
  onSaveToggle: () => void;
  title: string;
  backPath?: string;
}
```

Funcionalidades:
- Botão Voltar (navegação para /podcasts)
- Botão Salvar (bookmark com estado visual)
- Botão Compartilhar (Web Share API / copiar link)
- Header flutuante com blur no scroll (igual PostHeader)

---

## Fase 4: Refatoração da Página `PodcastDetail.tsx`

### Estado a Gerenciar
```typescript
const [isLiked, setIsLiked] = useState(false);
const [isSaved, setIsSaved] = useState(false);
const [likesCount, setLikesCount] = useState(0);
const [comments, setComments] = useState<Comment[]>([]);
const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
```

### Funções de Engajamento
- `handleLikeToggle()` - Curtir/descurtir podcast
- `handleSaveToggle()` - Salvar/remover dos salvos
- `handleCommentClick()` - Scroll até seção de comentários
- `handleLikeComment()` - Curtir comentário
- `handleReplyComment()` - Responder comentário
- `handleSubmitComment()` - Enviar novo comentário
- `handleEditComment()` - Editar comentário próprio
- `handleDeleteComment()` - Excluir comentário próprio

### Reutilização de Componentes
Os seguintes componentes serão **reutilizados sem modificação**:
- `PostEngagement` - Barra de curtidas e botão comentar
- `CommentSection` - Lista de comentários com replies
- `CommentInput` - Input fixo no rodapé
- `CommentItem` - Card individual de comentário

---

## Fase 5: Invalidação de Cache

Após interações, invalidar queries relevantes:
```typescript
queryClient.invalidateQueries({ queryKey: ["podcasts"] });
queryClient.invalidateQueries({ queryKey: ["podcast", podcastId] });
```

---

## Resumo de Arquivos

| Operação | Arquivo |
|----------|---------|
| **Migration SQL** | Criar tabelas podcast_likes, podcast_comments, podcast_comment_likes, saved_podcasts + RLS |
| **Editar** | `src/hooks/usePodcasts.ts` - Adicionar mutations de engajamento |
| **Criar** | `src/components/podcast/PodcastHeader.tsx` - Header com salvar/compartilhar |
| **Editar** | `src/pages/PodcastDetail.tsx` - Integrar sistema de engajamento completo |

---

## Resultado Esperado

Após implementação:
1. Usuários poderão **curtir** episódios de podcast
2. Usuários poderão **comentar** e **responder** comentários
3. Usuários poderão **salvar** podcasts favoritos
4. Usuários poderão **compartilhar** via Web Share API ou copiar link
5. Contadores de engajamento serão exibidos em tempo real
6. Interface consistente com artigos e canais
