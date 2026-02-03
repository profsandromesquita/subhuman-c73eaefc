
# Plano: URLs Amigáveis para SEO

## Objetivo
Transformar URLs com UUIDs em URLs legíveis e SEO-friendly:

**Antes:**
- `/spaces/produtividade/post/b4e54116-49d2-4f10-8090-ce09b00e3038`
- `/podcasts/992bfff5-79d3-4f9e-bdf1-ffe494c8ee6d`

**Depois:**
- `/spaces/produtividade/post/copilot-secretario-chegou-agora-voce-agenda-reunioes`
- `/podcasts/o-evernote-finalmente-acordou-ou-so-colocou-ia`

---

## Visao Geral das Mudancas

```text
┌─────────────────────────────────────────────────────────────────┐
│                    ESTRUTURA DE URLs                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ARTIGOS                                                        │
│  /spaces/:spaceSlug/post/:postSlug                             │
│  Exemplo: /spaces/marketing/post/claude-e-salesforce-casamento │
│                                                                 │
│  PODCASTS                                                       │
│  /podcasts/:podcastSlug                                        │
│  Exemplo: /podcasts/batalha-dos-editores-de-ia-2026           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Migracao de Banco de Dados

### 1.1 Adicionar Campo `slug` nas Tabelas

```sql
-- Adicionar coluna slug em space_updates
ALTER TABLE public.space_updates 
  ADD COLUMN slug TEXT;

-- Adicionar coluna slug em podcasts
ALTER TABLE public.podcasts 
  ADD COLUMN slug TEXT;

-- Criar indices unicos para garantir slugs unicos por espaço/global
CREATE UNIQUE INDEX idx_space_updates_slug ON public.space_updates(space_id, slug);
CREATE UNIQUE INDEX idx_podcasts_slug ON public.podcasts(slug);
```

### 1.2 Funcao de Geracao de Slugs

```sql
-- Funcao para converter titulo em slug
CREATE OR REPLACE FUNCTION public.generate_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := lower(title);
  -- Remove acentos
  result := translate(result, 
    'àáâãäåèéêëìíîïòóôõöùúûüýÿñç',
    'aaaaaaeeeeiiiiooooouuuuyync');
  -- Remove caracteres especiais, mantém apenas letras, números e espaços
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  -- Substitui espaços por hifens
  result := regexp_replace(result, '\s+', '-', 'g');
  -- Remove hifens duplicados
  result := regexp_replace(result, '-+', '-', 'g');
  -- Remove hifens no inicio e fim
  result := trim(both '-' from result);
  -- Limita a 80 caracteres para URLs limpas
  result := left(result, 80);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 1.3 Trigger para Geracao Automatica

```sql
-- Trigger para gerar slug automaticamente no INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.set_slug_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_space_updates_slug
  BEFORE INSERT OR UPDATE ON public.space_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_slug_on_insert();

CREATE TRIGGER trigger_podcasts_slug
  BEFORE INSERT OR UPDATE ON public.podcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_slug_on_insert();
```

### 1.4 Migrar Dados Existentes

```sql
-- Gerar slugs para artigos existentes
UPDATE public.space_updates 
SET slug = public.generate_slug(title)
WHERE slug IS NULL;

-- Gerar slugs para podcasts existentes
UPDATE public.podcasts 
SET slug = public.generate_slug(title)
WHERE slug IS NULL;

-- Após migração, tornar NOT NULL
ALTER TABLE public.space_updates 
  ALTER COLUMN slug SET NOT NULL;

ALTER TABLE public.podcasts 
  ALTER COLUMN slug SET NOT NULL;
```

---

## Fase 2: Atualizacao dos Hooks

### 2.1 Hook `usePosts.ts`

Adicionar nova função para buscar artigo por slug:

```typescript
// Buscar artigo por slug do espaço e slug do post
export function useSpaceUpdateBySlug(spaceSlug: string | undefined, postSlug: string | undefined) {
  return useQuery({
    queryKey: ["space-update", spaceSlug, postSlug],
    queryFn: async () => {
      // Primeiro busca o espaço pelo slug
      const { data: space } = await supabase
        .from("spaces")
        .select("id")
        .eq("slug", spaceSlug)
        .single();
      
      if (!space) return null;

      // Depois busca o post pelo slug dentro do espaço
      const { data, error } = await supabase
        .from("space_updates")
        .select("*, spaces(name, slug)")
        .eq("space_id", space.id)
        .eq("slug", postSlug)
        .eq("is_published", true)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!spaceSlug && !!postSlug,
  });
}
```

### 2.2 Hook `usePodcasts.ts`

Adicionar nova função para buscar podcast por slug:

```typescript
// Buscar podcast por slug
export function usePodcastBySlug(podcastSlug: string | undefined) {
  return useQuery({
    queryKey: ["podcast-by-slug", podcastSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("podcasts")
        .select(`*, spaces(id, name, slug, icon)`)
        .eq("slug", podcastSlug)
        .eq("is_published", true)
        .single();

      if (error) return null;
      return data as Podcast;
    },
    enabled: !!podcastSlug,
  });
}
```

---

## Fase 3: Atualizacao de Rotas

### 3.1 App.tsx

Alterar parâmetros de rota:

```typescript
// Antes
<Route path="/spaces/:spaceId/post/:postId" element={...} />
<Route path="/podcasts/:podcastId" element={...} />

// Depois
<Route path="/spaces/:spaceSlug/post/:postSlug" element={...} />
<Route path="/podcasts/:podcastSlug" element={...} />
```

---

## Fase 4: Atualizacao de Paginas

### 4.1 PostDetail.tsx

- Mudar `useParams` para pegar `spaceSlug` e `postSlug`
- Usar novo hook `useSpaceUpdateBySlug` ao invés de buscar por ID

### 4.2 PodcastDetail.tsx

- Mudar `useParams` para pegar `podcastSlug`
- Usar novo hook `usePodcastBySlug` ao invés de buscar por ID

### 4.3 SpaceDetail.tsx

- Atualizar navegação para usar slug do post:

```typescript
// Antes
navigate(`/spaces/${spaceId}/post/${update.id}`);

// Depois
navigate(`/spaces/${spaceId}/post/${update.slug}`);
```

---

## Fase 5: Atualizacao de Componentes de Navegacao

### 5.1 PodcastCard.tsx

```typescript
// Antes
<Link to={`/podcasts/${podcast.id}`}>

// Depois
<Link to={`/podcasts/${podcast.slug}`}>
```

### 5.2 Home.tsx e Highlights.tsx

Atualizar links para usar slugs nos cards de artigos e podcasts.

---

## Fase 6: Atualizacao dos Headers (Compartilhamento)

### 6.1 PodcastHeader.tsx e PostHeader.tsx

As URLs de compartilhamento já usam `window.location.href`, então funcionarão automaticamente com a nova estrutura.

---

## Resumo de Arquivos a Modificar

| Operacao | Arquivo |
|----------|---------|
| **Migration SQL** | Adicionar campo slug, funcao, triggers e migrar dados |
| **Editar** | `src/hooks/usePosts.ts` - Adicionar `useSpaceUpdateBySlug` |
| **Editar** | `src/hooks/usePodcasts.ts` - Adicionar `usePodcastBySlug` |
| **Editar** | `src/App.tsx` - Atualizar parâmetros de rota |
| **Editar** | `src/pages/PostDetail.tsx` - Usar novo hook e parâmetros |
| **Editar** | `src/pages/PodcastDetail.tsx` - Usar novo hook e parâmetros |
| **Editar** | `src/pages/SpaceDetail.tsx` - Navegar com slug |
| **Editar** | `src/components/podcast/PodcastCard.tsx` - Link com slug |
| **Editar** | `src/pages/Home.tsx` - Links com slugs |
| **Editar** | `src/pages/Highlights.tsx` - Links com slugs |

---

## Resultado Esperado

Apos implementacao:

1. URLs legiveis e memoraveis para compartilhamento
2. Melhor indexacao pelo Google (SEO)
3. Experiencia profissional ao compartilhar links
4. Slugs gerados automaticamente a partir dos titulos
5. Compatibilidade retroativa (dados existentes migrados)
