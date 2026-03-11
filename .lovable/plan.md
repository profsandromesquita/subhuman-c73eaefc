
Diagnóstico da investigação (com base em logs + banco):

1) Backend de limite NÃO está bloqueando esse usuário
- Usuário testado: `38591afd-8a45-4d4d-8a6a-4c8eda92025e` (`digitallaser.copiadora@gmail.com`)
- Query:
```sql
select * from public.check_ai_daily_limit('38591afd-8a45-4d4d-8a6a-4c8eda92025e'::uuid);
```
- Resultado: `tier=freemium`, `daily_limit=1`, `used_today=0`, `allowed=true`.

2) Não houve consumo de IA para esse usuário
- Query:
```sql
select count(*) from public.rag_query_logs
where user_id = '38591afd-8a45-4d4d-8a6a-4c8eda92025e'::uuid;
```
- Resultado: `0` (sem logs de uso).

3) Não há chamadas recentes da função de backend para esse fluxo
- Edge logs da função `ai-assistant`: vazios no período consultado.
- Conclusão: o bloqueio está ocorrendo no frontend (antes da chamada útil ao backend) ou por estado/cache do cliente.

4) Evidência de problema de runtime no cliente
- Erro reportado no preview: `TypeError: Importing a module script failed.`
- Esse erro pode deixar parte do app em estado inconsistente (incluindo input do chat).

Do I know what the issue is?
- Sim: o bloqueio atual não é causado pelo novo enforcement do backend. É um bloqueio de camada cliente (estado/UI/cache/runtime).

Plano de correção (sem alterar backend):

1. Blindar o tratamento de `429` no `useAIAssistant.ts`
- Hoje: qualquer `429` seta `limitReached=true`.
- Problema: `429` genérico (throttle/provedor/rede) também vira “limite diário atingido”.
- Ajuste planejado:
  - Só setar `limitReached` se o body vier com assinatura explícita do limite diário:
    - `error === "Limite diário atingido"`
    - `tier`, `daily_limit`, `used_today` válidos.
  - Para `429` genérico: mostrar erro transitório e **não** bloquear input.

Antes:
```ts
if (response.status === 429) {
  setLimitReached(true);
  ...
}
```

Depois:
```ts
if (response.status === 429) {
  const errorData = await response.json().catch(() => ({}));
  const isDailyLimit = errorData?.error === "Limite diário atingido"
    && typeof errorData?.daily_limit === "number"
    && typeof errorData?.used_today === "number";

  if (isDailyLimit) {
    setLimitReached(true);
    setLimitInfo(...);
    return;
  }

  toast.error(errorData?.error || "Instabilidade temporária. Tente novamente.");
  return;
}
```

2. Reset defensivo de bloqueio no ciclo de sessão
- Adicionar reset automático de `limitReached` ao trocar usuário autenticado (evita herança de estado entre contas no mesmo browser).
- Manter `clearMessages()` resetando como já está.

3. Observabilidade mínima para fechar diagnóstico
- Adicionar logs de status no frontend (somente dev) para registrar:
  - status HTTP recebido
  - se o app entrou em `limitReached`
  - payload de erro que disparou bloqueio
- Isso permite confirmar rapidamente se o bloqueio veio de 429 diário real ou 429 genérico.

Validação após correção:
1) Login com `digitallaser.copiadora@gmail.com`.
2) Abrir `/ai-assistant`.
3) Verificar que input está habilitado inicialmente.
4) Enviar 1 pergunta (deve passar).
5) Enviar 2ª pergunta no mesmo dia (deve bloquear por limite diário real).
6) Forçar 429 genérico (simulado) e validar que input não entra em bloqueio permanente.
