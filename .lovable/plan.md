
# Correcao: Pagina de Planos - Eventos, Trial e Precos

## 3 Problemas Identificados

### 1. Card do evento nao aparece na pagina de Planos

**Causa**: O evento "Crie seu site em 6h usando IA" esta no banco com `checkout_url = null`. O filtro na pagina de Planos exige `e.checkout_url` para exibir, entao o card e ocultado.

**Solucao**: Alterar o filtro para exibir eventos pagos mesmo sem `checkout_url`. Se o evento nao tiver link de checkout, o botao deve redirecionar para uma acao alternativa (ex: abrir WhatsApp, ou mostrar "Em breve") ou simplesmente nao ter o botao ativo. Isso garante que o card do evento seja visivel assim que criado no admin.

**Arquivo**: `src/pages/Plans.tsx` (linha 77)
- Mudar filtro de `!e.is_free && e.checkout_url` para `!e.is_free`
- No botao "Garantir minha vaga", desabilitar se nao houver `checkout_url` e mostrar texto "Em breve"

---

### 2. Regra do Trial: de "gratis sem cartao" para "7 dias gratis no plano mensal"

**Nova regra de negocio**: O botao "Comecar periodo gratuito" deve redirecionar para um link externo da Ticto (plano mensal com 7 dias gratis). A cobranca so acontece apos 7 dias. Nao ha mais criacao local de trial no banco de dados.

**Alteracoes**:

**`src/pages/Plans.tsx`**:
- Remover a logica `handleStartTrial` que cria subscription local no banco
- O botao "Comecar periodo gratuito" redireciona para o link da Ticto do plano mensal com trial (placeholder por enquanto, usuario vai criar o plano na Ticto)
- Alterar o texto de "Acesso completo sem cartao de credito" para "Teste 7 dias gratis no plano mensal"
- Alterar o texto do botao para "Comecar periodo gratuito"
- Manter a logica de `canStartTrial` para decidir se exibe o card

**`src/components/TrialOfferModal.tsx`**:
- Alterar "Sem cartao de credito" para "Cancele em ate 7 dias sem ser cobrado"
- Alterar descricao para refletir que e vinculado ao plano mensal
- O botao "Quero meus 7 dias gratis" redireciona para o mesmo link da Ticto
- Mudar `onConfirmTrial` para receber/usar o checkout URL

---

### 3. Preco do plano Anual incorreto

**Correcao simples**: Na constante `subscriptionPlans`, alterar o preco do plano anual de `R$ 299,90` para `R$ 239,90`. Ajustar tambem a descricao de "Economize 17%" para o percentual correto (economiza ~33% vs mensal: 12 x 29,90 = 358,80 vs 239,90).

**Arquivo**: `src/pages/Plans.tsx` (linha 35-37)

---

## Detalhes tecnicos

### `src/pages/Plans.tsx`
- Linha 35: `"R$ 299,90"` para `"R$ 239,90"`
- Linha 37: `"Economize 17%"` para `"Economize 33%"`
- Linha 77: Remover requisito de `e.checkout_url` no filtro
- Linhas 131-182: Substituir `handleStartTrial` (que cria trial local) por redirect para URL da Ticto
- Linha 252: Alterar texto "Acesso completo sem cartao de credito" para "Teste gratis por 7 dias no plano mensal"
- Botao do evento: desabilitar se `checkout_url` nao existir

### `src/components/TrialOfferModal.tsx`
- Linha 57: Trocar "Sem cartao de credito" por "Cancele em ate 7 dias sem ser cobrado"
- Linha 49-51: Ajustar descricao do modal
- Botao: redirecionar para link Ticto em vez de chamar `onConfirmTrial` local

### Placeholder para link da Ticto
Como o usuario ainda vai criar o plano de trial na Ticto, usaremos um placeholder `TRIAL_CHECKOUT_PLACEHOLDER` no codigo. Quando o link estiver pronto, basta substituir.

### Ordem de implementacao
1. Corrigir preco anual
2. Ajustar filtro de eventos pagos
3. Reescrever logica do trial (Plans + TrialOfferModal)
