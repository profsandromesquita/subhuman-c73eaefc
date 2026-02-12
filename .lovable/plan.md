

# Plano de Correção: Lógica de Conta Empresa e Menções em Comentários

## Problema 1: Lógica de conta incorreta

**Situação atual errada:** O sistema trata empresa como uma entidade SEPARADA do perfil do usuário. Existe um formulário para "cadastrar empresa" que cria um registro na tabela `companies` vinculado ao usuário, enquanto o perfil pessoal continua existindo separadamente.

**Lógica correta:** Um perfil é OU pessoal OU empresa. A tabela `profiles` já tem a coluna `account_type`. A tabela `companies` já existe para armazenar dados de empresa. O que precisa mudar é a UX: em vez de "criar empresa separada", o usuário "transforma sua conta" de pessoal para empresa, e os dados da empresa ficam vinculados ao seu perfil.

### Mudanças necessárias:

1. **Página de Perfil (`Profile.tsx`):**
   - Remover o link separado "Criar perfil empresa"
   - Adicionar opção "Mudar para conta empresa" se `account_type === 'personal'`
   - Se já for empresa, mostrar "Editar dados da empresa" que leva ao formulário da empresa
   - Exibir badge visual indicando tipo de conta (Pessoal / Empresa)

2. **Formulário da empresa (`CompanyForm.tsx`):**
   - Ao salvar, além de criar/atualizar na tabela `companies`, atualizar `profiles.account_type = 'company'`
   - Título da página: "Transformar em conta empresa" (quando pessoal) ou "Editar dados da empresa" (quando já é empresa)
   - Adicionar opção de "Voltar para conta pessoal" que deleta a entrada em `companies` e volta `account_type = 'personal'`

3. **Hook `useProfile.ts`:**
   - Incluir `account_type` no tipo `Profile` e na query

4. **Vínculo usuário-empresa:**
   - Manter lógica existente de `company_members` -- um usuário pessoal pode solicitar vínculo com uma conta empresa
   - No formulário de dados pessoais, o campo "Empresa" permite buscar empresas cadastradas e solicitar vínculo

---

## Problema 2: Menções não funcionam em comentários

**Causa:** Os comentários usam um `<textarea>` simples (em `ChannelPostDetail.tsx` e `CommentInput.tsx`). O sistema de menções só funciona no `RichTextEditor` (Tiptap) usado para criar posts. Textareas nativos não suportam extensões Tiptap.

### Solução: Criar componente `MentionCommentInput`

Um input de comentário que detecta `@` e exibe um dropdown de sugestões, sem precisar de Tiptap (que seria muito pesado para um simples campo de comentário).

1. **Novo componente `MentionCommentInput.tsx`:**
   - Textarea com detecção de `@` via regex no texto digitado
   - Ao digitar `@` seguido de letras, abre dropdown posicionado acima do cursor
   - Reutiliza `fetchMentionSuggestions` do `MentionSuggestions.tsx` para buscar usuários/empresas
   - Ao selecionar, substitui `@query` por `@NomeDaPessoa` no texto
   - Armazena internamente as menções selecionadas (id, tipo) para extração posterior

2. **Substituir textarea em `ChannelPostDetail.tsx`:**
   - Trocar o `<Textarea>` atual pelo novo `MentionCommentInput`
   - Ao submeter o comentário, extrair menções e salvar na tabela `mentions`

3. **Substituir textarea em `CommentInput.tsx`:**
   - Mesmo tratamento para os comentários de artigos (space updates)
   - Integrar o dropdown de menções

4. **Renderização de menções em comentários (`CommentItem.tsx`):**
   - Adicionar detecção de padrões `@NomeDaPessoa` no texto do comentário
   - Renderizar como links clicáveis (azul, sem navegação por enquanto)

---

## Resumo de arquivos

### Arquivos a modificar:
- `src/pages/Profile.tsx` -- Reorganizar menu para lógica de transformação de conta
- `src/pages/profile/CompanyForm.tsx` -- Atualizar `account_type` ao salvar
- `src/hooks/useProfile.ts` -- Incluir `account_type`
- `src/pages/ChannelPostDetail.tsx` -- Trocar textarea por MentionCommentInput
- `src/components/post/CommentInput.tsx` -- Trocar textarea por MentionCommentInput

### Arquivos a criar:
- `src/components/MentionCommentInput.tsx` -- Input de comentário com suporte a @menções

### Sem mudanças no banco:
- A coluna `account_type` em `profiles` já existe
- A tabela `companies` já existe
- A tabela `mentions` já existe

