
# Plano: Corrigir Formatação da Descrição do Podcast

## Problema Identificado

Na página de detalhe do podcast (`PodcastDetail.tsx`), a descrição está sendo renderizada em uma tag `<p>` simples que não preserva quebras de linha nem formatação textual.

**Código atual (linha 103-105):**
```jsx
<p className="text-muted-foreground text-left mt-6">
  {podcast.description}
</p>
```

**Resultado:** Todo o texto aparece em um bloco único, sem respeitar parágrafos nem bullets.

## Análise dos Dados

A descrição dos podcasts contém:
- Parágrafos separados por quebras de linha duplas (`\n\n`)
- Listas com marcadores usando hífen (`- item`)
- Seções com títulos implícitos

## Solução Proposta

Usar a propriedade CSS `whitespace-pre-wrap` que:
- Preserva quebras de linha do texto original
- Mantém espaçamentos
- Permite quebra automática de linhas longas

### Alteração no Arquivo

**Arquivo**: `src/pages/PodcastDetail.tsx`

**De:**
```jsx
{podcast.description && (
  <p className="text-muted-foreground text-left mt-6">
    {podcast.description}
  </p>
)}
```

**Para:**
```jsx
{podcast.description && (
  <div className="text-muted-foreground text-left mt-6 whitespace-pre-wrap leading-relaxed">
    {podcast.description}
  </div>
)}
```

### Detalhes Técnicos

| Propriedade | Efeito |
|-------------|--------|
| `whitespace-pre-wrap` | Preserva quebras de linha e espaços, permite wrap em telas menores |
| `leading-relaxed` | Aumenta espaçamento entre linhas para melhor legibilidade |
| `<div>` em vez de `<p>` | Semanticamente mais correto para múltiplos parágrafos |

## Resultado Esperado

O texto passará de:

```
Em fevereiro de 2026, a discussão sobre IA... Cursor 2.4 como "IDE de execução"... GitHub Copilot Auto...
```

Para:

```
Em fevereiro de 2026, a discussão sobre IA para programação mudou de patamar...

Cursor 2.4 como "IDE de execução": subagentes, Skills (SKILL.md)...

GitHub Copilot Auto como "Corporate First": seleção automática de modelo...

Assuntos do episódio:
- Agentes de IA: planejar, executar, iterar
- Cursor 2.4: subagentes, Skills (SKILL.md)
- Copilot Auto: seleção de modelo
```
