
# Plano: Editor Rich Text na Área Admin (/admin/content)

## Contexto Atual

A página `/admin/content` (SpaceContent.tsx) usa um `<Textarea>` simples para criação de conteúdos dos Espaços, sem opções de:
- Formatação de texto (negrito, itálico, cores, listas)
- Anexar imagens, vídeos ou áudios
- Adicionar links

## Componentes Já Existentes

O projeto já possui componentes prontos que são usados nos Canais:

| Componente | Descrição |
|------------|-----------|
| `RichTextEditor` | Editor Tiptap com formatação completa |
| `EditorToolbar` | Barra de ferramentas (negrito, itálico, cores, links, listas, citações, código) |
| `MediaUploader` | Upload de imagens, vídeos, áudios, PDFs e YouTube |
| `useMediaUpload` | Hook para gerenciar uploads no Storage |

## Estrutura do Banco de Dados

A tabela `space_updates` já possui:
- `content` (text) - armazenará HTML do editor
- `thumbnail_url` (text) - URL da imagem de capa
- `media_type` (text) - tipo da mídia

Para suportar múltiplas mídias como nos Canais, será criada uma nova tabela `space_update_media` similar a `channel_post_media`.

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/admin/SpaceContent.tsx` | Substituir Textarea pelo RichTextEditor + MediaUploader |
| `src/hooks/useMediaUpload.ts` | Adicionar função para salvar mídia em space_updates |
| Nova migração SQL | Criar tabela `space_update_media` |

## Implementação Detalhada

### 1. Criar Tabela de Mídia para Space Updates

```sql
CREATE TABLE IF NOT EXISTS public.space_update_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES public.space_updates(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  youtube_id text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.space_update_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view space update media"
  ON public.space_update_media FOR SELECT USING (true);

CREATE POLICY "Admins can manage space update media"
  ON public.space_update_media FOR ALL
  USING (is_admin_or_moderator(auth.uid()));
```

### 2. Modificar SpaceContent.tsx

**Imports a adicionar:**
```tsx
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { MediaUploader } from '@/components/editor/MediaUploader';
import { useMediaUpload, MediaFile } from '@/hooks/useMediaUpload';
```

**Estado para mídia:**
```tsx
const [media, setMedia] = useState<MediaFile[]>([]);
const { saveMediaToSpaceUpdate } = useMediaUpload();
```

**Substituir o Textarea pelo RichTextEditor:**
```tsx
// Antes
<Textarea
  value={formData.content}
  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
  placeholder="Escreva o conteúdo aqui..."
  rows={8}
/>

// Depois
<RichTextEditor
  content={formData.content}
  onChange={(content) => setFormData({ ...formData, content })}
  placeholder="Escreva o conteúdo aqui..."
/>
```

**Adicionar seção de mídia:**
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-muted-foreground">
    Mídia
  </label>
  <MediaUploader
    media={media}
    onMediaAdd={(m) => setMedia(prev => [...prev, m])}
    onMediaRemove={(i) => setMedia(prev => prev.filter((_, idx) => idx !== i))}
  />
</div>
```

**Atualizar handleSave para salvar mídia:**
```tsx
const handleSave = async (publish = false) => {
  // ... criar update

  // Salvar mídia se houver
  if (media.length > 0 && result.data?.id) {
    await saveMediaToSpaceUpdate(result.data.id, media);
  }
  
  // Resetar mídia
  setMedia([]);
  // ...
};
```

### 3. Atualizar useMediaUpload.ts

Adicionar função para salvar mídia em space_updates:

```tsx
const saveMediaToSpaceUpdate = async (updateId: string, media: MediaFile[]) => {
  if (media.length === 0) return;

  const mediaRecords = media.map((m, index) => ({
    update_id: updateId,
    file_url: m.url,
    file_type: m.type,
    file_name: m.name,
    file_size: m.size || null,
    mime_type: m.mimeType || null,
    youtube_id: m.youtubeId || null,
    sort_order: index,
  }));

  const { error } = await supabase
    .from("space_update_media")
    .insert(mediaRecords);

  if (error) {
    console.error("Error saving media:", error);
    toast.error("Erro ao salvar mídias");
  }
};
```

### 4. Layout Visual do Dialog Atualizado

```text
┌─────────────────────────────────────────────────────────────┐
│  Novo Conteúdo                                              │
├─────────────────────────────────────────────────────────────┤
│  Espaço                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Selecione um espaço                             ▼   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Título                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Título do conteúdo                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Conteúdo                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [B] [I] [U] │ [🎨] [🖍] │ [🔗] │ [•] [1.] │ ["] [<>] │   │  ← Toolbar
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  Área de edição rich text                          │   │  ← Editor
│  │  com formatação visual                              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Mídia                                                      │
│  ┌───────────┐ ┌───────────┐                               │
│  │  🖼 img1  │ │  🎬 video │  ← Preview das mídias         │
│  └───────────┘ └───────────┘                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              + Adicionar mídia                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Agendar para (opcional)                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📅 dd/mm/aaaa hh:mm                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐ ┌──────────────────────────┐    │
│  │   Salvar Rascunho    │ │    Publicar Agora  ✨    │    │
│  └──────────────────────┘ └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Funcionalidades Incluídas

| Recurso | Descrição |
|---------|-----------|
| Negrito, Itálico, Sublinhado | Formatação básica de texto |
| Cores de texto | 10 cores para personalização |
| Marcador (highlight) | 7 cores de destaque |
| Links | Inserir e editar URLs |
| Listas | Bullets e numeradas |
| Citações | Blocos de citação estilizados |
| Código | Formatação de código inline |
| Upload de imagens | JPG, PNG, GIF, WebP (até 50MB) |
| Upload de vídeos | MP4, WebM, MOV (até 50MB) |
| Upload de áudios | MP3, WAV, OGG (até 50MB) |
| Upload de PDFs | Documentos PDF (até 50MB) |
| YouTube | Embed via URL |

## Considerações Técnicas

### Armazenamento de Mídia
- Os arquivos serão salvos no bucket `channel-media` do Storage (já configurado)
- As URLs públicas serão armazenadas na tabela `space_update_media`
- Limite de 50MB por arquivo (política existente)

### Edição de Conteúdo Existente
- Ao editar um conteúdo, carregar as mídias associadas da tabela `space_update_media`
- Permitir adicionar/remover mídias durante a edição
- Ao salvar, atualizar a lista de mídias (deletar antigas, inserir novas)

### Compatibilidade
- O conteúdo HTML gerado pelo Tiptap será renderizado corretamente no frontend
- O componente `PostContent.tsx` já usa DOMPurify para sanitização segura

## Resultado Esperado

1. Administradores terão acesso a um editor rich text completo
2. Poderão formatar texto com negrito, itálico, cores, listas, etc.
3. Poderão anexar múltiplas imagens, vídeos, áudios e PDFs
4. Poderão incorporar vídeos do YouTube
5. Poderão adicionar links clicáveis
6. Interface consistente com o editor já usado nos Canais
