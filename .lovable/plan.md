

# Plano de Correção: Sistema de Notificações Push

## Diagnóstico do Problema

### Problema Identificado

| Sintoma | Causa Raiz |
|---------|------------|
| Botão "Ativar notificações" não responde ao clique | A variável `VITE_VAPID_PUBLIC_KEY` está **vazia** no arquivo `.env` |
| Erro no console: "VAPID_PUBLIC_KEY não configurada" | Hook retorna `false` imediatamente na linha 89-93 do código |
| Botão "Agora não" funciona | Não depende da VAPID key, apenas salva no localStorage |

### Fluxo Atual (Quebrado)

```text
Usuário clica "Ativar notificações"
        │
        ▼
handleSubscribe() → subscribe()
        │
        ▼
Verifica VAPID_PUBLIC_KEY → VAZIA!
        │
        ▼
console.error('VAPID_PUBLIC_KEY não configurada')
        │
        ▼
setState({ error: 'Configuração incompleta' })
        │
        ▼
return false (silenciosamente)
```

O botão parece "não clicável" porque o hook detecta que a chave VAPID não está configurada no frontend e falha silenciosamente, sem feedback visual para o usuário.

### Estado Atual da Configuração

| Componente | Status | Descrição |
|------------|--------|-----------|
| Secret `VAPID_PUBLIC_KEY` no backend | OK | Configurada nos secrets do backend |
| Secret `VAPID_PRIVATE_KEY` no backend | OK | Configurada nos secrets do backend |
| Variável `VITE_VAPID_PUBLIC_KEY` no .env | VAZIA | Não foi copiada para o frontend |
| Service Worker (`sw.js`) | OK | Implementado corretamente |
| Hook `usePushNotifications` | PARCIAL | Falta feedback de erro visível |
| Edge Function | PARCIAL | Criptografia Web Push incompleta |

## Problemas a Corrigir

### 1. VAPID Key no Frontend (CRÍTICO)

O arquivo `.env` está assim:

```text
VITE_VAPID_PUBLIC_KEY=""
```

A chave pública VAPID precisa ser copiada do secret do backend para o frontend. Isso não foi feito automaticamente.

### 2. Falta de Feedback Visual

Quando o subscribe falha, o usuário não recebe nenhuma indicação visual. O botão simplesmente "não faz nada".

### 3. Edge Function - Criptografia Incompleta

A edge function atual não implementa a criptografia completa do Web Push (RFC 8291). Isso pode causar falhas ao enviar para alguns browsers.

## Correções Propostas

### Correção 1: Configurar VAPID Key no Frontend

Copiar a chave pública VAPID do secret para a variável de ambiente do frontend.

**Opção A (Recomendada)**: Hardcode no código
- Vantagem: Funciona imediatamente
- A chave pública não é secreta, pode estar no código

**Opção B**: Buscar dinamicamente do backend
- Criar endpoint que retorna a chave pública
- Mais complexo, mas mais flexível

Usaremos a **Opção A** por simplicidade.

### Correção 2: Melhorar Feedback de Erro no Banner

Modificar o `PushPermissionBanner` para:
- Mostrar toast de erro quando falhar
- Exibir mensagem clara se as notificações não estiverem configuradas
- Dar feedback visual durante o loading

### Correção 3: Simplificar Edge Function

Para o MVP, usar uma abordagem mais simples que funcione:
- Implementar usando a biblioteca `web-push` via npm
- Ou usar um serviço externo como OneSignal/Firebase

Por ora, vamos manter a edge function atual mas garantir que o fluxo básico funcione.

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/usePushNotifications.ts` | Modificar | Buscar VAPID key do backend ou usar hardcoded |
| `src/components/PushPermissionBanner.tsx` | Modificar | Adicionar feedback visual de erro |
| `supabase/functions/get-vapid-public-key/index.ts` | Criar | Endpoint para fornecer a chave pública |

## Implementação Detalhada

### 1. Criar Edge Function para Fornecer VAPID Key

Nova edge function que retorna a chave pública VAPID de forma segura:

```typescript
// supabase/functions/get-vapid-public-key/index.ts
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  
  return new Response(
    JSON.stringify({ publicKey: vapidPublicKey || null }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
```

### 2. Atualizar Hook para Buscar VAPID Key Dinamicamente

Modificar o hook para buscar a chave do backend se não estiver no .env:

```typescript
// src/hooks/usePushNotifications.ts

// Buscar VAPID key do backend
const fetchVapidKey = async (): Promise<string | null> => {
  // Primeiro tenta do .env
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (envKey) return envKey;
  
  // Senão busca do backend
  try {
    const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
    if (error) throw error;
    return data?.publicKey || null;
  } catch (e) {
    console.error('Erro ao buscar VAPID key:', e);
    return null;
  }
};
```

### 3. Melhorar Feedback no Banner

Adicionar toast de erro e mensagem visual quando falhar:

```typescript
// src/components/PushPermissionBanner.tsx
import { toast } from 'sonner';

const handleSubscribe = async () => {
  const success = await subscribe();
  if (success) {
    toast.success('Notificações ativadas!');
    setIsVisible(false);
  } else {
    // Mostrar erro baseado no state.error
    toast.error(error || 'Não foi possível ativar as notificações');
  }
};
```

### 4. Adicionar Estado de Erro Visível

Mostrar mensagem de erro diretamente no banner se algo falhar:

```tsx
{error && (
  <p className="text-xs text-red-400 mt-2">
    {error}
  </p>
)}
```

## Fluxo Corrigido

```text
Usuário clica "Ativar notificações"
        │
        ▼
handleSubscribe() → subscribe()
        │
        ├── VAPID key do .env? → Não
        │
        ▼
Busca VAPID key do backend (get-vapid-public-key)
        │
        ▼
Solicita permissão do browser
        │
        ├── Usuário permite → Registra SW → Salva subscription → SUCESSO
        │
        └── Usuário nega → toast.error('Permissão negada')
```

## Seção Técnica

### Sobre a Chave VAPID Pública

A chave pública VAPID **não é um segredo**. Ela pode ser:
- Exposta no frontend
- Hardcoded no código
- Enviada via endpoint público

Apenas a chave **privada** precisa ficar protegida no backend.

### Formato da Chave VAPID

A chave pública é uma string Base64URL, tipicamente com ~87 caracteres:

```text
BLBx-hf5H3...kJ7g
```

### Alternativa: Hardcode Temporário

Se preferir uma solução imediata, podemos fazer o hook buscar a chave diretamente do backend e armazená-la em cache no localStorage:

```typescript
const VAPID_CACHE_KEY = 'vapid-public-key';

const getVapidKey = async () => {
  // Verifica cache
  const cached = localStorage.getItem(VAPID_CACHE_KEY);
  if (cached) return cached;
  
  // Busca do backend
  const { data } = await supabase.functions.invoke('get-vapid-public-key');
  if (data?.publicKey) {
    localStorage.setItem(VAPID_CACHE_KEY, data.publicKey);
    return data.publicKey;
  }
  
  return null;
};
```

## Resultado Esperado

Após implementação:

1. Botão "Ativar notificações" funcionará corretamente
2. Usuário verá feedback visual de sucesso ou erro
3. Sistema buscará automaticamente a chave VAPID do backend
4. Não dependerá mais do arquivo `.env` para a chave pública
5. Erros serão exibidos claramente ao usuário

## Ordem de Implementação

1. Criar edge function `get-vapid-public-key`
2. Atualizar hook `usePushNotifications` para buscar chave dinamicamente
3. Atualizar `PushPermissionBanner` com feedback de erro
4. Testar fluxo completo

