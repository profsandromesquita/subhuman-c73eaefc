

# Plano de Correção — Tentativa 4 (Pós-Sucesso do Trial)

## Resumo Executivo

Este plano aborda duas áreas principais de correção conforme solicitado:

**Problema A:** Fluxo de login/redirecionamento e notificação de trial
**Problema B:** Configuração correta dos níveis de acesso aos canais

---

## PARTE A — Fluxo de Autenticação e Trial

### Diagnóstico do Problema Atual

**1. Problema de redirecionamento após login:**
- Atualmente, quando o usuário faz login em `Login.tsx` (linha 32), o código executa `navigate("/home")` incondicionalmente.
- O `SubscriptionGuard` em `/home` então verifica o status da assinatura e redireciona para `/plans` se for `none` ou `expired`.
- Isso causa a experiência ruim de ir para `/home` e imediatamente ser redirecionado para `/plans`.

**2. Ausência de notificação visual do trial:**
- Atualmente só existe um toast quando falta 1 dia (linha 34-38 de `SubscriptionGuard.tsx`).
- Não há popup persistente mostrando quantos dias restam do período de teste.

**3. Proteção contra renovação do trial:**
- A verificação já existe em `Plans.tsx` (linhas 77-94): o código verifica se já existe um registro com `plan_type='trial'` para o usuário.
- Porém, a lógica atual não diferencia entre trial expirado e trial em uso, o que pode causar confusão.

### Solução Proposta

#### A1. Alterar o fluxo de Login

Em `src/pages/Login.tsx`:
- Após login bem-sucedido, verificar o status da assinatura antes de redirecionar.
- Usar o hook `useSubscription` com `refetch()` para obter o status atualizado.
- Redirecionar conforme regras:
  - `status === 'trial'` ou `status === 'active'` → `/home`
  - `status === 'expired'` ou `status === 'none'` → `/plans`

```text
Lógica simplificada:
┌─────────────────────────────────────────────────────┐
│                    Login Success                     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   Fetch Subscription   │
            └────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                              ▼
   trial/active?                   none/expired?
          │                              │
          ▼                              ▼
     /home                           /plans
```

#### A2. Criar Componente de Notificação de Trial

Criar `src/components/TrialBanner.tsx`:
- Popup moderno fixo no canto inferior direito da tela.
- Exibe apenas quando `status === 'trial'`.
- Mostra quantos dias restam.
- Design: card com gradiente sutil, ícone, texto e botão para assinar.
- Pode ser dispensado (mas reaparece ao trocar de página ou recarregar).
- Usa animação Framer Motion para entrada/saída suave.

**Design do componente:**
```text
┌─────────────────────────────────────────┐
│  🎁  Período de teste                   │
│                                         │
│  Você ainda tem 5 dias de acesso.       │
│                                         │
│  [Assinar agora]         [Dispensar X]  │
└─────────────────────────────────────────┘
```

#### A3. Integrar o TrialBanner no AppLayout

Em `src/components/AppLayout.tsx`:
- Importar o novo componente `TrialBanner`.
- Renderizar condicionalmente baseado no status do `useSubscription`.

#### A4. Ajustar SubscriptionGuard

Em `src/components/SubscriptionGuard.tsx`:
- Remover o toast de 1 dia (já que teremos o banner persistente).
- Manter a lógica de redirecionamento para `expired` e `none`.
- Garantir que planos pagos expirados também redirecionem.

#### A5. Validar Proteção de Renovação do Trial

A proteção já existe e funciona corretamente em `Plans.tsx`:
```typescript
const { data: existingTrial } = await supabase
  .from('subscriptions')
  .select('id')
  .eq('user_id', user.id)
  .eq('plan_type', 'trial')
  .limit(1)
  .maybeSingle();

if (existingTrial) {
  toast.error("Você já utilizou seu período de teste gratuito.");
  return;
}
```

Esta lógica verifica se existe **qualquer** registro de trial (ativo ou expirado), impedindo a criação de um novo trial. Isso já garante que o usuário só pode usar o benefício uma vez.

**Nenhuma alteração necessária para A5.**

---

## PARTE B — Configuração de Acesso aos Canais

### Diagnóstico do Problema Atual

**Situação atual no banco de dados:**
| Canal | Categoria (access_type) |
|-------|-------------------------|
| Geral | open |
| Dúvidas | open |
| Networking | subscribers |
| Projetos Premium | premium |
| Ferramentas | subscribers |

**Problema identificado:**
- "Geral" e "Dúvidas" estão com `access_type: 'open'`, mas não existem usuários gratuitos na plataforma.
- A regra de negócio definida é:
  - Assinantes (mensal + trial): todos os canais exceto Premium
  - Premium (anual): todos os canais

### Nova Definição de Regras de Acesso

| Canal | access_type | Quem pode acessar |
|-------|-------------|-------------------|
| Geral | subscribers | Qualquer assinante (mensal, anual, trial) |
| Dúvidas | subscribers | Qualquer assinante (mensal, anual, trial) |
| Networking | subscribers | Qualquer assinante (mensal, anual, trial) |
| Ferramentas | subscribers | Qualquer assinante (mensal, anual, trial) |
| Projetos Premium | premium | Apenas assinantes anuais |

### Solução Proposta

#### B1. Atualizar os dados no banco

Executar migração SQL para corrigir os canais "Geral" e "Dúvidas":

```sql
UPDATE public.channels 
SET access_type = 'subscribers' 
WHERE name IN ('Geral', 'Dúvidas');
```

#### B2. Revisar lógica de acesso no código

A lógica em `useChannelAccess.ts` já está correta:
- Linha 82-87: `subscribers` → qualquer assinatura ativa (incluindo trial)
- Linha 89-94: `premium` → apenas `plan_type === 'yearly'`

A lógica em `Channels.tsx` também está correta (linhas 123-131):
```typescript
if (accessType === 'subscribers') {
  hasAccess = true; // qualquer userPlan
} else if (accessType === 'premium') {
  hasAccess = userPlan === 'yearly';
}
```

A função SQL `can_access_channel` também está alinhada:
- `subscribers` → qualquer assinatura ativa
- `premium` → requer `plan_type = 'yearly'`

**Nenhuma alteração de código necessária para B2.**

---

## Arquivos a Serem Criados/Alterados

### Criar:
1. `src/components/TrialBanner.tsx` — Componente de notificação de dias restantes do trial

### Alterar:
1. `src/pages/Login.tsx` — Verificar assinatura antes de redirecionar
2. `src/components/AppLayout.tsx` — Integrar o TrialBanner
3. `src/components/SubscriptionGuard.tsx` — Remover toast de 1 dia (agora coberto pelo banner)

### Migração SQL:
1. Atualizar `access_type` de "Geral" e "Dúvidas" para `'subscribers'`

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Loop de redirecionamento no login | Baixa | Alta | Usar `refetch()` e aguardar resposta antes de navegar |
| Banner irritando usuários | Média | Baixa | Permitir dispensar e usar design discreto |
| Usuário trial sem acesso aos canais | Baixa | Alta | Verificar que trial é tratado como assinante válido |
| Migração falhar | Baixa | Média | SQL simples e testado |

---

## Checklist de Validação (Testes)

### Cenário 1 — Login de usuário com trial ativo
- [ ] Faz login
- [ ] É direcionado diretamente para `/home`
- [ ] Vê o popup de trial com dias restantes
- [ ] Pode dispensar o popup
- [ ] Ao navegar para outra página, popup reaparece

### Cenário 2 — Login de usuário com trial expirado
- [ ] Faz login
- [ ] É direcionado para `/plans`
- [ ] Vê mensagem de trial expirado
- [ ] Botão "testar grátis" não aparece ou está desabilitado

### Cenário 3 — Login de usuário com plano mensal ativo
- [ ] Faz login
- [ ] É direcionado diretamente para `/home`
- [ ] NÃO vê popup de trial
- [ ] Tem acesso a todos os canais exceto Premium

### Cenário 4 — Login de usuário com plano anual ativo
- [ ] Faz login
- [ ] É direcionado diretamente para `/home`
- [ ] NÃO vê popup de trial
- [ ] Tem acesso a TODOS os canais, incluindo Premium

### Cenário 5 — Tentativa de renovar trial
- [ ] Usuário com trial expirado tenta clicar em "testar grátis"
- [ ] Recebe mensagem de erro informando que já usou o benefício
- [ ] NÃO cria novo registro no banco

### Cenário 6 — Acesso aos canais
- [ ] Usuário trial/mensal acessa "Geral", "Dúvidas", "Networking", "Ferramentas" sem restrição
- [ ] Usuário trial/mensal é bloqueado em "Projetos Premium"
- [ ] Usuário anual acessa todos os canais sem restrição

---

## Detalhamento Técnico do TrialBanner

### Props e Estado:
```typescript
interface TrialBannerProps {
  daysRemaining: number;
  onDismiss?: () => void;
}
```

### Lógica de exibição:
- Mostrar apenas se `status === 'trial'` e `daysRemaining > 0`
- Estado local `isDismissed` para controlar visibilidade temporária
- Reset do `isDismissed` ao mudar de rota (usando `useLocation`)

### Estilização:
- Posição fixa: `fixed bottom-4 right-4`
- Z-index alto para sobrepor conteúdo
- Animação de entrada: slide-in da direita
- Sombra suave e bordas arredondadas
- Cores: gradiente sutil de acordo com o tema

---

## Ordem de Implementação

1. **Primeiro:** Executar migração SQL para corrigir canais (risco zero, impacto imediato)
2. **Segundo:** Criar componente `TrialBanner.tsx`
3. **Terceiro:** Alterar `AppLayout.tsx` para integrar o banner
4. **Quarto:** Alterar `Login.tsx` para verificar assinatura antes de redirecionar
5. **Quinto:** Ajustar `SubscriptionGuard.tsx` para remover toast redundante
6. **Sexto:** Testar todos os cenários

