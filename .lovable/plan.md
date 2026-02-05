

# Plano de Correção: Assistente IA com RAG Funcional

## Diagnóstico dos Problemas

### Problema Principal: Chunks não foram criados
O documento de Constituição está com status "indexed" mas a tabela `rag_chunks` está vazia. Isso indica que a edge function `ingest-document` falhou silenciosamente na geração de embeddings ou inserção de chunks.

### Problemas Secundários
1. O modelo usa `knowledge_base` JSON desatualizado como fallback
2. Não há informação de data atual no prompt
3. Assistente não tem acesso ao conteúdo publicado na plataforma
4. Assistente não pode buscar discussões nos canais

---

## Fase 1: Corrigir Ingestão de Documentos

### 1.1 Corrigir edge function `ingest-document`
O problema está na linha 434 onde o embedding é convertido para JSON string, mas o Supabase espera o vetor em formato diferente.

```typescript
// Problema atual:
embedding: JSON.stringify(embedding), // Salva como "[0.1, 0.2, ...]" string

// Correção:
embedding: `[${embedding.join(',')}]`, // Formato correto para pgvector
```

### 1.2 Adicionar logs detalhados para debugging
Inserir console.log em pontos críticos para identificar falhas.

---

## Fase 2: Integrar Conteúdo Publicado

### 2.1 Modificar `ai-assistant` para buscar posts recentes
Adicionar busca nas tabelas:
- `space_updates` (últimos 10-20 posts publicados)
- `channel_posts` (últimas discussões relevantes)

### 2.2 Novo bloco de contexto
```
=== CONTEÚDO PUBLICADO NA PLATAFORMA ===

[Título do Post] - Publicado em 03/02/2026
Resumo: Cursor 2.4 vs Copilot...

=== DISCUSSÕES NOS CANAIS ===

[Ferramentas] @usuário falou sobre: Google Veo 3.2...
```

---

## Fase 3: Melhorar System Prompt

### 3.1 Adicionar data atual
```
Data atual: 05 de fevereiro de 2026

REGRAS IMPORTANTES:
- Não cite informações com datas anteriores a Janeiro de 2026 sem avisar que podem estar desatualizadas
```

### 3.2 Instruções mais claras
Reforçar que o modelo deve:
- Priorizar informações da base de conhecimento RAG
- Citar a Constituição quando perguntado sobre a identidade da plataforma
- Indicar discussões nos canais quando relevante
- Nunca inventar dados técnicos (preços, specs, etc.)

---

## Fase 4: Melhorar Interface do Chat

### 4.1 Adicionar botão de copiar resposta
Botão discreto no canto da mensagem do assistente.

### 4.2 Adicionar seção de capacidades
No estado vazio (antes de mensagens), mostrar:
```
O que posso fazer:
- Comparar modelos de IA (preços, recursos, limitações)
- Explicar conceitos de forma acessível
- Recomendar ferramentas para seu caso
- Gerar prompts otimizados
- Indicar discussões relevantes na comunidade
- Resumir posts publicados na plataforma
```

### 4.3 Atualizar sugestões iniciais
Substituir por exemplos que demonstram as novas capacidades:
- "O que a plataforma Subhumano oferece?"
- "Quem está falando sobre IA para vídeos?"
- "Qual IA devo usar para código?"
- "Resuma os posts recentes sobre produtividade"

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `supabase/functions/ingest-document/index.ts` | Corrigir formato do embedding para pgvector |
| `supabase/functions/ai-assistant/index.ts` | Adicionar busca em space_updates e channel_posts, incluir data atual |
| `src/pages/AIAssistant.tsx` | Adicionar botão copiar, seção de capacidades, novas sugestões |

---

## Fluxo Corrigido

```text
Pergunta do Usuário
       │
       ▼
┌─────────────────────────────────────────┐
│ 1. Gerar embedding da pergunta          │
│ 2. Buscar chunks RAG (Constituição +    │
│    Núcleo + Biblioteca)                 │
│ 3. Buscar posts publicados relevantes   │
│ 4. Buscar discussões nos canais         │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ MONTAGEM DO PROMPT:                     │
│                                         │
│ 1. Data atual + Instruções base         │
│ 2. IDENTIDADE (Constituição RAG)        │
│ 3. CONHECIMENTO (Chunks relevantes)     │
│ 4. CONTEÚDO DA PLATAFORMA              │
│    - Posts publicados recentes          │
│    - Discussões nos canais              │
│ 5. HISTÓRICO DA CONVERSA               │
│ 6. PERGUNTA ATUAL                       │
└─────────────────────────────────────────┘
       │
       ▼
    Resposta IA
```

---

## Resultado Esperado

Após as correções, ao perguntar "Qual a constituição da plataforma Subhumano?", a resposta será:

> "A Constituição do Subhumano define nossa identidade e propósito:
> 
> **Propósito**: Desmistificar e democratizar o conhecimento sobre IA...
> 
> **Tom de Voz**: Acessível e descontraído, técnico quando necessário...
> 
> **Regras Absolutas**:
> 1. Nunca inventar informações sobre modelos ou preços
> 2. Sempre indicar quando não souber algo
> ..."

(Citando diretamente o documento inserido, não inventando.)

---

## Validações Pós-Implementação

1. Verificar que `rag_chunks` tem registros após reindexar
2. Testar pergunta sobre Constituição → deve citar o documento
3. Testar pergunta sobre posts → deve mencionar conteúdo real
4. Testar pergunta sobre discussões → deve indicar usuários/canais
5. Testar botão de copiar → deve copiar markdown formatado

