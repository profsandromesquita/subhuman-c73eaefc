
# Plano de Correcao: 4 Falhas Mobile Subhumano

## Diagnostico Completo

### Problema 1: Overflow na pagina de edicao de canais (/channels/)
**Causa identificada:** A pagina `CreateChannelPost.tsx` usa `pb-24` para padding inferior, mas o conteudo total (header + title + editor + media + tips) nao tem limite de altura controlado. Em telas pequenas, o conteudo ultrapassa a area visivel e botoes ficam inacessiveis.

**Arquivo:** `src/pages/CreateChannelPost.tsx`

### Problema 2: Campo de titulo sem contorno visivel
**Causa identificada:** O Input do titulo tem classes `border-none bg-transparent px-0`, removendo qualquer indicacao visual de que e um campo editavel.

**Arquivo:** `src/pages/CreateChannelPost.tsx` (linha 259)

### Problema 3: Botao voltar muito proximo ao topo na pagina /plans
**Causa identificada:** O container usa `pt-8` sem considerar a safe-area-inset do iOS (Dynamic Island/notch). O botao fica parcialmente oculto.

**Arquivo:** `src/pages/Plans.tsx` (linha 196)

### Problema 4: Notificacoes nao aparecem na pagina /notifications
**Causa identificada:** O trigger que cria notificacoes foi adicionado em 2026-02-03 19:25 UTC. Porem, os artigos publicados foram criados **antes** dessa data (11:29 UTC do mesmo dia). Portanto, o trigger nao disparou para eles. Alem disso, a unica notificacao existente na base e do tipo "info" (teste manual), sem notificacoes do tipo "update".

**Solucao necessaria:** 
1. Recriar notificacoes para conteudos ja publicados
2. Verificar se o trigger esta funcionando para novas publicacoes

---

## Plano de Implementacao

### Correcao 1: Overflow na edicao de canais

Alterar o layout para garantir scroll correto em mobile:

```text
src/pages/CreateChannelPost.tsx

Mudancas:
1. Adicionar min-h-screen ao container principal
2. Adicionar pt-safe ao container para respeitar safe areas
3. Adicionar overflow-y-auto no main
4. Reduzir o pb-24 para pb-32 garantindo espaco para navegacao
5. Envolver o conteudo em um ScrollArea se necessario
```

### Correcao 2: Campo de titulo com borda visivel

Modificar o Input do titulo para ter borda e background consistente:

```text
src/pages/CreateChannelPost.tsx (linha 254-260)

De:
className="text-lg font-medium border-none bg-transparent px-0 
  focus-visible:ring-0 placeholder:text-muted-foreground"

Para:
className="text-lg font-medium bg-input border border-border rounded-lg px-4 py-3 
  focus-visible:ring-1 focus-visible:ring-border 
  placeholder:text-muted-foreground"
```

### Correcao 3: Botao voltar com safe-area na /plans

Adicionar padding-top para safe-area do iOS:

```text
src/pages/Plans.tsx (linha 196)

De:
<div className="relative max-w-lg mx-auto px-6 pt-8 pb-12">

Para:
<div className="relative max-w-lg mx-auto px-6 pt-8 pt-safe pb-12">

E adicionar margem extra ao botao voltar (linha 201-209):

De:
className="flex items-center mb-12"

Para:
className="flex items-center mb-12 mt-4"
```

### Correcao 4: Criar notificacoes para conteudos publicados

**Opcao A - Migration SQL (recomendada):**

Executar uma migracao que cria notificacoes retroativas para todos os space_updates publicados:

```sql
-- Criar notificacoes para artigos ja publicados que nao geraram notificacoes
INSERT INTO public.notifications (user_id, title, message, type, space_id)
SELECT DISTINCT
  uss.user_id,
  'Novo em ' || s.name,
  su.title,
  'update',
  su.space_id
FROM public.space_updates su
JOIN public.spaces s ON s.id = su.space_id
JOIN public.user_space_subscriptions uss ON uss.space_id = su.space_id
JOIN public.profiles p ON p.id = uss.user_id
WHERE su.is_published = true
  AND su.created_at >= NOW() - INTERVAL '7 days'
  AND COALESCE(p.notify_space_updates, true) = true
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n 
    WHERE n.user_id = uss.user_id 
    AND n.space_id = su.space_id 
    AND n.message = su.title
  );
```

**Opcao B - Verificar trigger (complementar):**

Testar publicando um novo artigo via admin e verificar se notificacao e criada automaticamente.

---

## Resumo dos Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/CreateChannelPost.tsx` | Layout mobile-safe + borda no titulo |
| `src/pages/Plans.tsx` | Safe-area no topo + espaco para botao voltar |
| **Migration SQL** | Criar notificacoes retroativas |

---

## Resultado Esperado

1. Pagina de edicao de canal com scroll funcional em mobile
2. Campo de titulo claramente visivel e editavel
3. Botao voltar acessivel abaixo da Dynamic Island
4. Notificacoes de atualizacoes aparecem na pagina /notifications

---

## Secao Tecnica

### Detalhes do overflow mobile
O problema ocorre porque:
- O `header` e sticky com `top-0`
- O `main` tem `py-6 pb-24` mas nao tem altura maxima
- O `RichTextEditor` ja tem `max-h-[300px]` mas outros elementos somam

### Detalhes do trigger de notificacoes
- Trigger: `on_space_update_published`
- Funcao: `notify_space_update_published()`
- Dispara em: INSERT ou UPDATE de `is_published` na tabela `space_updates`
- O trigger foi criado **depois** dos ultimos artigos serem publicados

### Classes CSS para safe-area
Ja definidas em `src/index.css`:
```css
.pt-safe { padding-top: env(safe-area-inset-top, 0); }
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0); }
```
