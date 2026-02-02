

# Plano de Correção: Scrollbar no Editor Rich Text da Área Admin

## Problema Identificado

Analisando a imagem anexada e o código atual, identifiquei que ao colar textos grandes no editor da página `/admin/content`, o conteúdo ultrapassa os limites da tela sem exibir scrollbar, tornando a edição impossível.

### Análise Técnica

| Componente | Estado Atual | Problema |
|------------|--------------|----------|
| `DialogContent` | `fixed top-[50%] translate-y-[-50%]` | Sem `max-height`, cresce indefinidamente |
| `RichTextEditor` | `min-h-[200px]` | Sem `max-height` nem `overflow-y: auto` |
| `.tiptap-editor` (CSS) | `min-h-[200px]` | Sem limite de altura máxima |

### Fluxo do Problema

```text
┌─────────────────────────────────────────────┐
│          Viewport (tela)                    │
│  ┌─────────────────────────────────────────┐│
│  │         Dialog (sem max-height)         ││
│  │  ┌───────────────────────────────────┐  ││
│  │  │    Editor (sem max-height)        │  ││
│  │  │                                   │  ││
│  │  │    Texto cresce infinitamente...  │  ││
│  │  │    ...ultrapassa a viewport...    │  ││
│──│──│────────────────────────────────────│──││
│  │  │    ...parte fica inacessível      │  ││ ← Área fora da tela
│  │  └───────────────────────────────────┘  ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

## Solução Proposta

Implementar scroll em **duas camadas**:

### 1. Dialog com altura máxima e scroll

O `DialogContent` precisa ter altura máxima relativa à viewport e scroll interno:

```text
┌─────────────────────────────────────────────┐
│          Viewport (tela)                    │
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │  Dialog (max-h-[90vh] overflow-y-auto)  ││
│  │  ┌───────────────────────────────────┐  ││
│  │  │  Header fixo                      │  ││
│  │  ├───────────────────────────────────┤  ││
│  │  │  Formulário com scroll ↕          │  ││
│  │  │  ────────────────────────────     │  ││
│  │  │  Editor (max-h-[300px])           │  ││ ← Scroll interno
│  │  │  ────────────────────────────     │  ││
│  │  │  Mídia                            │  ││
│  │  │  ────────────────────────────     │  ││
│  │  │  Botões                           │  ││
│  │  └───────────────────────────────────┘  ││
│  └─────────────────────────────────────────┘│
│                                             │
└─────────────────────────────────────────────┘
```

### 2. Editor com altura máxima e scroll próprio

O editor Tiptap terá limite de altura e scrollbar quando o conteúdo exceder.

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/admin/SpaceContent.tsx` | Adicionar classes de scroll no DialogContent e wrapper do form |
| `src/components/editor/RichTextEditor.tsx` | Adicionar `max-height` e `overflow-y-auto` no container do editor |
| `src/components/editor/editor.css` | Adicionar `max-height` e `overflow-y-auto` na classe `.tiptap-editor` |

## Implementação Detalhada

### 1. Modificar `src/pages/admin/SpaceContent.tsx`

**Linha 350 - DialogContent:**
```tsx
// Antes
<DialogContent className="max-w-2xl">

// Depois
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
```

### 2. Modificar `src/components/editor/RichTextEditor.tsx`

**Linhas 71-76 - Container do editor:**
```tsx
// Antes
return (
  <div className="border border-border rounded-lg overflow-hidden bg-card">
    <EditorToolbar editor={editor} />
    <EditorContent editor={editor} />
  </div>
);

// Depois
return (
  <div className="border border-border rounded-lg overflow-hidden bg-card">
    <EditorToolbar editor={editor} />
    <div className="max-h-[300px] overflow-y-auto">
      <EditorContent editor={editor} />
    </div>
  </div>
);
```

### 3. Modificar `src/components/editor/editor.css`

**Linhas 3-6 - Estilo do .tiptap-editor:**
```css
/* Antes */
.tiptap-editor {
  @apply prose prose-sm dark:prose-invert max-w-none;
  @apply min-h-[200px] p-4 focus:outline-none;
}

/* Depois */
.tiptap-editor {
  @apply prose prose-sm dark:prose-invert max-w-none;
  @apply min-h-[150px] p-4 focus:outline-none;
}
```

## Resultado Visual Esperado

### Antes da Correção
```text
┌────────────────────────────┐
│  Dialog SEM SCROLL         │
│  ──────────────────────────│
│  Editor cresce...          │
│  ...infinitamente...       │
│  ...ultrapassa a tela...   │
│──────────────────────────────  ← Corta aqui
│  ...texto inacessível      │
└────────────────────────────┘
```

### Depois da Correção
```text
┌────────────────────────────┐
│  Dialog COM SCROLL         │
│  ──────────────────────────│
│  Editor com altura fixa:   │
│  ┌──────────────────────┐ ▲│
│  │ Texto visível...     │ │││
│  │ Mais texto...        │ ████  ← Scrollbar
│  │ E mais texto...      │ ││
│  └──────────────────────┘ ▼│
│                            │
│  [Salvar]     [Publicar]   │
└────────────────────────────┘
```

## Comportamento Final

| Cenário | Comportamento |
|---------|---------------|
| Texto curto | Editor mostra todo o conteúdo, sem scrollbar visível |
| Texto longo | Editor exibe scrollbar vertical, altura fixa de 300px |
| Dialog cheio | Dialog exibe scrollbar, altura máxima de 90vh |
| Mobile | Comportamento responsivo mantido |

## Considerações Técnicas

### Hierarquia de Scroll

1. **Dialog (externo)**: `max-h-[90vh] overflow-y-auto`
   - Garante que o modal nunca ultrapasse 90% da altura da viewport
   - Permite scroll de todo o formulário se necessário

2. **Editor (interno)**: `max-h-[300px] overflow-y-auto`
   - Limita a altura do editor a 300px
   - Permite scroll apenas do conteúdo do editor
   - Toolbar permanece visível e fixa no topo do editor

### Altura do Editor

A altura de 300px foi escolhida para:
- Permitir espaço suficiente para outros campos do formulário
- Mostrar quantidade razoável de texto sem scroll
- Manter boa experiência em telas menores

## Testes Recomendados

Após implementação, verificar:

1. Colar texto longo (10+ parágrafos) → Editor deve exibir scrollbar
2. Scroll dentro do editor → Toolbar permanece visível
3. Scroll do dialog → Formulário completo acessível
4. Mobile → Comportamento responsivo funcional
5. Editar conteúdo existente longo → Scroll funcionando corretamente

