

# Adicionar link de checkout do trial de 7 dias

## Alteracao necessaria

### Arquivo: `src/pages/Plans.tsx` (linha 147)

Substituir o placeholder do checkout de trial pelo link real:

```
// ANTES:
const TRIAL_CHECKOUT_URL = "TRIAL_CHECKOUT_PLACEHOLDER";

// DEPOIS:
const TRIAL_CHECKOUT_URL = "https://checkout.ticto.app/O66EDE7B0";
```

Isso e tudo que precisa ser alterado. A logica ja esta implementada corretamente:

1. **Dados do usuario**: O `handleStartTrial` (linha 149) ja injeta `email` e `src` (user_id) na URL do checkout, garantindo que a Ticto receba os dados do usuario logado.
2. **Webhook**: O `ticto-webhook` ja processa pagamentos mensais como `plan_type: 'monthly'` com `status: 'active'`. O trial de 7 dias e gerenciado pela Ticto (cobra apos 7 dias), entao do lado do Subhumano o usuario e tratado como assinante ativo assim que o webhook receber `approved`/`paid`.
3. **Redirect**: Apos o pagamento, o usuario e redirecionado para `/payment-success` (ja configurado na linha 164).

## Secao tecnica

- 1 arquivo editado: `src/pages/Plans.tsx`
- 0 migracoes SQL
- 0 alteracoes no webhook (o plano mensal ja e tratado corretamente)
- O `TrialOfferModal` tambem usa `handleStartTrial`, entao o modal de oferta de trial tambem sera corrigido automaticamente

