
# Plano de Implementação: Período de Teste Gratuito de 7 Dias

## Visão Geral

Implementar a funcionalidade que permite ao usuário experimentar a plataforma Subhumano gratuitamente por 7 dias antes de decidir pela assinatura paga. Após o período de teste, o acesso será bloqueado e o usuário será redirecionado para a página de planos.

## Arquitetura da Solução

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Registro      │────▶│  Página /plans   │────▶│    Plataforma   │
│   (existente)   │     │  (trial option)  │     │    (acesso)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                        │
                                ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Criar assinatura │     │ useSubscription │
                        │ plan_type: trial │     │    (hook)       │
                        │ expires_at: +7d  │     │  verificação    │
                        └──────────────────┘     └─────────────────┘
```

## Componentes Afetados

### 1. Página de Planos (`src/pages/Plans.tsx`)

**Alterações:**
- Adicionar opção de plano gratuito (trial) à lista de planos
- Criar card visual diferenciado para o plano de teste
- Implementar função `handleStartTrial` que cria assinatura do tipo `trial`
- Adicionar botão secundário "Testar grátis por 7 dias"

**Visual proposto:**
- Link/botão discreto abaixo dos planos pagos: "Prefiro testar grátis por 7 dias"
- Não é um card como os planos pagos para manter hierarquia visual

### 2. Novo Hook (`src/hooks/useSubscription.ts`)

**Responsabilidades:**
- Verificar se o usuário possui assinatura ativa
- Retornar status: `active`, `trial`, `expired`, `none`
- Calcular dias restantes do trial
- Verificar se trial expirou

**Interface:**
```typescript
interface SubscriptionStatus {
  status: 'active' | 'trial' | 'expired' | 'none';
  planType: string | null;
  expiresAt: Date | null;
  daysRemaining: number | null;
  loading: boolean;
}
```

### 3. Componente de Proteção (`src/components/SubscriptionGuard.tsx`)

**Responsabilidades:**
- Envolver rotas que requerem assinatura ativa
- Redirecionar para `/plans` se assinatura expirada ou inexistente
- Permitir acesso se `status === 'active' || status === 'trial'`

### 4. Atualização das Rotas (`src/App.tsx`)

**Alterações:**
- Envolver rotas protegidas com `SubscriptionGuard`:
  - `/home`
  - `/highlights`
  - `/spaces/*`
  - `/channels/*`
  - `/notifications`
  - `/profile/*`

---

## Detalhes Técnicos

### Estrutura da Assinatura Trial no Banco

A tabela `subscriptions` já possui os campos necessários:
- `plan_type`: será `'trial'`
- `status`: será `'active'`
- `starts_at`: data atual
- `expires_at`: data atual + 7 dias

### Lógica de Verificação de Expiração

```typescript
// No hook useSubscription
const isExpired = subscription.expires_at && 
  new Date(subscription.expires_at) < new Date();

if (isExpired && subscription.status === 'active') {
  // Marcar como expirado no frontend
  return { status: 'expired', ... };
}
```

### Fluxo do Usuário

1. **Novo cadastro** → Redirecionado para `/plans`
2. **Na página `/plans`** → Pode escolher:
   - Plano Mensal (R$ 29,90)
   - Plano Anual (R$ 239,90) - recomendado
   - Link "Testar grátis por 7 dias"
3. **Ao clicar em "Testar grátis"** → Cria assinatura trial → Redireciona para `/home`
4. **Durante o trial** → Acesso normal à plataforma
5. **Após 7 dias** → Bloqueio de acesso → Redirecionamento para `/plans`

### Considerações de UX

- Exibir banner discreto durante o trial mostrando dias restantes
- Toast de lembrete quando restar 1 dia
- Página de planos deve detectar trial expirado e exibir mensagem apropriada

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useSubscription.ts` | Hook para gerenciar status de assinatura |
| `src/components/SubscriptionGuard.tsx` | Componente de proteção de rotas |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Plans.tsx` | Adicionar opção de trial + lógica de criação |
| `src/App.tsx` | Envolver rotas com SubscriptionGuard |
| `src/hooks/useChannelAccess.ts` | Ajustar para reconhecer plan_type 'trial' |

---

## Ordem de Implementação

1. Criar hook `useSubscription.ts`
2. Criar componente `SubscriptionGuard.tsx`
3. Modificar `Plans.tsx` para incluir opção trial
4. Atualizar `App.tsx` com proteção de rotas
5. Ajustar `useChannelAccess.ts` para reconhecer trial
6. Testar fluxo completo

---

## Validações de Segurança

- Verificação de expiração deve ocorrer no frontend E backend (via RLS policies)
- Um usuário só pode ter uma assinatura trial ativa por vez
- Após trial expirar, usuário deve assinar para continuar

## Compatibilidade

- Usuários existentes sem assinatura: serão direcionados para `/plans`
- Usuários com assinatura ativa: sem alteração no comportamento
- Novos usuários: podem optar pelo trial

