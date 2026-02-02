

# Plano: Adicionar Frases de Impacto nos Espaços

## Objetivo

Inserir frases motivacionais/de impacto em cada página de detalhe de Espaço, posicionadas entre o header (título do espaço) e o primeiro card de notícia.

## Mapeamento das Frases

| Slug | Espaço | Frase |
|------|--------|-------|
| `produtividade` | Produtividade Pessoal | "Produtividade não é trabalhar mais, é renderizar o resultado mais rápido." |
| `marketing` | Marketing e Vendas | "Marketing sem dados é arte; com IA, é ciência de conversão." |
| `programacao` | Programação e Automação | "Você não precisa ser sênior em Python, precisa ser sênior em resolver problemas." |
| `audiovisual` | AudioVisual | "A qualidade de cinema agora cabe no orçamento de freelancer." |
| `estilo-vida` | Estilo de Vida | "A tecnologia deve servir ao humano, não o contrário." |

## Layout Visual Proposto

```text
┌─────────────────────────────────────────┐
│  ← [Voltar]   Produtividade Pessoal     │  ← Header existente
│               12 atualizações           │
├─────────────────────────────────────────┤
│                                         │
│  "Produtividade não é trabalhar mais,   │  ← NOVA FRASE
│   é renderizar o resultado mais rápido."│     (itálico, texto secundário)
│                                         │
├─────────────────────────────────────────┤
│  [Card da notícia 1]                    │
│  [Card da notícia 2]                    │
│  ...                                    │
└─────────────────────────────────────────┘
```

## Arquivo a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/SpaceDetail.tsx` | Adicionar objeto de frases e renderizar entre header e feed |

## Implementação Detalhada

### 1. Criar objeto de mapeamento das frases

```tsx
const SPACE_TAGLINES: Record<string, string> = {
  'produtividade': 'Produtividade não é trabalhar mais, é renderizar o resultado mais rápido.',
  'marketing': 'Marketing sem dados é arte; com IA, é ciência de conversão.',
  'programacao': 'Você não precisa ser sênior em Python, precisa ser sênior em resolver problemas.',
  'audiovisual': 'A qualidade de cinema agora cabe no orçamento de freelancer.',
  'estilo-vida': 'A tecnologia deve servir ao humano, não o contrário.',
};
```

### 2. Renderizar a frase após o header

A frase será inserida entre o `</motion.div>` do header (linha 123) e o início do feed de updates (linha 125):

```tsx
{/* Frase de impacto */}
{spaceId && SPACE_TAGLINES[spaceId] && (
  <motion.p
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.1 }}
    className="text-sm text-muted-foreground italic mb-6 leading-relaxed"
  >
    "{SPACE_TAGLINES[spaceId]}"
  </motion.p>
)}
```

## Estilização

| Propriedade | Valor | Motivo |
|-------------|-------|--------|
| `text-sm` | 14px | Tamanho discreto, não compete com títulos |
| `text-muted-foreground` | Cinza (#9ca3af) | Seguindo design system do Subhumano |
| `italic` | Itálico | Diferencia visualmente como citação/frase |
| `mb-6` | 24px | Espaçamento antes dos cards |
| `leading-relaxed` | 1.625 | Melhor legibilidade para frases longas |

## Animação

A frase terá uma animação sutil de fade-in com delay de 0.1s, aparecendo logo após o header para criar uma transição suave.

## Código Final (trecho relevante)

```tsx
const SPACE_TAGLINES: Record<string, string> = {
  'produtividade': 'Produtividade não é trabalhar mais, é renderizar o resultado mais rápido.',
  'marketing': 'Marketing sem dados é arte; com IA, é ciência de conversão.',
  'programacao': 'Você não precisa ser sênior em Python, precisa ser sênior em resolver problemas.',
  'audiovisual': 'A qualidade de cinema agora cabe no orçamento de freelancer.',
  'estilo-vida': 'A tecnologia deve servir ao humano, não o contrário.',
};

// ... dentro do return, após o header:

{/* Frase de impacto */}
{spaceId && SPACE_TAGLINES[spaceId] && (
  <motion.p
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.1 }}
    className="text-sm text-muted-foreground italic mb-6 leading-relaxed"
  >
    "{SPACE_TAGLINES[spaceId]}"
  </motion.p>
)}

{/* Updates Feed */}
{updates.length === 0 ? (
  // ...
```

## Resultado Esperado

1. Cada página de Espaço exibirá sua frase de impacto única
2. A frase aparece com animação sutil após o carregamento
3. Design consistente com o sistema visual do Subhumano (minimalista, dark mode)
4. Sem impacto em espaços sem frase configurada (fallback silencioso)

