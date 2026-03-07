

# Plano: Corrigir Build Quebrado

## Causa Raiz

O erro de build principal e a edge function `send-user-notification` que importa `npm:resend@4.0.0` sem ter um `deno.json` configurado. O Deno precisa de um arquivo `deno.json` com `nodeModulesDir: "auto"` para resolver dependencias npm.

Os erros de TypeScript em `Events.tsx` (linhas 360, 376, 377) parecem ser de uma versao cached — o codigo atual esta sintaticamente correto. Provavelmente serao resolvidos quando o build rodar novamente apos corrigir o erro da edge function.

## Correcao

### Unico passo: Criar `supabase/functions/send-user-notification/deno.json`

```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.49.1",
    "resend": "npm:resend@4.0.0"
  },
  "nodeModulesDir": "auto"
}
```

E atualizar o import no `index.ts` de:
```typescript
import { Resend } from "npm:resend@4.0.0";
```
Para:
```typescript
import { Resend } from "resend";
```

Isso segue o mesmo padrao ja usado em `send-push-notification/deno.json`.

## Risco

Nenhum. Apenas adiciona configuracao de dependencia que estava faltando.

