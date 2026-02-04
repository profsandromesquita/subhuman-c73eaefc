

# Plano: Sistema de Cupons Promocionais (30 dias)

## Objetivo
Criar um sistema seguro de cupons promocionais de uso único que concedam 30 dias de acesso gratuito à plataforma Subhumano, sem possibilidade de compartilhamento ou reutilização.

---

## Visao Geral da Arquitetura

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DO CUPOM                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ADMIN cria cupom no painel                                 │
│     ↓                                                           │
│  2. Sistema gera codigo unico (ex: SUB-X7K9-PROMO-2026)       │
│     ↓                                                           │
│  3. USUARIO digita codigo na pagina de planos                  │
│     ↓                                                           │
│  4. Edge Function valida:                                       │
│     - Cupom existe?                                             │
│     - Cupom não usado?                                          │
│     - Cupom não expirado?                                       │
│     - Usuario já teve cupom antes?                              │
│     ↓                                                           │
│  5. Se válido: cria assinatura + marca cupom como usado        │
│     ↓                                                           │
│  6. Usuario ganha 30 dias de acesso                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Modelagem do Banco de Dados

### 1.1 Tabela `promo_coupons`

Armazena todos os cupons criados pelo admin:

```sql
CREATE TABLE public.promo_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,              -- Codigo unico do cupom
  plan_type TEXT NOT NULL DEFAULT 'promo', -- Tipo do plano concedido
  days_granted INTEGER NOT NULL DEFAULT 30, -- Dias de acesso
  max_uses INTEGER NOT NULL DEFAULT 1,    -- Maximo de usos (1 = uso unico)
  current_uses INTEGER NOT NULL DEFAULT 0, -- Contador de usos
  expires_at TIMESTAMPTZ,                 -- Data de expiracao do cupom
  is_active BOOLEAN NOT NULL DEFAULT true, -- Se esta ativo para uso
  created_by UUID REFERENCES auth.users(id), -- Admin que criou
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_uses CHECK (current_uses <= max_uses),
  CONSTRAINT positive_days CHECK (days_granted > 0)
);
```

### 1.2 Tabela `coupon_redemptions`

Registra cada uso de cupom (previne reuso):

```sql
CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.promo_coupons(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  subscription_id UUID REFERENCES public.subscriptions(id),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,                        -- Para auditoria
  user_agent TEXT,                        -- Para auditoria
  
  -- Garante que cada usuario usa cada cupom apenas uma vez
  UNIQUE(coupon_id, user_id)
);
```

### 1.3 Politicas RLS

```sql
-- promo_coupons: apenas admins gerenciam
CREATE POLICY "Admins can manage coupons"
  ON public.promo_coupons FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- promo_coupons: usuarios podem ver cupons ativos (para validacao)
CREATE POLICY "Users can view active coupons"
  ON public.promo_coupons FOR SELECT
  USING (is_active = true);

-- coupon_redemptions: usuarios veem proprios resgates
CREATE POLICY "Users can view own redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- coupon_redemptions: admins veem todos
CREATE POLICY "Admins can view all redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
```

---

## Fase 2: Edge Function para Resgate de Cupom

### 2.1 Funcao `redeem-coupon`

Edge function segura que processa o resgate:

```typescript
// supabase/functions/redeem-coupon/index.ts

// Validacoes:
// 1. Usuario autenticado
// 2. Cupom existe e esta ativo
// 3. Cupom nao expirou
// 4. Cupom nao atingiu limite de usos
// 5. Usuario nunca usou QUALQUER cupom promocional antes
// 6. Usuario nao tem assinatura ativa

// Se tudo OK:
// 1. Incrementa current_uses do cupom
// 2. Cria registro em coupon_redemptions
// 3. Cria assinatura com plan_type='promo' e duracao de days_granted
// 4. Retorna sucesso
```

### 2.2 Seguranca Implementada

| Ataque | Protecao |
|--------|----------|
| Reutilizacao do mesmo cupom | UNIQUE(coupon_id, user_id) na tabela |
| Compartilhamento | Cupom vinculado a 1 usuario maximo |
| Brute force de codigos | Codigos longos + rate limiting |
| Multiplos cupons por usuario | Verificacao se usuario ja usou algum cupom |
| Cupom expirado | Validacao de expires_at |
| Manipulacao client-side | Toda logica na Edge Function |

---

## Fase 3: Interface do Admin

### 3.1 Nova Pagina `admin/Coupons.tsx`

Funcionalidades:
- Listar todos os cupons com status
- Criar novo cupom (individual ou em lote)
- Desativar cupom
- Ver historico de resgates
- Exportar cupons nao usados

### 3.2 Formulario de Criacao

```typescript
interface CouponForm {
  prefix?: string;        // Ex: "BLACKFRIDAY" -> BLACKFRIDAY-X7K9
  quantity: number;       // Quantos cupons gerar
  daysGranted: number;    // Dias de acesso (default: 30)
  expiresAt?: Date;       // Quando o cupom expira
}
```

---

## Fase 4: Interface do Usuario

### 4.1 Componente `CouponInput` na Pagina de Planos

Adicionar campo para digitar cupom promocional:

```typescript
// Em Plans.tsx - adicionar secao apos trial
<div className="mt-6 p-4 rounded-xl border border-border">
  <p className="text-sm text-muted-foreground mb-2">
    Possui um cupom promocional?
  </p>
  <div className="flex gap-2">
    <Input 
      placeholder="Digite seu cupom"
      value={couponCode}
      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
    />
    <Button onClick={handleRedeemCoupon}>
      Resgatar
    </Button>
  </div>
</div>
```

---

## Fase 5: Atualizacao do CHECK Constraint

O banco atual tem uma restricao que permite apenas `monthly`, `yearly` e `trial`:

```sql
-- Adicionar 'promo' aos tipos permitidos
ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_plan_type_check 
CHECK (plan_type IN ('monthly', 'yearly', 'trial', 'promo'));
```

---

## Formato do Codigo do Cupom

Padrao seguro e legivel:

```
SUB-XXXX-YYYY-ZZZZ

SUB     = Prefixo fixo (identifica Subhumano)
XXXX    = 4 caracteres alfanumericos aleatorios
YYYY    = 4 caracteres alfanumericos aleatorios  
ZZZZ    = 4 caracteres (pode ser customizado, ex: 2026, PROMO)

Exemplo: SUB-K7X9-M2P4-2026
```

Caracteristicas:
- 12 caracteres aleatorios = mais de 4 bilhoes de combinacoes
- Facil de digitar e ler
- Resistente a brute force

---

## Resumo de Arquivos

| Operacao | Arquivo |
|----------|---------|
| **Migration SQL** | Criar tabelas promo_coupons e coupon_redemptions + RLS + atualizar constraint |
| **Criar** | `supabase/functions/redeem-coupon/index.ts` - Edge function de resgate |
| **Criar** | `src/pages/admin/Coupons.tsx` - Pagina de gestao de cupons |
| **Criar** | `src/hooks/useCoupons.ts` - Hook para cupons |
| **Editar** | `src/pages/Plans.tsx` - Adicionar campo de cupom |
| **Editar** | `src/components/admin/AdminSidebar.tsx` - Link para cupons |
| **Editar** | `src/App.tsx` - Rota /admin/coupons |

---

## Resultado Esperado

Apos implementacao:

1. Admin pode criar cupons unicos de 30 dias
2. Cada cupom so pode ser usado uma vez
3. Usuario so pode usar um cupom promocional em toda a vida
4. Sistema 100% seguro contra compartilhamento
5. Auditoria completa de quem usou qual cupom
6. Interface amigavel para admin e usuario

