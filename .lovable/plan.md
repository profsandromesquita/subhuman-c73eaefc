

# Plano: Mover getSession para dentro do while loop

## Arquivo: `src/pages/admin/TTSBackfill.tsx`

### Edição única (linhas 34-44)

Remover `getSession` de antes do loop e colocá-lo como primeira instrução dentro do `while`, renovando o token a cada iteração.

**Antes:**
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) throw new Error('Sessão inválida');

let remaining = 999;
let batch = 0;

while (remaining > 0) {
  batch++;
  setCurrentBatch(batch);
```

**Depois:**
```typescript
let remaining = 999;
let batch = 0;

while (remaining > 0) {
  batch++;
  setCurrentBatch(batch);

  // Renova o token a cada iteração — evita expiração em processos longos
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessão inválida');
```

### Edição secundária (linha 126)

Corrigir texto inconsistente: `"⏳ Processando em lotes de 5 artigos..."` → `"⏳ Processando 1 artigo por vez..."` (batch já é 1).

## Arquivo alterado

`src/pages/admin/TTSBackfill.tsx` — 2 edits

