

# Plano: Fix privacidade do chat + melhorias informativas

## Resumo

3 arquivos alterados. Bug crítico de privacidade + 2 melhorias de UX/contexto.

---

## 1. `src/hooks/useAIAssistant.ts` — chave por user_id

### Antes (linhas 1-6)
```typescript
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "subhumano_chat_history";
const MAX_MESSAGES = 100;
```

### Depois
```typescript
import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY_PREFIX = "subhumano_chat_history_";
const MAX_MESSAGES = 100;
```

### Antes — `loadMessages` e `saveMessages` (linhas 33-51)
Funções usam `STORAGE_KEY` fixo.

### Depois
Funções recebem `userId` como parâmetro:
```typescript
function getStorageKey(userId: string | null): string {
  return STORAGE_KEY_PREFIX + (userId || "anonymous");
}

function loadMessages(userId: string | null): Message[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(-MAX_MESSAGES);
  } catch { /* ignore */ }
  return [];
}

function saveMessages(messages: Message[], userId: string | null) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(messages.slice(-MAX_MESSAGES)));
  } catch { /* ignore */ }
}
```

### Antes — hook init (linhas 53-64)
```typescript
export function useAIAssistant(): UseAIAssistantReturn {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  ...
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);
```

### Depois
Adicionar tracking do userId e recarregar mensagens ao trocar de conta:
```typescript
export function useAIAssistant(): UseAIAssistantReturn {
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  ...

  // Detectar usuário atual e recarregar histórico ao trocar conta
  useEffect(() => {
    const loadForUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      userIdRef.current = uid;
      setUserId(uid);
      setMessages(loadMessages(uid));
    };
    loadForUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id || null;
      if (uid !== userIdRef.current) {
        userIdRef.current = uid;
        setUserId(uid);
        setMessages(loadMessages(uid));
        setLimitReached(false);
        setLimitInfo(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Persist messages on change
  useEffect(() => {
    saveMessages(messages, userId);
  }, [messages, userId]);
```

### Antes — `clearMessages` (linha 259)
```typescript
try { localStorage.removeItem(STORAGE_KEY); } catch {}
```

### Depois
```typescript
try { localStorage.removeItem(getStorageKey(userId)); } catch {}
```

---

## 2. `src/pages/AIAssistant.tsx` — aviso de sincronização

### Após as sugestões (depois da linha 190, antes do `</div>`)

Adicionar dentro do bloco `messages.length === 0`, após os botões de sugestão:

```tsx
<p className="text-xs text-muted-foreground text-center max-w-xs mt-2">
  💡 Suas conversas são salvas neste dispositivo. Para acessar o mesmo histórico em outro dispositivo, use o mesmo navegador.
</p>
```

---

## 3. `supabase/functions/ai-assistant/index.ts` — labels informativos

### Linha 375
**Antes:** `ctx += "\n[ARTIGOS RECENTES]\n"`
**Depois:** `ctx += "\n[ARTIGOS RECENTES — últimos 5 artigos publicados nos últimos 30 dias]\n"`

### Linha 365
**Antes:** `return "\n[PODCASTS RECENTES]\n"`
**Depois:** `return "\n[PODCASTS RECENTES — últimos 8 episódios publicados nos últimos 60 dias]\n"`

---

## Arquivos alterados

1. `src/hooks/useAIAssistant.ts` — chave per-user, auth listener, reset ao trocar conta
2. `src/pages/AIAssistant.tsx` — aviso de sincronização
3. `supabase/functions/ai-assistant/index.ts` — 2 labels

