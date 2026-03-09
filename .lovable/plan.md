

## Seção `/events` — reescrita definitiva

### Causa objetiva

Há duas causas concretas que produzem cards com alturas desiguais:

1. **Altura da imagem inconsistente**: cards com `cover_url` usam `h-40 lg:h-52` (linha 175). Cards sem `cover_url` usam `h-28` (linha 178). Essa diferença de 96px (desktop) na região da imagem faz cards na mesma row do grid terem pontos de partida diferentes para o conteúdo textual.

2. **Campos condicionais no corpo**: `event.description` (linha 201), `event.location` (linha 212) e `event.max_participants` (linha 222) são opcionais. Um card com os 3 preenchidos ocupa ~60px a mais que um card sem nenhum. Embora o `mt-auto` (linha 230) empurre o botão para baixo, a altura total do card varia entre rows porque o CSS grid equaliza apenas dentro da mesma row — e cards de rows diferentes com combinações distintas de campos opcionais resultam em alturas visuais inconsistentes dentro do layout geral.

O `h-full flex flex-col` (linha 170) e o `mt-auto` (linha 230) já estão aplicados e funcionam corretamente para alinhar o botão à base **dentro de cada row**. O problema visível é a diferença de altura da imagem de fallback.

### Correção exata

| Linha | Elemento | Estado atual | Correção |
|---|---|---|---|
| 178 | `div` fallback (sem cover) | `h-28` | Mudar para `h-40 lg:h-52` — igualar à altura da imagem real |
| 219 | `span` de localização | sem truncamento | Adicionar classe `truncate` |
| 210 | `span` de datas | sem truncamento | Adicionar classe `truncate` |

### Elementos com altura padronizada

- **Imagem/fallback**: `h-40 lg:h-52` em ambos os casos (com e sem cover)
- **Card completo**: `h-full flex flex-col` (já aplicado, linha 170)
- **Área de conteúdo**: `flex-1 flex flex-col` (já aplicado, linha 182)
- **Área de ação**: `mt-auto` (já aplicado, linha 230)

### Campos com truncamento

| Campo | Classe | Estado |
|---|---|---|
| `event.title` | `line-clamp-2` | Já aplicado (linha 197) |
| `event.description` | `line-clamp-2` | Já aplicado (linha 202) |
| `event.location` | `truncate` | **A aplicar** (linha 219) |
| Datas das sessões | `truncate` | **A aplicar** (linha 210) |

### Como a área de ação fica fixada na base

A estrutura já está correta:
```
<div className="h-full flex flex-col">         ← card ocupa 100% do grid item
  <img className="h-40 lg:h-52" />             ← altura fixa
  <div className="flex-1 flex flex-col">        ← conteúdo cresce
    ...badges, título, descrição, metadados...
    <div className="mt-auto">                   ← empurrado para a base
      preço + botões
    </div>
  </div>
</div>
```

Nenhuma alteração estrutural necessária. O `mt-auto` já fixa o bloco de ação na base. A correção da altura do fallback é o que garante que todos os cards da mesma row tenham a mesma altura total.

### Critério de aceite (desktop, viewport 1440×900)

1. Todos os cards em cada linha do grid têm a mesma altura visual, independente de ter ou não imagem de capa
2. A área de imagem/fallback ocupa a mesma altura em todos os cards
3. O bloco preço + botões está alinhado na base em todos os cards de uma mesma linha
4. Título truncado em no máximo 2 linhas com `...`
5. Descrição truncada em no máximo 2 linhas com `...`
6. Localização truncada com `...` quando excede a largura do card
7. Datas truncadas com `...` quando excedem a largura do card
8. Nenhuma alteração visual no mobile

