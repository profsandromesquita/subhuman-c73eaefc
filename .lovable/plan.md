

# Plano: Nome do Autor Real com Modal de Perfil

## Problema Identificado

Analisando a imagem e o código, identifiquei que:

1. **Nome do autor fixo "Admin"**: Na linha 545 de `PostDetail.tsx`, o `authorName` esta hardcoded como `"Admin"`:
   ```tsx
   authorName="Admin"
   ```

2. **Dados do autor nao sao buscados**: A query de fetch do post (linhas 75-87) nao inclui o `author_id` nem busca os dados do perfil do autor.

3. **Campos de redes sociais inexistentes**: A tabela `profiles` nao possui os campos `instagram_url` e `linkedin_url`.

---

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| Nova migracao SQL | Adicionar `instagram_url` e `linkedin_url` na tabela `profiles` |
| `src/pages/profile/PersonalData.tsx` | Adicionar campos para Instagram e LinkedIn no formulario |
| `src/pages/PostDetail.tsx` | Buscar dados do autor via `author_id` e passar para `PostContent` |
| `src/components/post/PostContent.tsx` | Nome do autor clicavel que abre modal com informacoes |
| Novo componente `AuthorModal.tsx` | Modal com foto, nome, bio, formacao e redes sociais |

---

## Implementacao Detalhada

### 1. Migracao SQL - Adicionar Campos de Redes Sociais

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS linkedin_url text;
```

### 2. Atualizar PersonalData.tsx

**Adicionar campos no formulario:**
```tsx
// Nova secao de Redes Sociais
<ProfileFormSection icon={<Share className="h-5 w-5" />} title="Redes sociais">
  <div className="space-y-2">
    <Label htmlFor="instagram_url">Instagram</Label>
    <Input
      id="instagram_url"
      value={formData.instagram_url}
      onChange={(e) => handleInputChange("instagram_url", e.target.value)}
      placeholder="https://instagram.com/seu_usuario"
    />
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="linkedin_url">LinkedIn</Label>
    <Input
      id="linkedin_url"
      value={formData.linkedin_url}
      onChange={(e) => handleInputChange("linkedin_url", e.target.value)}
      placeholder="https://linkedin.com/in/seu_usuario"
    />
  </div>
</ProfileFormSection>
```

**Atualizar formData e handleSave para incluir os novos campos.**

### 3. Atualizar PostDetail.tsx

**Modificar interface Post:**
```tsx
interface Post {
  // ... campos existentes
  author_id: string | null;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    education: string | null;
    instagram_url: string | null;
    linkedin_url: string | null;
  } | null;
}
```

**Modificar query (linhas 73-90):**
```tsx
const { data: postData, error: postError } = await supabase
  .from("space_updates")
  .select(`
    id,
    title,
    content,
    thumbnail_url,
    media_type,
    published_at,
    created_at,
    author_id,
    spaces (
      name,
      slug
    )
  `)
  .eq("id", postId)
  .eq("is_published", true)
  .maybeSingle();

// Buscar perfil do autor separadamente
let authorProfile = null;
if (postData?.author_id) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, bio, education, instagram_url, linkedin_url")
    .eq("id", postData.author_id)
    .maybeSingle();
  authorProfile = profile;
}
```

**Passar dados do autor para PostContent:**
```tsx
<PostContent
  // ... outros props
  authorName={post.author?.full_name || "Autor"}
  author={post.author}
  // ...
/>
```

### 4. Atualizar PostContent.tsx

**Novas props:**
```tsx
interface Author {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  education: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
}

interface PostContentProps {
  // ... props existentes
  author?: Author | null;
}
```

**Tornar nome do autor clicavel (linhas 90-104):**
```tsx
const [showAuthorModal, setShowAuthorModal] = useState(false);

// ...

<div className="flex items-center gap-3 text-sm text-muted-foreground mb-8">
  <button 
    onClick={() => author && setShowAuthorModal(true)}
    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
  >
    <Avatar className="w-8 h-8">
      <AvatarImage src={author?.avatar_url || undefined} />
      <AvatarFallback className="bg-secondary">
        <User className="w-4 h-4" weight="bold" />
      </AvatarFallback>
    </Avatar>
    <span className="font-medium text-foreground hover:underline cursor-pointer">
      {authorName}
    </span>
  </button>
  <span>•</span>
  <span>{publishedAt}</span>
  <span>•</span>
  <span className="flex items-center gap-1">
    <Clock className="w-3.5 h-3.5" />
    {readTime}
  </span>
</div>

{/* Modal do Autor */}
<AuthorModal 
  author={author} 
  isOpen={showAuthorModal} 
  onClose={() => setShowAuthorModal(false)} 
/>
```

### 5. Novo Componente AuthorModal.tsx

```tsx
// src/components/post/AuthorModal.tsx

interface AuthorModalProps {
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    education: string | null;
    instagram_url: string | null;
    linkedin_url: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuthorModal({ author, isOpen, onClose }: AuthorModalProps) {
  if (!author) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <Avatar className="w-20 h-20 mb-4">
            <AvatarImage src={author.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-secondary">
              {getInitials(author.full_name)}
            </AvatarFallback>
          </Avatar>

          {/* Nome */}
          <h2 className="text-xl font-bold mb-1">
            {author.full_name || "Autor"}
          </h2>

          {/* Formacao */}
          {author.education && (
            <p className="text-sm text-muted-foreground mb-4">
              {author.education}
            </p>
          )}

          {/* Biografia */}
          {author.bio && (
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {author.bio}
            </p>
          )}

          {/* Redes Sociais */}
          <div className="flex gap-3">
            {author.instagram_url && (
              <a 
                href={author.instagram_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <InstagramLogo className="w-5 h-5" />
                <span className="text-sm">Instagram</span>
              </a>
            )}
            {author.linkedin_url && (
              <a 
                href={author.linkedin_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <LinkedinLogo className="w-5 h-5" />
                <span className="text-sm">LinkedIn</span>
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Layout Visual do Modal do Autor

```text
┌─────────────────────────────────────────────┐
│                    [X]                      │
│                                             │
│              ┌──────────┐                   │
│              │   FOTO   │                   │
│              │  80x80   │                   │
│              └──────────┘                   │
│                                             │
│           Sandro Mesquita                   │
│     Mestrado em Inteligencia Artificial     │
│                                             │
│   "Apaixonado por IA e como ela pode        │
│    transformar negocios. Compartilho        │
│    insights e descobertas diariamente."     │
│                                             │
│    ┌────────────────┐ ┌────────────────┐   │
│    │ 📸 Instagram   │ │ 💼 LinkedIn    │   │
│    └────────────────┘ └────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Fluxo de Dados

```text
1. Usuario abre artigo
   │
   ▼
2. PostDetail.tsx busca post com author_id
   │
   ├──► Busca perfil do autor na tabela profiles
   │    (full_name, bio, education, instagram_url, linkedin_url)
   │
   ▼
3. PostContent exibe nome do autor (nao mais "Admin")
   │
   ▼
4. Usuario clica no nome do autor
   │
   ▼
5. Modal abre com informacoes completas
   │
   └──► Links de Instagram e LinkedIn clicaveis
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| `authorName="Admin"` fixo | Nome real do usuario (ex: "Sandro Mesquita") |
| Nome nao clicavel | Nome clicavel que abre modal |
| Sem redes sociais | Modal com Instagram e LinkedIn |
| Campos inexistentes no profile | Novos campos para cadastrar redes sociais |

---

## Ordem de Implementacao

1. **Migracao SQL** - Adicionar campos `instagram_url` e `linkedin_url`
2. **PersonalData.tsx** - Adicionar formulario para redes sociais
3. **AuthorModal.tsx** - Criar componente do modal
4. **PostDetail.tsx** - Buscar dados do autor
5. **PostContent.tsx** - Tornar nome clicavel e integrar modal

