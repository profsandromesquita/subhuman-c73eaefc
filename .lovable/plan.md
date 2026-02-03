
# Plano de Implementação: Funcionalidade Podcast

## Visão Geral

A funcionalidade Podcast será uma nova seção do ecossistema Subhumano, acessível através da barra de navegação inferior. Os administradores poderão importar áudios com metadados (título, descrição, capa, tags) e os usuários poderão filtrar por espaços temáticos.

---

## Arquitetura de Dados

### Nova Tabela: `podcasts`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Identificador único (PK) |
| space_id | uuid | FK para espaços (filtro temático) |
| author_id | uuid | FK para profiles (quem criou) |
| title | text | Título do episódio |
| description | text | Descrição/resumo |
| audio_url | text | URL do arquivo de áudio |
| cover_url | text | URL da imagem de capa |
| duration_seconds | integer | Duração em segundos |
| tags | text[] | Array de hashtags para busca |
| is_published | boolean | Se está publicado |
| published_at | timestamptz | Data de publicação |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Data de atualização |

### Políticas RLS

```sql
-- Leitura pública para publicados
CREATE POLICY "Anyone can view published podcasts"
ON public.podcasts FOR SELECT
USING (is_published = true);

-- Admin/moderador pode ver todos
CREATE POLICY "Admins can view all podcasts"
ON public.podcasts FOR SELECT
USING (is_admin_or_moderator(auth.uid()));

-- Admin/moderador pode criar
CREATE POLICY "Admins can insert podcasts"
ON public.podcasts FOR INSERT
WITH CHECK (is_admin_or_moderator(auth.uid()));

-- Admin/moderador pode editar
CREATE POLICY "Admins can update podcasts"
ON public.podcasts FOR UPDATE
USING (is_admin_or_moderator(auth.uid()));

-- Apenas admin pode deletar
CREATE POLICY "Admins can delete podcasts"
ON public.podcasts FOR DELETE
USING (has_role(auth.uid(), 'admin'));
```

---

## Storage

### Bucket: `podcast-media`

Configuração necessária:
- **Público**: Sim (para streaming de áudio)
- **Limite de tamanho**: 100MB (áudios podem ser grandes)
- **Tipos aceitos**: audio/mpeg, audio/mp3, audio/wav, audio/ogg, image/jpeg, image/png, image/webp

---

## Estrutura de Arquivos

```text
src/
├── pages/
│   ├── Podcasts.tsx              # Listagem de podcasts
│   └── PodcastDetail.tsx         # Player e detalhes do episódio
│   └── admin/
│       └── Podcasts.tsx          # Gestão de podcasts (admin)
├── hooks/
│   └── usePodcasts.ts            # Hooks para dados de podcasts
├── components/
│   └── podcast/
│       ├── PodcastCard.tsx       # Card de podcast na listagem
│       ├── PodcastPlayer.tsx     # Player de áudio customizado
│       └── PodcastFilters.tsx    # Filtros por espaço e tags
```

---

## Navegação

### BottomNav (Atualização)

Substituir o item "Avisos" por "Podcast":

```tsx
const navItems = [
  { icon: House, label: "Início", path: "/home" },
  { icon: SquaresFour, label: "Espaços", path: "/spaces" },
  { icon: Microphone, label: "Podcast", path: "/podcasts" },  // NOVO
  { icon: ChatCircle, label: "Canais", path: "/channels" },
  { icon: User, label: "Perfil", path: "/profile" },
];
```

**Observação**: O ícone de notificações (Bell) será movido para o header da home ou acessível via perfil.

### Rotas (App.tsx)

```tsx
// Novas rotas públicas protegidas
<Route path="/podcasts" element={<SubscriptionGuard><Podcasts /></SubscriptionGuard>} />
<Route path="/podcasts/:podcastId" element={<SubscriptionGuard><PodcastDetail /></SubscriptionGuard>} />

// Nova rota admin
<Route path="/admin/podcasts" element={<AdminGuard><AdminPodcasts /></AdminGuard>} />
```

### AdminSidebar (Atualização)

Adicionar item "Podcasts" na seção de Conteúdo:

```tsx
const contentNavItems = [
  { title: 'Espaços', url: '/admin/spaces', icon: Folders },
  { title: 'Conteúdos', url: '/admin/content', icon: Article },
  { title: 'Podcasts', url: '/admin/podcasts', icon: Microphone },  // NOVO
  { title: 'Canais', url: '/admin/channels', icon: ChatCircle },
  { title: 'Moderação', url: '/admin/moderation', icon: Shield },
];
```

---

## Componentes

### 1. PodcastCard

Card para exibição na listagem:

```text
┌─────────────────────────────────────────────────┐
│  ┌───────┐                                      │
│  │ CAPA  │  Título do Episódio                  │
│  │  60   │  Descrição curta...                  │
│  │  min  │                                      │
│  └───────┘  #tag1 #tag2 #tag3                   │
│             Produtividade · 2h atrás            │
└─────────────────────────────────────────────────┘
```

### 2. PodcastPlayer

Player de áudio customizado com controles:

```text
┌─────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────┐    │
│  │                                         │    │
│  │              CAPA GRANDE                │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  Título do Episódio                             │
│  Espaço: Produtividade                          │
│                                                 │
│  ━━━━━━━━━━━○━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  12:34                              45:00       │
│                                                 │
│        ⏪    ▶️    ⏩       🔊                 │
│       -15s        +15s                          │
│                                                 │
│  Descrição completa do episódio...              │
│                                                 │
│  #tag1 #tag2 #tag3                              │
└─────────────────────────────────────────────────┘
```

### 3. PodcastFilters

Filtros horizontais scrolláveis:

```text
┌─────────────────────────────────────────────────┐
│  [ Todos ] [ Produtividade ] [ Marketing ] ...  │
└─────────────────────────────────────────────────┘
```

---

## Hooks

### usePodcasts.ts

```tsx
// Lista de podcasts com filtros
export function usePodcasts(spaceId?: string) {
  return useQuery({
    queryKey: ["podcasts", spaceId],
    queryFn: async () => {
      let query = supabase
        .from("podcasts")
        .select(`
          *,
          spaces(id, name, slug, icon)
        `)
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      
      if (spaceId) {
        query = query.eq("space_id", spaceId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Podcast individual
export function usePodcast(podcastId: string) {
  return useQuery({
    queryKey: ["podcast", podcastId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("podcasts")
        .select(`
          *,
          spaces(id, name, slug, icon),
          profiles(full_name, avatar_url)
        `)
        .eq("id", podcastId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!podcastId,
  });
}
```

---

## Página Admin de Podcasts

A página seguirá o mesmo padrão do `SpaceContent.tsx`:

1. **Listagem** com DataTable
2. **Modal de criação/edição** com campos:
   - Seletor de Espaço
   - Título
   - Descrição (textarea)
   - Upload de Áudio (com preview de duração)
   - Upload de Capa (imagem)
   - Campo de Tags (input que transforma em chips)
   - Botões: Salvar Rascunho / Publicar

### Upload de Áudio

```tsx
// Calcular duração do áudio
const handleAudioUpload = async (file: File) => {
  const audio = new Audio(URL.createObjectURL(file));
  audio.addEventListener('loadedmetadata', () => {
    setDuration(Math.round(audio.duration));
  });
  
  // Upload para Supabase Storage
  const uploaded = await uploadFile(file);
  setAudioUrl(uploaded?.url);
};
```

---

## Fluxo de Implementação

### Fase 1: Backend (Banco de Dados)

1. Criar migração SQL para tabela `podcasts`
2. Configurar RLS policies
3. Criar bucket `podcast-media` no storage
4. Configurar policies do bucket

### Fase 2: Hooks e Utilitários

1. Criar `src/hooks/usePodcasts.ts`
2. Atualizar `src/hooks/useMediaUpload.ts` para suportar podcast

### Fase 3: Páginas Públicas

1. Criar `src/pages/Podcasts.tsx` (listagem)
2. Criar `src/pages/PodcastDetail.tsx` (player)
3. Criar componentes auxiliares

### Fase 4: Painel Admin

1. Criar `src/pages/admin/Podcasts.tsx`
2. Atualizar `AdminSidebar.tsx`

### Fase 5: Navegação

1. Atualizar `BottomNav.tsx`
2. Atualizar `App.tsx` com novas rotas

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/xxx_create_podcasts.sql` | Tabela e RLS |
| `src/hooks/usePodcasts.ts` | Hooks de dados |
| `src/pages/Podcasts.tsx` | Listagem pública |
| `src/pages/PodcastDetail.tsx` | Player e detalhes |
| `src/pages/admin/Podcasts.tsx` | Gestão admin |
| `src/components/podcast/PodcastCard.tsx` | Card de episódio |
| `src/components/podcast/PodcastPlayer.tsx` | Player customizado |
| `src/components/podcast/PodcastFilters.tsx` | Filtros por espaço |

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/BottomNav.tsx` | Adicionar ícone Podcast, remover Avisos |
| `src/components/admin/AdminSidebar.tsx` | Adicionar link Podcasts |
| `src/App.tsx` | Adicionar rotas de podcast |
| `src/hooks/useMediaUpload.ts` | Adicionar funções para podcast |

---

## Considerações de UX

### Player de Áudio

- Controles: Play/Pause, -15s, +15s, Volume
- Barra de progresso clicável
- Exibição de tempo atual e total
- Background playback (continua tocando ao navegar)

### Filtros

- Chips horizontais scrolláveis
- "Todos" como opção padrão
- Destaque visual no filtro ativo

### Cards

- Exibir duração formatada (ex: "45 min")
- Tags como badges clicáveis
- Espaço associado visível

---

## Segurança e Validação

1. **Uploads**: Validar tipo MIME e tamanho no client e server
2. **Tags**: Sanitizar input, limitar quantidade (max 5)
3. **RLS**: Apenas admins/moderadores podem criar/editar
4. **Storage**: Políticas de acesso por autenticação

---

## Seção Técnica

### SQL de Migração

```sql
-- Criar tabela de podcasts
CREATE TABLE public.podcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid REFERENCES public.spaces(id) ON DELETE SET NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  audio_url text NOT NULL,
  cover_url text,
  duration_seconds integer,
  tags text[] DEFAULT '{}',
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view published podcasts"
ON public.podcasts FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can view all podcasts"
ON public.podcasts FOR SELECT
USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can insert podcasts"
ON public.podcasts FOR INSERT
WITH CHECK (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can update podcasts"
ON public.podcasts FOR UPDATE
USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can delete podcasts"
ON public.podcasts FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_podcasts_updated_at
  BEFORE UPDATE ON public.podcasts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar bucket de storage
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('podcast-media', 'podcast-media', true, 104857600);

-- Policies do bucket
CREATE POLICY "Anyone can view podcast media"
ON storage.objects FOR SELECT
USING (bucket_id = 'podcast-media');

CREATE POLICY "Admins can upload podcast media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'podcast-media' 
  AND is_admin_or_moderator(auth.uid())
);

CREATE POLICY "Admins can delete podcast media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'podcast-media' 
  AND is_admin_or_moderator(auth.uid())
);
```

### Formato de Duração

```typescript
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
};
```

---

## Resultado Esperado

| Funcionalidade | Status Atual | Após Implementação |
|----------------|--------------|-------------------|
| Acesso a Podcasts | Inexistente | Via BottomNav |
| Upload de áudio (admin) | Inexistente | Modal com preview |
| Filtro por espaço | Inexistente | Chips horizontais |
| Player customizado | Inexistente | Controles completos |
| Tags/Hashtags | Inexistente | Input + chips |
| Gestão no admin | Inexistente | DataTable + CRUD |
