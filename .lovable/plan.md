

# Correcao da Captura de Mencoes no MentionText

## Problema

O regex atual no `MentionText.tsx` (linha 95) aceita **qualquer palavra** apos o `@`, incluindo palavras comuns como "pelo", "artigo", etc. Isso faz com que a mencao capture texto alem do nome do usuario, causando os dois erros reportados:

1. O link sublinhado se estende alem do nome ("@Lilian Vitoria pelo artigo.")
2. A busca no banco falha porque procura "Lilian Vitoria pelo artigo" em vez de "Lilian Vitoria"

### Regex atual (problematico)
```
/@[A-ZA-OO-Y][a-za-oo-y]+(?:\s+[A-Za-zA-OO-oo-y][a-za-oo-y]+)*/
```
Este padrao aceita qualquer palavra subsequente, sem restricao.

### Regex corrigido
```
/@[A-ZA-OO-Y][a-za-oo-y]+(?:\s+(?:(?:d[aeo]s?|e)\s+)?[A-ZA-OO-Y][a-za-oo-y]+)*/
```
Este padrao so aceita palavras subsequentes que:
- Comecem com letra **maiuscula** (nomes proprios)
- Opcionalmente precedidas por preposicoes comuns em nomes brasileiros (de, da, do, das, dos, e)

### Exemplos de captura

| Texto | Antes | Depois |
|---|---|---|
| `@Lilian Vitoria pelo artigo` | `@Lilian Vitoria pelo artigo` | `@Lilian Vitoria` |
| `@Ana de Sousa parabens` | `@Ana de Sousa parabens` | `@Ana de Sousa` |
| `@Joao Carlos dos Santos` | `@Joao Carlos dos Santos` | `@Joao Carlos dos Santos` |

## Arquivo alterado

**`src/components/post/MentionText.tsx`** -- Linha 95: substituir o regex.

Apenas 1 linha muda. Nenhum outro arquivo precisa ser alterado. Com o regex corrigido, o nome capturado sera correto, e a busca no banco encontrara o usuario normalmente, resolvendo ambos os problemas.

