
Diagnóstico concluído com auditoria de ponta a ponta (backend + frontend + runtime).  
Causa raiz real identificada e candidatos esgotados abaixo.

## 1) Auditoria de TODOS os candidatos

### Candidato A — Banco com dados zerados
- **Status:** Eliminado.
- **Evidência:** `platform_stats` está com valores reais (`likes 1232`, `comments 137`, etc).

### Candidato B — Função `get-platform-stats` retornando zero
- **Status:** Eliminado.
- **Evidência:** chamada direta da função retorna valores reais (HTTP 200 com números corretos).

### Candidato C — RLS bloqueando leitura pública
- **Status:** Eliminado.
- **Evidência:** policy em `platform_stats` permite `SELECT` público (`using true`), e requests anônimos retornam os números corretos.

### Candidato D — Cache/CDN servindo payload antigo zerado
- **Status:** Eliminado.
- **Evidência:** múltiplas respostas recentes mostram payload não-zero, inclusive no polling.

### Candidato E — Cron/refresh falhando
- **Status:** Não é causa do bug visual atual.
- **Evidência:** mesmo com resposta real e atualizada, UI segue exibindo `0`; portanto o gargalo está no frontend de renderização.

### Candidato F — Frontend não recebendo dados
- **Status:** Eliminado.
- **Evidência:** rede no browser mostra `get-platform-stats` com números reais, enquanto tela permanece em `0`.

### Candidato G — Bug de renderização/estado do componente (principal)
- **Status:** **Confirmado (causa raiz).**
- **Evidência técnica no `LiveStatsSection.tsx`:
  1. O componente retorna `null` enquanto `displayStats` ainda está `null`.
  2. O `useEffect` do `IntersectionObserver` roda com dependência `[]` apenas na montagem inicial.
  3. Na montagem inicial, `sectionRef.current` é `null` (porque o componente retornou `null`).
  4. O observer nunca é registrado depois.
  5. `inView` nunca vira `true`.
  6. `useCountUp(..., inView)` nunca inicia e os cards ficam em `0` permanentemente.

Resultado: backend correto, UI travada em zero por falha de ciclo de vida do observer.

---

## 2) Plano de correção (sem alterar backend)

### Fase 1 — Corrigir ciclo de vida do IntersectionObserver (fix principal)
**Arquivo:** `src/components/landing/LiveStatsSection.tsx`

- Reescrever o efeito do observer para depender da presença de dados/render:
  - depender de `displayStats` e `inView`
  - só observar quando `displayStats` existir e `sectionRef.current` existir
  - desconectar corretamente no cleanup

Objetivo: garantir que o observer seja criado **depois** que a seção existir no DOM.

---

### Fase 2 — Hardening para evitar novo “zero eterno”
**Mesmo arquivo**

Adicionar fallback defensivo:
- se por qualquer motivo o observer não disparar, detectar visibilidade inicial via `getBoundingClientRect` após render e setar `inView=true` quando já estiver em viewport.
- isso evita regressão silenciosa em cenários de timing/render.

---

### Fase 3 — Ajuste de consistência visual (sem mudar UX)
**Mesmo arquivo**

- Manter count-up, micro-incrementos e polling atuais.
- Preservar regra de não renderizar quando tudo for zero real.
- Garantir que “dados reais recebidos + seção visível” nunca resulte em `0` estático.

---

## 3) Validação obrigatória após implementação

1. **Runtime de rede:** `get-platform-stats` retorna não-zero.
2. **UI ao entrar na seção:** números animam de 0 → valor real.
3. **Persistência:** após 60s (poll), números atualizam sem voltar para zero.
4. **Preview e publicado:** mesmo comportamento nos dois ambientes.
5. **Regressão:** recarregar página diretamente na landing e rolar até a seção — não pode travar em zero.

---

## 4) Escopo de mudança

- **Somente frontend:** `src/components/landing/LiveStatsSection.tsx`
- **Sem mudanças** em checkout, pagamentos, backend functions, cron, tabela, RLS ou navegação.

Se você aprovar, a implementação será cirúrgica nesse componente com foco direto no bug de lifecycle do observer.
