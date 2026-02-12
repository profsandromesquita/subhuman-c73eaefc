

# Plano de Correção: Funcionalidades de Networking

## Diagnóstico

A causa raiz de TODAS as funcionalidades não aparecerem é uma única falha de build:

```
Rollup failed to resolve import "@tiptap/suggestion" from "@tiptap/extension-mention"
```

O pacote `@tiptap/extension-mention` (que foi adicionado para o sistema de menções) depende de `@tiptap/suggestion`, mas essa dependência não foi instalada. Como o build falha, **nenhuma das alterações** (empresa, busca, menções, vínculos) é publicada -- o app continua rodando a versão anterior.

## Correção

### Passo único: Adicionar a dependência faltante

Adicionar `@tiptap/suggestion` ao `package.json`. Isso resolve o erro de build e todas as funcionalidades já implementadas passarão a funcionar:

- `/profile` -- Links para "Buscar" e "Criar perfil empresa" (já estão no código)
- `/profile/company` -- Formulário de cadastro de empresa (já existe)
- `/company/:slug` -- Perfil público da empresa (já existe)
- `/search` -- Busca por pessoas e empresas (já existe)
- `/profile/company/members` -- Gestão de membros (já existe)
- Menções com `@` no editor rico (já configurado no RichTextEditor)

### Detalhes Técnicos

**Arquivo a modificar:** `package.json`

Adicionar nas dependências:
```
"@tiptap/suggestion": "^3.15.0"
```

Essa é a única alteração necessária. Todo o código das funcionalidades (rotas, páginas, hooks, componentes) já está implementado e aguardando apenas que o build passe com sucesso.

