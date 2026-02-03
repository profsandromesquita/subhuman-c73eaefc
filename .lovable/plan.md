
# Plano: Permitir Edição e Exclusão de Publicações nos Canais

## Problema Identificado

Analisando o código e as políticas RLS do banco de dados, identifiquei que:

1. **Políticas RLS atuais:**
   - Autores podem ATUALIZAR suas próprias publicações
   - Admins/moderadores podem ATUALIZAR e EXCLUIR qualquer publicação
   - **Falta:** Autores não podem EXCLUIR suas próprias publicações

2. **Interface sem botões de ação:** A página `ChannelPostDetail.tsx` não possui menu dropdown com opções de editar/excluir

3. **Sem mutations no hook:** O `usePosts.ts` não possui funções para deletar ou atualizar publicações

4. **Sem página de edição:** Não existe uma rota ou lógica para editar publicações existentes

---

## Solução Proposta

### 1. Adicionar Política RLS para Autores Excluírem

```sql
CREATE POLICY "Authors can delete own posts" 
ON public.channel_posts 
FOR DELETE 
TO authenticated 
USING (auth.uid() = author_id);
```

### 2. Adicionar Mutations no usePosts.ts

```typescript
// Deletar publicação
export function useDeleteChannelPost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (postId: string) => {
      // Primeiro deletar mídia associada
      await supabase
        .from("channel_post_media")
        .delete()
        .eq("post_id", postId);
      
      // Depois deletar comentários e likes
      await supabase
        .from("channel_post_comments")
        .delete()
        .eq("post_id", postId);
      
      await supabase
        .from("channel_post_likes")
        .delete()
        .eq("post_id", postId);
      
      // Finalmente deletar o post
      const { error } = await supabase
        .from("channel_posts")
        .delete()
        .eq("id", postId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-posts"] });
      queryClient.invalidateQueries({ queryKey: ["recent-discussions"] });
    },
  });
}

// Atualizar publicação
export function useUpdateChannelPost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      postId, 
      title, 
      content 
    }: { 
      postId: string; 
      title: string | null; 
      content: string 
    }) => {
      const { error } = await supabase
        .from("channel_posts")
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq("id", postId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-posts"] });
    },
  });
}
```

### 3. Adicionar Menu Dropdown no ChannelPostDetail.tsx

Na seção do autor (linha ~447), adicionar um menu de três pontos:

```text
┌─────────────────────────────────────────────┐
│  [◄]  Canal Nome                            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────┐                        ┌───┐     │
│  │ 👤  │  Nome do Autor         │ ⋮ │     │
│  └──────┘  há 2 horas            └───┘     │
│                                    │        │
│                        ┌───────────┴───┐   │
│                        │ ✏️ Editar     │   │
│                        │ 🗑️ Excluir    │   │
│                        └───────────────┘   │
│                                             │
│  Título da Publicação                       │
│  ...                                        │
└─────────────────────────────────────────────┘
```

**Lógica de exibição:**
- Mostrar menu se: `user?.id === post.author_id || isAdminOrModerator`
- Autor vê: "Editar" e "Excluir"
- Admin vê: apenas "Excluir" (moderação)

### 4. Modificar CreateChannelPost para Modo de Edição

Reutilizar a página existente com parâmetro opcional `postId`:
- Nova rota: `/channels/:channelId/edit/:postId`
- Se `postId` existe, buscar dados e preencher formulário
- Botão muda de "Publicar" para "Salvar alterações"

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| Nova migração SQL | Adicionar política RLS para autores excluírem |
| `src/hooks/usePosts.ts` | Adicionar `useDeleteChannelPost` e `useUpdateChannelPost` |
| `src/pages/ChannelPostDetail.tsx` | Adicionar dropdown com opções de editar/excluir |
| `src/pages/CreateChannelPost.tsx` | Adicionar suporte a modo de edição |
| `src/App.tsx` | Adicionar rota `/channels/:channelId/edit/:postId` |

---

## Implementação Detalhada

### 1. Migração SQL

```sql
-- Permitir que autores excluam suas próprias publicações
CREATE POLICY "Authors can delete own posts" 
ON public.channel_posts 
FOR DELETE 
TO authenticated 
USING (auth.uid() = author_id);
```

### 2. Atualização do usePosts.ts

Adicionar duas novas mutations:

```typescript
// Hook para deletar publicação de canal
export function useDeleteChannelPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      // Deletar registros relacionados primeiro
      await supabase.from("channel_post_comment_likes").delete()
        .in("comment_id", supabase.from("channel_post_comments").select("id").eq("post_id", postId));
      await supabase.from("channel_post_comments").delete().eq("post_id", postId);
      await supabase.from("channel_post_likes").delete().eq("post_id", postId);
      await supabase.from("channel_post_media").delete().eq("post_id", postId);
      
      // Deletar o post
      const { error } = await supabase
        .from("channel_posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-posts"] });
      queryClient.invalidateQueries({ queryKey: ["recent-discussions"] });
    },
  });
}

// Hook para atualizar publicação de canal
export function useUpdateChannelPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      title,
      content,
    }: {
      postId: string;
      title: string | null;
      content: string;
    }) => {
      const { error } = await supabase
        .from("channel_posts")
        .update({
          title,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-posts"] });
    },
  });
}
```

### 3. Atualização do ChannelPostDetail.tsx

**Novos imports:**
```typescript
import { DotsThree, Pencil, Trash } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useDeleteChannelPost } from "@/hooks/usePosts";
```

**Novos estados e hooks:**
```typescript
const { isAdminOrModerator } = useAdminAuth();
const deleteMutation = useDeleteChannelPost();
const [showDeleteDialog, setShowDeleteDialog] = useState(false);

const canEdit = user?.id === post?.author_id;
const canDelete = user?.id === post?.author_id || isAdminOrModerator;
const showActions = canEdit || canDelete;
```

**Handler de exclusão:**
```typescript
const handleDelete = async () => {
  try {
    await deleteMutation.mutateAsync(postId!);
    toast.success("Publicação excluída!");
    navigate(`/channels/${channelId}`);
  } catch (error) {
    toast.error("Erro ao excluir publicação");
  }
};
```

**Menu dropdown (após o nome do autor, linha ~456):**
```tsx
{/* Author section */}
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
    <Avatar className="w-10 h-10">
      <AvatarImage src={post.author_avatar || undefined} />
      <AvatarFallback>{post.author_name?.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
    <div>
      <p className="font-medium">{post.author_name}</p>
      <p className="text-sm text-muted-foreground">{formatTime(post.created_at)}</p>
    </div>
  </div>

  {showActions && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <DotsThree className="w-5 h-5" weight="bold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && (
          <DropdownMenuItem onClick={() => navigate(`/channels/${channelId}/edit/${postId}`)}>
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-500 focus:text-red-500"
          >
            <Trash className="w-4 h-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )}
</div>

{/* Diálogo de confirmação de exclusão */}
<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Excluir publicação?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação não pode ser desfeita. A publicação será permanentemente excluída.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
        Excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 4. Modo de Edição no CreateChannelPost.tsx

**Modificar para aceitar postId opcional:**
```typescript
const { channelId, postId } = useParams<{ channelId: string; postId?: string }>();
const isEditMode = !!postId;
```

**Buscar dados do post para edição:**
```typescript
useEffect(() => {
  if (postId) {
    fetchPostForEdit();
  }
}, [postId]);

const fetchPostForEdit = async () => {
  const { data: post, error } = await supabase
    .from("channel_posts")
    .select("title, content, author_id")
    .eq("id", postId)
    .single();

  if (error || !post) {
    toast.error("Publicação não encontrada");
    navigate(`/channels/${channelId}`);
    return;
  }

  // Verificar se é o autor
  if (post.author_id !== user?.id) {
    toast.error("Você não pode editar esta publicação");
    navigate(`/channels/${channelId}`);
    return;
  }

  setTitle(post.title || "");
  setContent(post.content);

  // Buscar mídia existente
  const { data: mediaData } = await supabase
    .from("channel_post_media")
    .select("*")
    .eq("post_id", postId)
    .order("sort_order");

  if (mediaData) {
    setMedia(mediaData.map(m => ({
      url: m.file_url,
      type: m.file_type as any,
      name: m.file_name,
      youtubeId: m.youtube_id,
    })));
  }
};
```

**Modificar handleSubmit para update:**
```typescript
const handleSubmit = async () => {
  // ... validações existentes ...

  if (isEditMode) {
    // Modo de edição
    const { error } = await supabase
      .from("channel_posts")
      .update({
        title: title.trim() || null,
        content: content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    if (error) {
      toast.error("Erro ao atualizar publicação");
      return;
    }

    toast.success("Publicação atualizada!");
    navigate(`/channels/${channelId}/post/${postId}`);
  } else {
    // Modo de criação (código existente)
    // ...
  }
};
```

### 5. Adicionar Rota no App.tsx

```typescript
// Adicionar rota de edição
<Route 
  path="/channels/:channelId/edit/:postId" 
  element={
    <SubscriptionGuard>
      <CreateChannelPost />
    </SubscriptionGuard>
  } 
/>
```

---

## Fluxo de Usuário

```text
AUTOR DA PUBLICAÇÃO:
┌─────────────────────────────────────────────┐
│  Abre publicação → Vê menu ⋮               │
│                     │                       │
│                     ├──► Editar             │
│                     │    └──► Abre form     │
│                     │         └──► Salva    │
│                     │                       │
│                     └──► Excluir            │
│                          └──► Confirma      │
│                               └──► Volta    │
└─────────────────────────────────────────────┘

ADMIN/MODERADOR:
┌─────────────────────────────────────────────┐
│  Abre publicação de qualquer usuário        │
│  → Vê menu ⋮ apenas com "Excluir"           │
│  → Pode remover conteúdo impróprio          │
└─────────────────────────────────────────────┘
```

---

## Resultado Esperado

| Usuário | Ação | Antes | Depois |
|---------|------|-------|--------|
| Autor | Editar própria publicação | Impossível | Menu → Editar |
| Autor | Excluir própria publicação | Impossível | Menu → Excluir |
| Admin | Excluir qualquer publicação | Só via painel admin | Menu → Excluir |

---

## Ordem de Implementação

1. **Migração SQL** - Adicionar política RLS para autores excluírem
2. **usePosts.ts** - Adicionar mutations `useDeleteChannelPost` e `useUpdateChannelPost`
3. **App.tsx** - Adicionar rota de edição
4. **CreateChannelPost.tsx** - Adicionar modo de edição
5. **ChannelPostDetail.tsx** - Adicionar dropdown menu com ações
