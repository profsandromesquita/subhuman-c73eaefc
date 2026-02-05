
# Plano de Correções: Painel de Assinaturas e Notificações

## Problema 1: Plano exibido incorretamente no painel

### Diagnóstico
Na tabela do painel `/admin/subscriptions`, o código na linha 199-203 exibe:
```typescript
{item.plan_type === 'monthly' ? 'Mensal' : 'Anual'}
```

Isso significa que QUALQUER plano que não seja `monthly` é exibido como "Anual", incluindo `trial` e `promo`. Por isso "MINDZ DIGITAL" (trial) aparece erroneamente como "Anual".

### Solução
Modificar a renderização para incluir todos os tipos de plano:

**Arquivo:** `src/pages/admin/Subscriptions.tsx`

```text
Linha 199-203 - Alterar de:
{item.plan_type === 'monthly' ? 'Mensal' : 'Anual'}

Para:
{item.plan_type === 'monthly' ? 'Mensal' : 
 item.plan_type === 'yearly' ? 'Anual' : 
 item.plan_type === 'trial' ? 'Trial' :
 item.plan_type === 'promo' ? 'Promo' :
 item.plan_type}
```

---

## Problema 2: Separação de notificações lidas/não lidas

### Diagnóstico
A UI de separação JÁ ESTÁ IMPLEMENTADA no código (linhas 151-242 de Notifications.tsx). O problema está na lógica de marcar como lida:

1. Notificações globais (`user_id = null`) são buscadas mas não podem ser marcadas como lidas
2. O hook `useMarkNotificationRead` na linha 120 usa `.eq("user_id", user.id)` que falha para notificações globais
3. Isso impede que certas notificações saiam da seção "Não lidas"

### Solução

**Arquivo:** `src/hooks/useNotifications.ts`

Modificar a lógica para permitir marcar notificações globais como lidas por usuário específico. Isso requer uma abordagem diferente:

1. **Opção escolhida:** Criar uma tabela auxiliar `notification_read_status` para rastrear quais notificações globais cada usuário já leu OU
2. **Opção mais simples:** Ajustar a query para ignorar notificações globais no filtro de lidas/não lidas ou tratar diferente

Para solução imediata, podemos:
- Modificar o hook para tentar atualizar notificações do próprio usuário
- E para notificações globais, manter um estado local ou criar uma tabela auxiliar

---

## Resumo das Alterações

| Arquivo | Mudança |
|---------|---------|
| `src/pages/admin/Subscriptions.tsx` | Corrigir exibição do tipo de plano na tabela |
| `src/hooks/useNotifications.ts` | Ajustar lógica para notificações globais |

---

## Resultado Esperado

1. Painel de assinaturas mostrará corretamente:
   - "MINDZ DIGITAL" → **Trial** (não mais "Anual")
   - "Sandro Costa" → **Trial**
   - "Arduino Ceará" → **Mensal**
   - "Sandro Costa Mesquita" → **Mensal**

2. Notificações funcionarão corretamente com as seções "Não lidas" e "Lidas"

---

## Seção Técnica

### Dados atuais do banco

```
Assinaturas confirmadas:
- Sandro Costa Mesquita (monthly) - PAGANTE
- Arduino Ceará (monthly) - PAGANTE
- MINDZ DIGITAL (trial) - incorretamente exibido como "Anual"
- Sandro Costa (trial) - incorretamente exibido como "Anual"
```

### Correção do render de plano

```typescript
// Antes (incorreto)
render: (item: Subscription) => (
  <span className="px-2 py-1 text-xs rounded-full bg-secondary text-foreground">
    {item.plan_type === 'monthly' ? 'Mensal' : 'Anual'}
  </span>
)

// Depois (correto)
render: (item: Subscription) => {
  const planLabels: Record<string, string> = {
    monthly: 'Mensal',
    yearly: 'Anual',
    trial: 'Trial',
    promo: 'Promo'
  };
  
  return (
    <span className="px-2 py-1 text-xs rounded-full bg-secondary text-foreground">
      {planLabels[item.plan_type] || item.plan_type}
    </span>
  );
}
```

### Problema com notificações globais

Notificações com `user_id = null` são broadcast para todos os usuários. O problema é que cada usuário precisa de um registro próprio de "leitura". Soluções:

1. **Tabela auxiliar** (recomendado para produção):
```sql
CREATE TABLE notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES notifications(id),
  user_id uuid REFERENCES auth.users(id),
  read_at timestamptz DEFAULT now(),
  UNIQUE(notification_id, user_id)
);
```

2. **Solução simplificada** (mais rápida):
Usar localStorage para rastrear IDs de notificações globais lidas pelo usuário
