
## O que eu encontrei (causa raiz)

O erro 500 não está vindo do frontend em si — ele é um “mascaramento” de um erro 400 do provedor de IA.

Nos logs da função `ai-assistant`, o Lovable AI Gateway está retornando:

- `Unsupported value: 'temperature' does not support 0.7 with this model. Only the default (1) value is supported.`
- Isso acontece porque a configuração ativa no banco está com:
  - `model = openai/gpt-5`
  - `temperature = 0.70`

Ou seja: para `openai/gpt-5`, a temperatura **não aceita 0.7** (e aparentemente só aceita o valor padrão 1).

Observação: a mensagem “Unable to post message…” vista no console (imagem 1) é de `postMessage`/origem e não explica o 500 do endpoint; é ruído paralelo e não é o bloqueio principal do chat.

---

## Objetivo da correção

1) Fazer o chat funcionar com `openai/gpt-5` mesmo com configurações inválidas no banco (resiliência).
2) Impedir que o painel admin salve combinações inválidas (prevenção).
3) Melhorar o erro exibido ao usuário quando o provedor rejeitar parâmetros (diagnóstico mais rápido).

---

## Plano de correção (mudanças de código)

### 1) Corrigir a função backend `ai-assistant` (principal)
Arquivo: `supabase/functions/ai-assistant/index.ts`

**Mudanças:**
- Hoje sempre enviamos `temperature: Number(config.temperature) || 0.7` no `requestBody`.
- Para `openai/gpt-5`, isso quebra quando temperatura ≠ 1.

**Implementação planejada:**
- Detectar se o modelo é OpenAI (`modelName.startsWith("openai/")`).
- Para OpenAI:
  - Não enviar `temperature` quando o valor configurado for diferente de `1`.
  - Opcionalmente (mais seguro): sempre omitir `temperature` para OpenAI e deixar o default do modelo atuar.
- Manter `max_completion_tokens` para OpenAI e `max_tokens` para os demais (já está corrigido).

**Também ajustar o retorno de erro:**
- Hoje, qualquer erro (exceto 429/402) vira `500 { error: "Erro ao processar sua mensagem" }`.
- Isso esconde o motivo real.
- Passar adiante a mensagem do Gateway quando houver JSON de erro (ex.: `error.message`), retornando status 400/500 coerente.
  - Exemplo: se o Gateway retornar 400, a função deve devolver 400 com a mensagem do Gateway (sanitizada).

Resultado esperado:
- O endpoint deixa de devolver 500 genérico nesse cenário e o chat passa a responder normalmente.

---

### 2) Ajustar o painel Admin para evitar configurações inválidas
Arquivo: `src/pages/admin/settings/AIAssistant.tsx`

**Mudanças:**
- Quando `config.model` começar com `openai/`:
  - Travar a temperatura em `1.0` (desabilitar o Slider ou forçar o valor automaticamente).
  - Mostrar um texto de ajuda: “Para este modelo, a temperatura é fixa em 1.”
- Ao salvar configurações:
  - Se `model` for OpenAI, salvar `temperature = 1`.

Resultado esperado:
- Mesmo se alguém tentar mexer no slider, a configuração salva ficará sempre compatível com GPT-5.

---

### 3) Corrigir o dado atual (config ativa) para evitar regressão imediata
Sem depender do usuário “lembrar de mudar”:

Opção A (recomendada): após a correção do Admin, abrir `/admin/settings/ai-assistant` e clicar em “Salvar Configurações” para persistir `temperature=1`.

Opção B (automática): criar uma migração simples que atualize a configuração ativa:
- Se `model LIKE 'openai/%'` e `temperature <> 1`, então setar para 1.

Resultado esperado:
- O sistema fica “limpo” (configuração consistente) e não volta a quebrar.

---

## Plano de validação (testes)

1) Teste funcional do chat:
   - Abrir `/ai-assistant`
   - Enviar: “Qual IA é melhor para código?”
   - Verificar:
     - não aparece 500 no Network
     - streaming chega e a UI vai renderizando a resposta

2) Teste de regressão de provider:
   - No admin, trocar modelo para `google/gemini-3-flash-preview`
   - Ajustar temperatura para 0.7
   - Salvar
   - Voltar ao chat e testar novamente

3) Teste de feedback de erro:
   - Forçar uma configuração inválida (quando possível) e confirmar que o app exibe a mensagem real do erro (não “Erro ao processar…” genérico).

---

## Riscos e mitigação

- Alguns modelos OpenAI podem ter restrições adicionais além de `temperature`.
  - Mitigação: manter o backend “tolerante”, omitindo parâmetros incompatíveis e sempre propagando o erro real do Gateway quando ocorrer.

---

## Entregáveis (arquivos a alterar)

- `supabase/functions/ai-assistant/index.ts` (corrigir envio de `temperature` para OpenAI + melhorar respostas de erro)
- `src/pages/admin/settings/AIAssistant.tsx` (travar/forçar temperatura = 1 quando OpenAI)
- (Opcional) nova migração SQL para normalizar `temperature` da config ativa

