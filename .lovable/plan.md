

# Plano: Corrigir Logica de Conta Unica e Modal de Mencoes

## Problema 1: Duas contas (profiles + companies)

**Situacao atual:** Quando o usuario transforma em empresa, o sistema cria um registro na tabela `companies` E mantem o registro em `profiles`. Isso gera "2 cadastros" como visto na imagem (menu mostra tanto "Dados da empresa" quanto "Dados pessoais").

**Solucao:** Eliminar a tabela `companies` do fluxo de conta propria. Os dados extras de empresa (CNPJ e Website) devem ficar direto na tabela `profiles`. A tabela `companies` continua existindo para o sistema de busca e mencoes de empresas de terceiros, mas NAO para a conta do proprio usuario.

### Mudancas:

**1. Banco de dados -- adicionar 2 colunas em `profiles`:**
- `cnpj text` (nullable)
- `website text` (nullable)

Essas sao as unicas informacoes que faltam para uma conta pessoal virar empresa. Todos os outros campos (nome, bio, logo, cidade, estado, industria, redes sociais) ja existem em `profiles`.

**2. Pagina de Perfil (`Profile.tsx`):**
- Se `account_type === 'personal'`: mostrar menu normal com "Dados pessoais" e botao "Mudar para conta empresa"
- Se `account_type === 'company'`: mostrar "Dados da empresa" no lugar de "Dados pessoais" (leva para a MESMA pagina de edicao, mas com campos extras de CNPJ e Website)
- REMOVER o item separado "Dados da empresa" que aponta para `/profile/company`
- Ou seja, existe apenas UM item de edicao de dados, nunca dois

**3. Pagina de Dados Pessoais (`PersonalData.tsx`):**
- Adicionar secao condicional: se `account_type === 'company'`, mostrar campos de CNPJ e Website
- Alterar titulo da pagina: "Dados pessoais" quando pessoal, "Dados da empresa" quando empresa
- Adicionar botao "Mudar para conta empresa" no final (se pessoal) que simplesmente altera `account_type` para `'company'` e mostra os campos extras
- Adicionar botao "Voltar para conta pessoal" (se empresa) que altera `account_type` para `'personal'`

**4. Remover pagina CompanyForm.tsx da navegacao do perfil:**
- A rota `/profile/company` deixara de ser usada para edicao do proprio perfil
- O `CompanyForm.tsx` pode ser mantido para cadastro de empresas de terceiros futuramente, mas nao sera acessivel pelo menu do perfil

**5. Limpar dado duplicado no banco:**
- A empresa ITIA criada na tabela `companies` para o usuario 758ad... sera removida (via insert tool) ja que os dados ja estao em `profiles`

---

## Problema 2: Clicar em mencao deve abrir modal do perfil

**Situacao atual:** Mencoes em posts e comentarios sao exibidas como texto estilizado (`@NomeDaPessoa`), mas nao sao clicaveis. O usuario quer que ao clicar, abra o mesmo modal que aparece ao clicar no autor do artigo (AuthorModal).

### Mudancas:

**1. Componente `AuthorModal.tsx` -- expandir para suportar empresas:**
- O tipo `Author` ja tem os campos necessarios (nome, avatar, bio, education, redes sociais)
- Nenhuma mudanca estrutural necessaria, apenas garantir que funcione com dados de empresa tambem

**2. `PostContent.tsx` -- tornar mencoes clicaveis:**
- Adicionar event listener para cliques em elementos `.mention` no conteudo HTML
- Ao clicar, extrair `data-mention-id` e `data-mention-type`
- Buscar dados do perfil mencionado (profiles ou companies) via Supabase
- Abrir o AuthorModal com os dados do usuario/empresa mencionada

**3. `CommentItem.tsx` -- tornar mencoes clicaveis nos comentarios:**
- Atualmente renderiza `@NomeDaPessoa` como span colorido mas nao clicavel
- Modificar para que ao clicar no `@NomeDaPessoa`, busque o perfil pelo nome e abra o AuthorModal
- Para isso, as mencoes salvas no MentionCommentInput precisam incluir o ID para lookup posterior
- Solucao pragmatica: ao renderizar o comentario, detectar padroes `@NomeDaPessoa` e transformar em botoes clicaveis que buscam o perfil

---

## Resumo de arquivos

### Migracao de banco:
- Adicionar colunas `cnpj` e `website` na tabela `profiles`

### Arquivos a modificar:
- `src/pages/Profile.tsx` -- Remover item duplicado, mostrar apenas 1 opcao de edicao
- `src/pages/profile/PersonalData.tsx` -- Adicionar campos CNPJ/Website condicionais + botoes de transformacao
- `src/hooks/useProfile.ts` -- Adicionar `cnpj` e `website` ao tipo Profile
- `src/components/post/PostContent.tsx` -- Mencoes clicaveis com AuthorModal
- `src/components/post/CommentItem.tsx` -- Mencoes clicaveis com AuthorModal
- `src/components/post/AuthorModal.tsx` -- Suportar dados de empresa (website, cnpj exibidos)

### Dados a limpar:
- Remover registro da empresa ITIA da tabela `companies` (dados ja estao em profiles)

### Ordem de execucao:
1. Migracao de banco (adicionar cnpj e website em profiles)
2. Corrigir Profile.tsx (remover duplicidade de menu)
3. Atualizar PersonalData.tsx (campos extras + transformacao de conta)
4. Implementar clique em mencoes (PostContent + CommentItem + AuthorModal)
5. Limpar dados duplicados

