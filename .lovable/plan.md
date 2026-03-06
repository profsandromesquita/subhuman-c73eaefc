

# Plano: Sistema de Temas Sazonais para o Subhumano

## Conceito

O admin seleciona um tema (ex: "Outubro Rosa", "Setembro Amarelo") numa dropdown em Configuracoes Gerais. O valor e salvo na tabela `app_settings` (key: `active_theme`). No frontend, um hook le esse valor e injeta as variaveis CSS correspondentes no `document.documentElement`, sobrescrevendo as variaveis HSL padrao. O resultado e uma mudanca sutil de matiz nos fundos escuros e um accent colorido nos elementos interativos.

## Paletas Definidas

Cada tema sobrescreve apenas as variaveis que mudam (background, card, accent, border, etc.), mantendo o visual dark minimalista.

```text
Tema               Hue   Exemplo background    Exemplo accent/primary
─────────────────── ───── ──────────────────── ──────────────────────
default             0     0 0% 0%               0 0% 100%
outubro_rosa        330   330 8% 4%             330 70% 60%
setembro_amarelo    45    45 10% 4%             45 80% 55%
novembro_azul       210   210 10% 4%            210 70% 55%
mes_mulheres        340   340 8% 4%             340 65% 60%
natal               0     0 12% 5%              140 60% 45%
```

## Arquitetura

```text
┌─────────────────────┐
│  app_settings       │  key: "active_theme"
│  value: "outubro_rosa" │  value: jsonb (string)
└────────┬────────────┘
         │ SELECT
         ▼
┌─────────────────────┐
│  useTheme() hook    │  React Query, staleTime longo
│  le active_theme    │
└────────┬────────────┘
         │ useEffect
         ▼
┌─────────────────────┐
│  document.documentElement │
│  .style.setProperty(      │
│    '--background', '330 8% 4%' │
│    '--card', '330 6% 8%'       │
│    ...                          │
│  )                              │
└─────────────────────┘
```

## Implementacao — 4 passos

### 1. Criar hook `src/hooks/useTheme.ts`

- Define um objeto `THEME_PALETTES` com todas as paletas (cada uma mapeando nomes de variavel CSS para valores HSL)
- Usa React Query para buscar `app_settings` onde `key = 'active_theme'`
- No `useEffect`, aplica as variaveis CSS no `document.documentElement.style`
- Quando tema e `default` ou nulo, remove as propriedades customizadas (volta ao CSS original)
- `staleTime: 5 * 60 * 1000` para nao ficar refetching

### 2. Integrar hook no `App.tsx`

- Adicionar `useTheme()` dentro do componente `App` (precisa estar dentro do QueryClientProvider)
- Refatorar `App` de arrow function constante para function component para poder usar hooks

### 3. Adicionar seletor de tema em `General.tsx` (admin)

- Adicionar uma `<Select>` com as opcoes de tema: "Padrao (Original)", "Outubro Rosa", "Setembro Amarelo", "Novembro Azul", "Mes das Mulheres", "Natal"
- Preview visual: quadrado com a cor de accent do tema selecionado ao lado da opcao
- Salvar como `app_settings` key `active_theme`, value e o slug do tema (ex: `"outubro_rosa"`)

### 4. Nenhuma migracao necessaria

A tabela `app_settings` ja existe com RLS adequado (admins manage, anyone can read). Basta inserir/upsert a key `active_theme`.

## Arquivos impactados

| Arquivo | Acao |
|---|---|
| `src/hooks/useTheme.ts` | Novo — hook + paletas |
| `src/App.tsx` | Refatorar para usar `useTheme()` |
| `src/pages/admin/settings/General.tsx` | Adicionar seletor de tema |

## Risco

Baixo. As variaveis CSS sao sobrescritas em runtime via `style.setProperty`, sem alterar o CSS original. Se o valor for removido ou invalido, o fallback e o tema padrao preto. A mudanca e puramente visual e nao afeta logica de negocio.

