
# Sprint 3: Adicionar Workshop e Vitalicio na Pagina de Planos

## Contexto

A pagina `/plans` atualmente exibe apenas 2 planos (Mensal e Anual) com radio-select + botao unico "Assinar agora". Precisamos adicionar o Workshop (R$ 19,90, pagamento unico) e o Vitalicio (R$ 1.000, pagamento unico), reorganizando a UI para separar visualmente produtos avulsos de assinaturas.

---

## Alteracoes

### Arquivo: `src/pages/Plans.tsx`

**1. Separar dados em dois arrays:**

```text
workshopProduct (card destacado no topo):
  - id: "workshop"
  - title: "Crie seu software em 6h usando IA"
  - subtitle: "Mesmo sem saber programar"
  - price: "R$ 19,90"
  - period: "pagamento unico"
  - badge: "Workshop"
  - checkoutUrl: placeholder Ticto
  - features: 4 itens sobre o workshop

subscriptionPlans (array com 3 planos):
  - Mensal (R$ 29,90/mes) -- existente
  - Anual (R$ 299,90/ano) -- existente, CORRIGIR preco de R$ 239,90 para R$ 299,90 conforme memoria
  - Vitalicio (R$ 1.000,00 pagamento unico) -- novo, badge "Melhor custo-beneficio"
```

**2. Reorganizar a UI em 3 blocos visuais:**

```text
[Trial card - ja existe, sem mudanca]

--- "ou adquira um produto" ---

[Workshop card - design especial com icone GraduationCap]
  - Card com borda amber/laranja sutil
  - Botao proprio "Garantir minha vaga - R$ 19,90"
  - Ao clicar: redireciona para checkout Ticto do workshop

--- "ou escolha um plano de assinatura" ---

[3 planos de assinatura - Mensal / Anual / Vitalicio]
  - Radio-select como ja funciona hoje
  - Botao "Assinar agora" unificado
  - Vitalicio com badge "Melhor custo-beneficio" e selo dourado
```

**3. Logica de checkout:**

- Workshop: botao proprio no card, nao participa do radio-select
- Assinaturas (mensal/anual/vitalicio): radio-select + botao "Assinar agora" -- logica existente `handleSubscribe` ja funciona
- O `selectedPlan` default muda para "yearly" (mantido)

**4. Estado `selectedPlan`:**

- Apenas para os 3 planos de assinatura (monthly/yearly/lifetime)
- Workshop tem seu proprio botao independente

**5. Nova funcao `handleWorkshopPurchase`:**

- Semelhante a `handleSubscribe`, monta URL do Ticto com email + src + redirect_url
- Redireciona para checkout

**6. Correcao do preco anual:**

- De R$ 239,90 para R$ 299,90 conforme especificacao do usuario

---

## Resumo visual da pagina

```text
<- Voltar

"Escolha seu plano"
"Cancele quando quiser, sem compromisso"

[TRIAL CARD - gratis 7 dias] (se elegivel)

--- ou adquira um produto ---

[WORKSHOP CARD]
  Badge "Workshop" (amber)
  "Crie seu software em 6h usando IA"
  "Mesmo sem saber programar"
  R$ 19,90 - pagamento unico
  - Workshop pratico de 6 horas
  - Aulas ao vivo dias 7 e 14/03
  - Mesmo sem saber programar
  - Certificado de participacao
  [Garantir minha vaga - R$ 19,90]

--- ou escolha um plano de assinatura ---

( ) Mensal - R$ 29,90/mes
( ) Anual - R$ 299,90/ano [Mais popular]
( ) Vitalicio - R$ 1.000,00 [Melhor custo-beneficio]

[Assinar agora]

"Pagamento seguro via cartao ou PIX"

[Cupom promocional]
```

---

## Detalhes Tecnicos

| Aspecto | Detalhe |
|---------|---------|
| Arquivo editado | `src/pages/Plans.tsx` (unico arquivo) |
| Novos imports | `GraduationCap` do lucide-react |
| Estado | `selectedPlan` continua apenas para assinaturas |
| Nova funcao | `handleWorkshopPurchase()` -- checkout Ticto separado |
| Correcao | Preco anual: R$ 239,90 -> R$ 299,90 |
| Novo plano | Vitalicio: R$ 1.000,00, `plan_type: 'lifetime'` |
| Checkout URLs | Placeholders Ticto (usuario preenchera depois) |
