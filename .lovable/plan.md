

# Padronização de Labels no System Message — `supabase/functions/ai-assistant/index.ts`

10 edições pontuais de renomeação de labels. Nenhuma lógica alterada.

## Mudanças

### 1. `PLATFORM_STRUCTURE` (linha 390)
```
// DE:
=== ESTRUTURA SUBHUMANO ===
// PARA:
[ESTRUTURA DA PLATAFORMA]
```

### 2. `buildUserContext` (linha 353)
```
// DE:
\n=== USUÁRIO ===\n
// PARA:
\n[PERFIL DO USUÁRIO]\n
```

### 3. `config.system_prompt` (linha 523)
```ts
// DE:
if (config.system_prompt) sysMsg += "\n" + config.system_prompt + "\n";
// PARA:
if (config.system_prompt) sysMsg += "\n[INSTRUÇÕES DO ASSISTENTE]\n" + config.system_prompt + "\n";
```

### 4. `config.system_instruction` (linha 524)
```ts
// DE:
if (config.system_instruction) sysMsg += config.system_instruction + "\n";
// PARA:
if (config.system_instruction) sysMsg += "[INSTRUÇÕES ADICIONAIS]\n" + config.system_instruction + "\n";
```

### 5. `buildRAGContext` (linhas 335, 339)
```
// DE:
=== IDENTIDADE E DIRETRIZES ===
=== CONHECIMENTO RELEVANTE ===
// PARA:
[IDENTIDADE E DIRETRIZES]
[BASE DE CONHECIMENTO]
```

### 6. `RAG_FALLBACK` (linha 405)
```
// DE:
=== AVISO DE BUSCA ===
// PARA:
[AVISO DE BUSCA]
```

### 7. `buildChannelsContext` (linha 347)
```
// DE:
\n=== CANAIS ===\n
// PARA:
\n[CANAIS DA PLATAFORMA]\n
```

### 8. `buildPodcastContext` (linha 364)
```
// DE:
\n=== PODCASTS RECENTES ===\n
// PARA:
\n[PODCASTS RECENTES]\n
```

### 9. `buildPlatformContext` (linhas 374, 381)
```
// DE:
\n=== ARTIGOS RECENTES ===\n
\n=== DISCUSSÕES RECENTES ===\n
// PARA:
\n[ARTIGOS RECENTES]\n
\n[DISCUSSÕES RECENTES]\n
```

### 10. `ANTI_HALLUCINATION` (linha 398)
```
// DE:
\n=== REGRAS ===
// PARA:
\n[REGRAS DE SEGURANÇA]
```

### 11. Instrução final (linha 536)
```ts
// DE:
sysMsg += "\n\nResponda em português brasileiro. Priorize a base RAG. Seja didático. Chame o usuário pelo nome.";
// PARA:
sysMsg += "\n\nResponda em português brasileiro. Siga estritamente as regras definidas em [INSTRUÇÕES DO ASSISTENTE] e [INSTRUÇÕES ADICIONAIS].";
```

