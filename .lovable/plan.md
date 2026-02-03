

# Plano de Correção: Bug de Refresh que Perde Conteúdo Digitado

## Problema Identificado

O usuário relata que a página está fazendo refresh automático e, quando isso acontece, o conteúdo que estava sendo digitado é perdido. Analisando o código e os logs, identifiquei **múltiplas causas raiz**:

---

## Causas Raiz

### 1. Editor Tiptap Não Sincroniza com Props Externas

O `RichTextEditor` usa `useEditor` do Tiptap, que inicializa o editor com o valor de `content` apenas **uma vez**. Se o componente pai re-renderizar e passar um novo `content`, o editor **não atualiza** - ele mantém o estado interno antigo.

**Problema no código:**
```tsx
// src/components/editor/RichTextEditor.tsx
const editor = useEditor({
  content,  // ← Só é lido na inicialização!
  onUpdate: ({ editor }) => {
    onChange(editor.getHTML());
  },
});
```

Quando o pai re-renderiza por qualquer motivo, o editor pode ser destruído e recriado com `content=""` vazio, perdendo tudo.

---

### 2. SubscriptionGuard Re-renderiza e Mostra "Carregando..."

O `SubscriptionGuard` mostra `"Carregando..."` enquanto `authLoading || subLoading` é `true`. Se a sessão de autenticação for renovada (token refresh), isso dispara:

```tsx
// src/contexts/AuthContext.tsx
supabase.auth.onAuthStateChange((event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
  setLoading(false);  // ← loading fica true momentaneamente antes disso
});
```

Quando `loading` oscila, o guard mostra "Carregando..." e **desmonta todos os filhos**, incluindo formulários com dados não salvos.

---

### 3. useChannelAccess Dispara Re-fetch ao Mudar `user`

Em `CreateChannelPost`, o `useChannelAccess(channelId)` tem uma dependência em `user`:

```tsx
// src/hooks/useChannelAccess.ts
const checkAccess = useCallback(async () => { ... }, [channelId, user]);

useEffect(() => {
  checkAccess();
}, [checkAccess]);
```

Quando o `user` muda (mesmo sendo o mesmo usuário, mas com nova referência de objeto após token refresh), o efeito dispara novamente e pode causar re-render.

---

### 4. useAdminAuth Dispara Fetch de Roles a Cada Mudança de `user`

Similar ao problema anterior:

```tsx
// src/hooks/useAdminAuth.ts
useEffect(() => {
  if (!user) { ... }
  setTimeout(() => fetchRoles(user.id), 0);
}, [user, authLoading]);
```

---

## Solução Proposta

### 1. Estabilizar o Estado do Editor Tiptap

Modificar `RichTextEditor` para sincronizar com props externas usando `useEffect`:

```tsx
// Adicionar useEffect para sincronizar content inicial
useEffect(() => {
  if (editor && content && !editor.getText()) {
    editor.commands.setContent(content);
  }
}, [editor, content]);
```

Alternativamente, usar o parâmetro `immediatelyRender: false` para evitar problemas de SSR.

---

### 2. Evitar Desmontagem Durante Loading no SubscriptionGuard

Modificar o guard para **não desmontar os filhos** durante carregamento, apenas bloquear interação:

```tsx
// Antes (desmonta children)
if (authLoading || subLoading) {
  return <div>Carregando...</div>;
}

// Depois (mantém children, mostra overlay se necessário)
return (
  <>
    {(authLoading || subLoading) && (
      <div className="fixed inset-0 bg-background/50 z-50 flex items-center justify-center">
        <div className="animate-pulse">Carregando...</div>
      </div>
    )}
    {children}
  </>
);
```

---

### 3. Estabilizar Referência do `user` no AuthContext

Usar `useRef` ou comparação por ID para evitar re-renders desnecessários:

```tsx
// src/contexts/AuthContext.tsx
const prevUserIdRef = useRef<string | null>(null);

supabase.auth.onAuthStateChange((event, session) => {
  const newUserId = session?.user?.id ?? null;
  
  // Só atualiza se o ID mudou (evita re-render por token refresh)
  if (newUserId !== prevUserIdRef.current) {
    prevUserIdRef.current = newUserId;
    setUser(session?.user ?? null);
  }
  setSession(session);
  setLoading(false);
});
```

---

### 4. Memoizar `checkAccess` por ID ao Invés de Objeto

```tsx
// src/hooks/useChannelAccess.ts
const userId = user?.id;

const checkAccess = useCallback(async () => {
  // ... lógica existente usando userId
}, [channelId, userId]);  // ← userId string é estável
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/editor/RichTextEditor.tsx` | Adicionar sync com props e estabilizar inicialização |
| `src/components/SubscriptionGuard.tsx` | Não desmontar children durante loading |
| `src/contexts/AuthContext.tsx` | Estabilizar referência do user por ID |
| `src/hooks/useChannelAccess.ts` | Usar `user?.id` como dependência |
| `src/hooks/useAdminAuth.ts` | Usar `user?.id` como dependência |
| `src/hooks/useSubscription.ts` | Usar `user?.id` como dependência |

---

## Implementação Detalhada

### 1. RichTextEditor.tsx

```tsx
import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect } from "react";
// ... outros imports

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Escreva sua publicação..." 
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,  // ← Evita problemas de SSR
    extensions: [
      // ... extensões existentes
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor focus:outline-none",
      },
    },
  });

  // Sincronizar conteúdo inicial apenas quando editor é criado
  // e content está vazio no editor mas não na prop
  useEffect(() => {
    if (editor && content && editor.isEmpty) {
      editor.commands.setContent(content);
    }
  }, [editor]);

  // ... resto do componente
}
```

---

### 2. SubscriptionGuard.tsx

```tsx
export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { status, daysRemaining, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (authLoading || subLoading) return;
    if (!user) return;

    if (status === 'expired' || status === 'none') {
      setIsRedirecting(true);
      if (status === 'expired') {
        toast.error('Seu período de teste expirou. Escolha um plano para continuar.');
      }
      navigate('/plans', { replace: true });
      return;
    }
  }, [authLoading, subLoading, user, status, navigate]);

  // Mostra loading overlay, mas NÃO desmonta children
  if (authLoading || subLoading) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
        {/* Children ficam escondidos mas montados */}
        <div className="opacity-0 pointer-events-none">
          {children}
        </div>
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  if (isRedirecting || status === 'expired' || status === 'none') {
    return null;
  }

  return <>{children}</>;
}
```

---

### 3. AuthContext.tsx

```tsx
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
// ... imports

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newUserId = session?.user?.id ?? null;
        
        // Sempre atualiza a session (para tokens frescos)
        setSession(session);
        
        // Só atualiza user se o ID realmente mudou
        // Isso evita re-renders quando apenas o token é renovado
        if (newUserId !== currentUserIdRef.current) {
          currentUserIdRef.current = newUserId;
          setUser(session?.user ?? null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const userId = session?.user?.id ?? null;
      if (userId !== currentUserIdRef.current) {
        currentUserIdRef.current = userId;
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

### 4. useChannelAccess.ts

```tsx
export function useChannelAccess(channelId: string | undefined): ChannelAccessResult {
  const { user } = useAuth();
  const userId = user?.id;  // ← Extrair ID para estabilidade
  // ... estados

  const checkAccess = useCallback(async () => {
    // ... lógica existente, usar userId localmente se precisar
    if (!userId) {
      setHasAccess(false);
      setLoading(false);
      return;
    }
    // ...
  }, [channelId, userId]);  // ← Usar userId ao invés de user

  // ...
}
```

---

### 5. useAdminAuth.ts

```tsx
export function useAdminAuth() {
  const { user, session, loading: authLoading } = useAuth();
  const userId = user?.id;  // ← Extrair ID
  // ... estados

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchRoles(userId);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [userId, authLoading]);  // ← Usar userId

  // ...
}
```

---

### 6. useSubscription.ts

```tsx
export function useSubscription(): SubscriptionStatus {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;  // ← Extrair ID
  // ... estados

  const checkSubscription = useCallback(async () => {
    if (authLoading) {
      return { status: 'none', planType: null };
    }

    if (!userId) {  // ← Usar userId
      // ...
    }
    
    // ... usar userId nas queries
  }, [userId, authLoading]);  // ← Usar userId

  // ...
}
```

---

## Diagrama: Fluxo Antes vs Depois

```text
ANTES (Bug):
┌──────────────────────────────────────────────────────────────────┐
│  Token Refresh → onAuthStateChange                               │
│        │                                                         │
│        ▼                                                         │
│  setUser(newUserObject)  ← Novo objeto, mesmo ID                 │
│        │                                                         │
│        ▼                                                         │
│  Todos os hooks reagem (user mudou)                              │
│        │                                                         │
│        ▼                                                         │
│  SubscriptionGuard mostra "Carregando..."                        │
│        │                                                         │
│        ▼                                                         │
│  Children são DESMONTADOS                                        │
│        │                                                         │
│        ▼                                                         │
│  Estado do formulário PERDIDO!                                   │
└──────────────────────────────────────────────────────────────────┘

DEPOIS (Correção):
┌──────────────────────────────────────────────────────────────────┐
│  Token Refresh → onAuthStateChange                               │
│        │                                                         │
│        ▼                                                         │
│  Compara newUserId !== currentUserId                             │
│        │                                                         │
│        ├──► IDs iguais → NÃO atualiza user                       │
│        │                                                         │
│        ▼                                                         │
│  Hooks NÃO reagem (user não mudou)                               │
│        │                                                         │
│        ▼                                                         │
│  SubscriptionGuard NÃO mostra loading                            │
│        │                                                         │
│        ▼                                                         │
│  Children permanecem MONTADOS                                    │
│        │                                                         │
│        ▼                                                         │
│  Estado do formulário PRESERVADO!                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Ordem de Implementação

1. **AuthContext.tsx** - Estabilizar referência do user (impacto global)
2. **useSubscription.ts** - Usar userId como dependência
3. **useChannelAccess.ts** - Usar userId como dependência
4. **useAdminAuth.ts** - Usar userId como dependência
5. **SubscriptionGuard.tsx** - Não desmontar children durante loading
6. **RichTextEditor.tsx** - Sincronizar com props e estabilizar inicialização

---

## Resultado Esperado

| Situação | Antes | Depois |
|----------|-------|--------|
| Token refresh durante edição | Formulário resetado | Formulário preservado |
| Loading de subscription | Children desmontados | Children mantidos (overlay) |
| Re-render por mudança de user | Frequente | Apenas quando ID muda |
| Editor com conteúdo longo | Pode perder dados | Dados preservados |

