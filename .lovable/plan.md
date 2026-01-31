

# Plano de Correção — Botão "Ver Planos Disponíveis" no Modal de Assinatura

## Problema Identificado

O botão "Ver Planos Disponíveis" no modal de assinatura (`SubscriptionModal.tsx`) está redirecionando para `/home` ao invés de `/plans`.

## Análise de Causa Raiz

Ao analisar o código na linha 120-128, o handler `handleNavigateToPlans` está correto:

```typescript
const handleNavigateToPlans = () => {
  onClose();
  navigate('/plans');
};
```

Porém, o problema é que o evento pode estar sendo capturado pelo `Dialog` do Radix UI antes de executar a navegação, ou há conflito de eventos similar ao que ocorreu no `TrialBanner.tsx`.

## Solução Proposta

Adicionar tratamento adequado do evento no botão:

1. Passar o evento `e` como parâmetro
2. Chamar `e.preventDefault()` e `e.stopPropagation()` para evitar conflitos
3. Adicionar `type="button"` explícito para garantir comportamento correto

## Arquivo a Alterar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/SubscriptionModal.tsx` | Corrigir handler do botão CTA |

## Código Atual (linhas 119-128)

```typescript
{/* CTA Button */}
<Button 
  className="w-full gap-2" 
  onClick={handleNavigateToPlans}
>
  {status === 'active' && planType !== 'trial' 
    ? 'Gerenciar Plano' 
    : 'Ver Planos Disponíveis'}
  <ArrowRight className="w-4 h-4" />
</Button>
```

## Código Corrigido

```typescript
{/* CTA Button */}
<Button 
  type="button"
  className="w-full gap-2" 
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    navigate('/plans');
  }}
>
  {status === 'active' && planType !== 'trial' 
    ? 'Gerenciar Plano' 
    : 'Ver Planos Disponíveis'}
  <ArrowRight className="w-4 h-4" />
</Button>
```

## Validação

- [ ] Clicar em "Assinatura" no perfil abre o modal
- [ ] Clicar em "Ver Planos Disponíveis" fecha o modal e navega para `/plans`
- [ ] A página `/plans` é exibida corretamente

