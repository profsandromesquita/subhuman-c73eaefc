
# Plano de Implementação: Assistente IA Especialista em Modelos de IA

## Visão Geral

Criar um assistente de chat integrado à plataforma Subhumano, especializado em comparar, recomendar e informar sobre modelos de IA. O sistema terá:

1. **Interface de chat para assinantes** - Acesso via navegação principal
2. **Painel admin** - Configurar prompts, instruções e base de conhecimento
3. **Backend (Edge Function)** - Processar conversas com Lovable AI Gateway

---

## Arquitetura do Sistema

```text
+------------------+       +-------------------+       +--------------------+
|                  |       |                   |       |                    |
|  Assinante       | ----> |  Edge Function    | ----> |  Lovable AI        |
|  (Chat UI)       |       |  /ai-assistant    |       |  Gateway (GPT-5)   |
|                  |       |                   |       |                    |
+------------------+       +-------------------+       +--------------------+
                                   |
                                   v
                           +-------------------+
                           |  Tabela           |
                           |  ai_assistant_    |
                           |  config           |
                           +-------------------+
                                   ^
                                   |
                           +-------------------+
                           |                   |
                           |  Admin Panel      |
                           |  (Configuração)   |
                           |                   |
                           +-------------------+
```

---

## FASE 1: Infraestrutura e Painel Administrativo

### 1.1 Banco de Dados

**Nova tabela:** `ai_assistant_config`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | Primary key |
| system_prompt | text | Prompt do sistema (personalidade) |
| system_instruction | text | Instruções específicas |
| knowledge_base | jsonb | Base de conhecimento (documentos, comparações) |
| model | text | Modelo a usar (default: openai/gpt-5) |
| temperature | numeric | Temperatura (0.1-1.0) |
| max_tokens | integer | Limite de tokens por resposta |
| is_active | boolean | Habilitar/desabilitar assistente |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Data de atualização |

**RLS:** Apenas admins podem ler/modificar.

### 1.2 Painel Admin

**Novo arquivo:** `src/pages/admin/settings/AIAssistant.tsx`

Funcionalidades:
- Editor de System Prompt (textarea grande com formatação)
- Editor de System Instructions
- Área para adicionar/editar base de conhecimento em JSON ou formulário estruturado:
  - Modelos de IA (nome, empresa, tipo, preço, contexto, uso recomendado)
  - Comparações pré-definidas
  - FAQs
- Seletor de modelo (dropdown)
- Slider para temperatura
- Campo para max tokens
- Toggle para ativar/desativar
- Botão de salvar
- Preview do prompt formatado

**Atualizar:** `src/components/admin/AdminSidebar.tsx`
- Adicionar item "Assistente IA" na seção Configurações

### 1.3 Rota Admin

**Atualizar:** `src/App.tsx`
- Adicionar rota `/admin/settings/ai-assistant`

---

## FASE 2: Interface do Assinante e Backend

### 2.1 Edge Function

**Novo arquivo:** `supabase/functions/ai-assistant/index.ts`

Funcionalidades:
- Autenticação do usuário (verificar assinatura ativa)
- Buscar configuração do assistente da tabela `ai_assistant_config`
- Montar prompt com:
  - System prompt configurado
  - System instructions
  - Base de conhecimento (injetada como contexto)
- Streaming de resposta via SSE
- Rate limiting por usuário
- Logging de conversas (opcional, para análise)

### 2.2 Interface de Chat

**Novo arquivo:** `src/pages/AIAssistant.tsx`

Layout:
- Header com título "Assistente IA" e descrição
- Área de chat scrollável
- Input de mensagem com botão enviar
- Indicador de "digitando..." durante streaming
- Renderização de markdown nas respostas
- Sugestões iniciais de perguntas (chips clicáveis)

Sugestões de perguntas:
- "Qual IA é melhor para escrever código?"
- "Compare GPT-5 vs Claude 4"
- "Qual IA tem mais contexto?"
- "Gere um prompt para análise de dados"

### 2.3 Hook de Chat

**Novo arquivo:** `src/hooks/useAIAssistant.ts`

Funcionalidades:
- Gerenciar estado de mensagens
- Streaming de respostas
- Persistência local (opcional, sessionStorage)
- Tratamento de erros (429, 402)

### 2.4 Navegação

**Atualizar:** `src/components/BottomNav.tsx`
- Adicionar item "IA" com ícone Robot ou Brain
- Posicionar entre "Podcast" e "Canais"

**Atualizar:** `src/App.tsx`
- Adicionar rota `/ai-assistant` protegida com SubscriptionGuard

---

## Resumo das Fases

| Fase | Componentes | Descrição |
|------|-------------|-----------|
| **Fase 1** | Banco de dados + Admin | Infraestrutura para configurar o assistente |
| **Fase 2** | Chat UI + Edge Function | Interface para assinantes e backend de IA |

---

## Resultado Esperado

### Após Fase 1:
- Admin poderá configurar em `/admin/settings/ai-assistant`:
  - System prompt personalizado
  - Base de conhecimento estruturada
  - Parâmetros do modelo

### Após Fase 2:
- Assinantes terão acesso a um chat inteligente em `/ai-assistant`
- Poderão fazer perguntas como:
  - "Qual IA é gratuita e boa para código?"
  - "Compare Gemini 2.5 Pro vs GPT-5"
  - "Qual modelo usar para analisar uma planilha de 50MB?"
  - "Gere um prompt para criar um vídeo explicativo"

---

## Seção Técnica

### Estrutura da Base de Conhecimento (JSON)

```json
{
  "models": [
    {
      "name": "GPT-5",
      "company": "OpenAI",
      "type": "text/multimodal",
      "pricing": "Pago ($20/mês Plus, API variável)",
      "context_window": "128k tokens",
      "best_for": ["código", "raciocínio complexo", "análise"],
      "limitations": ["sem geração de imagem nativa"],
      "updated_at": "2025-01"
    },
    {
      "name": "Claude 3.5 Sonnet",
      "company": "Anthropic",
      "type": "text/multimodal",
      "pricing": "Pago ($20/mês Pro)",
      "context_window": "200k tokens",
      "best_for": ["contexto longo", "livros", "documentos"],
      "limitations": ["sem geração de mídia"],
      "updated_at": "2025-01"
    }
  ],
  "categories": {
    "code": ["GPT-5", "Claude 3.5", "Gemini 2.5 Pro"],
    "images": ["Midjourney", "DALL-E 3", "Stable Diffusion"],
    "video": ["Runway Gen-3", "Sora", "Pika"],
    "audio": ["ElevenLabs", "OpenAI TTS", "Suno"]
  },
  "comparisons": [
    {
      "models": ["GPT-5", "Claude 3.5"],
      "summary": "GPT-5 melhor para código, Claude melhor para documentos longos"
    }
  ]
}
```

### System Prompt Sugerido (Inicial)

```text
Você é o Assistente IA do Subhumano, especialista em inteligência artificial.

Sua função é:
1. Comparar modelos de IA (gratuitos e pagos)
2. Recomendar ferramentas para tarefas específicas
3. Explicar diferenças técnicas de forma simples
4. Gerar prompts otimizados para diferentes necessidades

Use a base de conhecimento fornecida para informações atualizadas.

Diretrizes:
- Seja objetivo e direto
- Cite preços quando relevante
- Mencione limitações importantes
- Sugira alternativas gratuitas quando possível
- Use linguagem acessível (PT-BR)
```

### Arquivos a Criar/Modificar

| Fase | Arquivo | Ação |
|------|---------|------|
| 1 | Migração SQL | Criar tabela ai_assistant_config |
| 1 | `src/pages/admin/settings/AIAssistant.tsx` | Criar |
| 1 | `src/components/admin/AdminSidebar.tsx` | Modificar |
| 1 | `src/App.tsx` | Modificar (rota admin) |
| 2 | `supabase/functions/ai-assistant/index.ts` | Criar |
| 2 | `supabase/config.toml` | Modificar |
| 2 | `src/pages/AIAssistant.tsx` | Criar |
| 2 | `src/hooks/useAIAssistant.ts` | Criar |
| 2 | `src/components/BottomNav.tsx` | Modificar |
| 2 | `src/App.tsx` | Modificar (rota assinante) |
