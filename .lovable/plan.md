
# Plano de Correção: Formatação, Preview de Imagem e Inserção de Imagens no Texto

## Problemas Identificados

### Problema 1: Artigo Publicado Sem Formatação
A imagem 1 mostra que as tags HTML (`<p>`, `<em>`, `<strong>`, `<h3>`) aparecem como texto bruto ao invés de serem renderizadas.

**Causa Raiz:** O componente `PostContent.tsx` renderiza o conteúdo como texto simples:
```tsx
// Linha 100-102 - ERRADO
<div className="text-foreground/90 leading-relaxed space-y-4 whitespace-pre-wrap">
  {content}  // ← Renderiza HTML como texto puro
</div>
```

**Solução:** Usar `dangerouslySetInnerHTML` com `DOMPurify` (igual ao `ChannelPostDetail.tsx`):
```tsx
// CORRETO
<div 
  className="prose prose-sm dark:prose-invert max-w-none"
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
/>
```

---

### Problema 2: Imagem Preview Não Aparece no Card
A imagem 2 mostra que o card de preview não exibe a miniatura do artigo.

**Causa Raiz:** O sistema salva mídia na tabela `space_update_media`, mas:
1. Ao salvar, não atualiza o campo `thumbnail_url` da tabela `space_updates`
2. O card em `SpaceDetail.tsx` só verifica `update.thumbnail_url`

**Solução:** Ao salvar um conteúdo com mídia de imagem, definir automaticamente a primeira imagem como `thumbnail_url`:
```tsx
// Em handleSave do SpaceContent.tsx
const firstImage = media.find(m => m.type === 'image');
const updateData = {
  ...
  thumbnail_url: firstImage?.url || null,
  media_type: firstImage ? 'image' : null,
};
```

---

### Problema 3: Impossível Inserir Imagens no Meio do Texto
A imagem 3 mostra que a toolbar do editor não possui botão para inserir imagens no corpo do texto.

**Causa Raiz:** O `EditorToolbar.tsx` não implementa a funcionalidade de inserção de imagem inline. O componente `MediaUploader` apenas adiciona mídia separada, não dentro do editor Tiptap.

**Solução:** Adicionar botão de imagem na toolbar que:
1. Abre um modal para upload ou URL
2. Insere a imagem diretamente no cursor do editor usando `editor.chain().focus().setImage({ src: url })`

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/post/PostContent.tsx` | Renderizar HTML com DOMPurify + adicionar galeria de mídia |
| `src/pages/PostDetail.tsx` | Buscar mídia da tabela `space_update_media` |
| `src/pages/admin/SpaceContent.tsx` | Definir `thumbnail_url` automaticamente da primeira imagem |
| `src/components/editor/EditorToolbar.tsx` | Adicionar botão de inserção de imagem inline |

---

## Implementação Detalhada

### 1. Corrigir Renderização HTML no PostContent.tsx

**Adicionar import:**
```tsx
import DOMPurify from "dompurify";
import { MediaGallery } from "@/components/post/MediaGallery";
```

**Nova prop para mídia:**
```tsx
interface PostContentProps {
  // ... props existentes
  media?: Array<{
    id: string;
    file_url: string;
    file_type: string;
    file_name: string | null;
    youtube_id: string | null;
  }>;
}
```

**Substituir renderização do conteúdo (linhas 97-104):**
```tsx
{/* Content */}
<div 
  className="prose prose-sm dark:prose-invert max-w-none"
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content || '') }}
/>

{/* Media Gallery */}
{media && media.length > 0 && (
  <div className="mt-8">
    <MediaGallery media={media} />
  </div>
)}
```

---

### 2. Buscar Mídia no PostDetail.tsx

**Adicionar estado e fetch:**
```tsx
const [media, setMedia] = useState<any[]>([]);

// Dentro de fetchPostData(), após buscar o post:
const { data: mediaData } = await supabase
  .from("space_update_media")
  .select("*")
  .eq("update_id", postId)
  .order("sort_order");

setMedia(mediaData || []);
```

**Passar mídia para PostContent:**
```tsx
<PostContent
  {...props}
  media={media}
/>
```

---

### 3. Definir Thumbnail Automaticamente no SpaceContent.tsx

**Modificar handleSave (linha 111-122):**
```tsx
const handleSave = async (publish = false) => {
  try {
    // Encontrar primeira imagem para thumbnail
    const firstImage = media.find(m => m.type === 'image');

    const updateData = {
      space_id: formData.space_id,
      title: formData.title,
      content: formData.content,
      author_id: user?.id,
      is_published: publish,
      published_at: publish ? new Date().toISOString() : null,
      scheduled_at: formData.scheduled_at || null,
      thumbnail_url: firstImage?.url || null,  // ← NOVO
      media_type: firstImage ? 'image' : null   // ← NOVO
    };
    // ... resto do código
```

---

### 4. Adicionar Botão de Imagem na EditorToolbar.tsx

**Novos imports:**
```tsx
import { Image as ImageIcon } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaUpload } from "@/hooks/useMediaUpload";
```

**Novo estado e hook:**
```tsx
const [showImageDialog, setShowImageDialog] = useState(false);
const [imageUrl, setImageUrl] = useState("");
const { uploadFile, uploading } = useMediaUpload();
```

**Funções de inserção:**
```tsx
const insertImageFromUrl = () => {
  if (!editor || !imageUrl) return;
  const url = imageUrl.startsWith("http") ? imageUrl : `https://${imageUrl}`;
  editor.chain().focus().setImage({ src: url }).run();
  setImageUrl("");
  setShowImageDialog(false);
};

const handleImageUpload = async (files: FileList | null) => {
  if (!files || !editor) return;
  const file = files[0];
  const media = await uploadFile(file);
  if (media) {
    editor.chain().focus().setImage({ src: media.url }).run();
    setShowImageDialog(false);
  }
};
```

**Adicionar botão na toolbar (após o botão de Link):**
```tsx
{/* Image */}
<Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
  <DialogTrigger asChild>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
    >
      <ImageIcon className="w-4 h-4" />
    </Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Inserir imagem</DialogTitle>
    </DialogHeader>
    <Tabs defaultValue="url">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="url">URL</TabsTrigger>
        <TabsTrigger value="upload">Upload</TabsTrigger>
      </TabsList>
      <TabsContent value="url" className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="https://exemplo.com/imagem.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && insertImageFromUrl()}
          />
          <Button onClick={insertImageFromUrl} disabled={!imageUrl}>
            Inserir
          </Button>
        </div>
      </TabsContent>
      <TabsContent value="upload" className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="image-upload"
            onChange={(e) => handleImageUpload(e.target.files)}
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <ImageIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm">Clique para selecionar uma imagem</p>
          </label>
        </div>
      </TabsContent>
    </Tabs>
  </DialogContent>
</Dialog>
```

---

## Layout Visual da Nova Toolbar

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ [B] [I] [U] │ [🎨] [🖍] │ [🔗] [🖼] │ [•] [1.] │ ["] [</>] │            │
│ Bold Italic │ Cor  Dest │ Link Img │ Listas   │ Quote Code│            │
└─────────────────────────────────────────────────────────────────────────┘
                               ↑
                         NOVO BOTÃO DE IMAGEM
```

---

## Fluxo de Inserção de Imagem Inline

```text
1. Usuário clica no botão 🖼 na toolbar
   │
   ▼
2. Modal abre com duas abas:
   ┌─────────────────────────────┐
   │  [URL]  |  [Upload]         │
   ├─────────────────────────────┤
   │  https://...  [Inserir]     │
   │                             │
   │  ─── ou ───                 │
   │                             │
   │  📤 Clique para upload      │
   └─────────────────────────────┘
   │
   ▼
3. Imagem é inserida na posição do cursor:
   ┌─────────────────────────────┐
   │ Texto antes do cursor...   │
   │                             │
   │ [    Imagem inserida    ]  │
   │                             │
   │ ...texto depois do cursor  │
   └─────────────────────────────┘
```

---

## Resultado Esperado

| Problema | Antes | Depois |
|----------|-------|--------|
| Formatação | Tags HTML como texto | Texto formatado corretamente |
| Preview no card | Sem imagem | Mostra primeira imagem como thumbnail |
| Inserir imagem | Impossível | Botão na toolbar para inserir imagem inline |

---

## Considerações de Segurança

1. **DOMPurify**: Sanitiza HTML para prevenir XSS
2. **Upload**: Usa o mesmo bucket `channel-media` com políticas RLS existentes
3. **Limite de arquivo**: Mantém limite de 50MB por arquivo

---

## Ordem de Implementação

1. **PostContent.tsx** - Corrigir renderização HTML (impacto imediato nos artigos existentes)
2. **PostDetail.tsx** - Adicionar fetch de mídia
3. **SpaceContent.tsx** - Auto-definir thumbnail ao salvar
4. **EditorToolbar.tsx** - Adicionar botão de inserção de imagem

