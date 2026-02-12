

# Plano: Perfil de Empresa, Menções e Busca na Plataforma

Este plano abrange 5 funcionalidades inter-relacionadas que expandem significativamente as capacidades de networking da plataforma Subhumano.

---

## Visao Geral

O objetivo e criar um ecossistema onde empresas possam ter presenca na plataforma, usuarios possam se vincular a elas, e tanto usuarios quanto empresas possam ser mencionados em postagens e comentarios. Tudo isso alimentado por uma busca unificada.

---

## Fase 1: Banco de Dados - Novas Tabelas e Alteracoes

### 1.1 Tabela `companies` (perfil de empresa)
Armazena os dados cadastrais de cada empresa na plataforma.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador unico |
| owner_id | uuid (FK profiles) | Usuario que criou/administra a empresa |
| name | text | Nome da empresa |
| slug | text (unique) | URL amigavel |
| description | text | Descricao/bio da empresa |
| logo_url | text | Logo da empresa |
| website | text | Site da empresa |
| industry | text | Area de atuacao |
| city | text | Cidade |
| state | text | Estado |
| cnpj | text | CNPJ (opcional) |
| instagram_url | text | Instagram |
| linkedin_url | text | LinkedIn |
| is_verified | boolean | Verificada pelo admin |
| is_active | boolean | Ativa na plataforma |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Data de atualizacao |

**RLS:** Owner pode editar; qualquer autenticado pode visualizar empresas ativas; admins podem gerenciar todas.

### 1.2 Tabela `company_members` (vinculo usuario-empresa)
Gerencia os pedidos de vinculo e membros aprovados.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador |
| company_id | uuid (FK companies) | Empresa |
| user_id | uuid (FK profiles) | Usuario solicitante |
| role | text | Papel na empresa (colaborador, gestor) |
| job_title | text | Cargo na empresa |
| status | text | pending, approved, rejected |
| requested_at | timestamptz | Data da solicitacao |
| responded_at | timestamptz | Data da resposta |

**RLS:** Usuario ve seus proprios vinculos; owner da empresa gerencia membros; admins veem tudo.

### 1.3 Tabela `mentions` (mencoes em conteudos)
Registra cada mencao (@usuario ou @empresa) feita em qualquer conteudo.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador |
| author_id | uuid | Quem mencionou |
| mentioned_user_id | uuid (nullable) | Usuario mencionado |
| mentioned_company_id | uuid (nullable) | Empresa mencionada |
| context_type | text | 'space_update', 'channel_post', 'comment' |
| context_id | uuid | ID do conteudo onde foi feita a mencao |
| created_at | timestamptz | Data |

**RLS:** Qualquer autenticado pode inserir; usuarios veem mencoes onde sao mencionados; admins veem tudo.

### 1.4 Coluna `account_type` na tabela `profiles`
Adicionar coluna `account_type text default 'personal'` para distinguir contas pessoais de contas empresa (quando o usuario alterna para modo empresa no perfil, ele cria uma entrada na tabela `companies` e o `account_type` indica sua preferencia de exibicao).

---

## Fase 2: Cadastro de Empresa

### 2.1 Pagina `/profile/company` - Formulario de Empresa
- Acessivel a partir do menu do perfil com opcao "Criar perfil de empresa"
- Formulario com campos: nome, descricao, logo (upload para bucket `avatars`), website, CNPJ, industria, cidade, estado, redes sociais
- Validacao com Zod no client-side
- Ao salvar, insere na tabela `companies` com `owner_id = user.id`

### 2.2 Pagina `/company/:slug` - Perfil Publico da Empresa
- Exibe informacoes da empresa, logo, membros vinculados
- Botao "Solicitar vinculo" para usuarios que trabalham nela

### 2.3 Alteracao na pagina de Perfil (`/profile`)
- Novo item de menu: "Minha empresa" (se ja tem empresa) ou "Criar perfil empresa" (se nao tem)
- Badge visual indicando conta empresa vs pessoal

---

## Fase 3: Vinculo Usuario-Empresa

### 3.1 No formulario de Dados Pessoais (`/profile/personal`)
- O campo "Empresa" atual sera transformado em um campo com busca que sugere empresas cadastradas na plataforma
- Se o usuario selecionar uma empresa existente, sera criada uma solicitacao na tabela `company_members` com status `pending`
- Se digitar um nome que nao existe, o campo continua como texto livre (comportamento atual preservado)

### 3.2 Notificacoes de vinculo
- Quando um usuario solicita vinculo, o owner da empresa recebe notificacao (tabela `notifications`)
- O owner pode aprovar/rejeitar na pagina da empresa
- O usuario recebe notificacao do resultado

### 3.3 Gerenciamento de membros
- Na pagina da empresa, o owner ve lista de membros e solicitacoes pendentes
- Pode aprovar, rejeitar ou remover membros

---

## Fase 4: Sistema de Mencoes (@)

### 4.1 Componente `MentionInput`
- Ao digitar `@` em qualquer campo de texto/comentario, abre um dropdown com sugestoes
- Busca em tempo real por usuarios (profiles.full_name) e empresas (companies.name)
- Exibe avatar/logo, nome e tipo (pessoa/empresa) no dropdown
- Ao selecionar, insere a mencao formatada no texto

### 4.2 Integracao nos editores existentes
- **CommentInput** (`src/components/post/CommentInput.tsx`): Adicionar deteccao de `@` no textarea com popup de sugestoes
- **RichTextEditor** (`src/components/editor/RichTextEditor.tsx`): Adicionar extensao Tiptap `@tiptap/extension-mention` para mencoes inline no editor rico
- **CreateChannelPost**: Funciona automaticamente via RichTextEditor

### 4.3 Renderizacao de mencoes
- Mencoes renderizadas como links clicaveis estilizados (cor primaria, clicavel)
- Clicar em `@usuario` navega para perfil publico
- Clicar em `@empresa` navega para perfil da empresa

### 4.4 Notificacoes de mencao
- Ao criar/editar conteudo com mencoes, extrair as mencoes do texto
- Inserir registros na tabela `mentions`
- Criar notificacao para cada mencionado (respeitando `notify_mentions` do perfil)

---

## Fase 5: Busca Unificada

### 5.1 Pagina `/search` - Busca Global
- Campo de busca no topo
- Abas: "Todos", "Pessoas", "Empresas"
- Resultados mostram avatar/logo, nome, descricao curta
- Clicar leva ao perfil do usuario ou empresa

### 5.2 Hook `useSearch`
- Recebe termo de busca e tipo (all, users, companies)
- Busca em `profiles.full_name` e `companies.name` usando `ilike`
- Debounce de 300ms para evitar requisicoes excessivas
- Paginacao com limite de 20 resultados

### 5.3 Acesso a busca
- Icone de lupa no header ou bottom nav
- Tambem acessivel pelo campo de mencoes (@)

---

## Fase 6: Integracao com IA

### 6.1 Enriquecimento do contexto RAG
- Os dados de empresas e vinculos podem ser consultados pelo assistente de IA para sugestoes de networking
- Nenhuma alteracao necessaria agora, pois a estrutura de dados ja sera acessivel

---

## Resumo de Arquivos

### Novos arquivos a criar:
- `src/pages/CompanyProfile.tsx` - Perfil publico da empresa
- `src/pages/profile/CompanyForm.tsx` - Formulario de cadastro/edicao da empresa
- `src/pages/profile/CompanyMembers.tsx` - Gerenciamento de membros
- `src/pages/Search.tsx` - Pagina de busca
- `src/hooks/useCompany.ts` - Hook para dados da empresa
- `src/hooks/useCompanyMembers.ts` - Hook para membros
- `src/hooks/useSearch.ts` - Hook de busca unificada
- `src/hooks/useMentions.ts` - Hook para mencoes
- `src/components/MentionSuggestions.tsx` - Dropdown de sugestoes de mencao
- `src/components/MentionText.tsx` - Renderizacao de texto com mencoes

### Arquivos existentes a modificar:
- `src/App.tsx` - Novas rotas
- `src/pages/Profile.tsx` - Menu item para empresa
- `src/pages/profile/PersonalData.tsx` - Campo empresa com busca
- `src/components/post/CommentInput.tsx` - Suporte a mencoes
- `src/components/editor/RichTextEditor.tsx` - Extensao de mencoes Tiptap
- `src/components/BottomNav.tsx` - Icone de busca (avaliar)
- `src/components/post/PostContent.tsx` - Renderizar mencoes
- `src/components/post/CommentItem.tsx` - Renderizar mencoes nos comentarios

### Migracoes de banco:
- Criar tabelas `companies`, `company_members`, `mentions`
- Adicionar coluna `account_type` em `profiles`
- Criar politicas RLS para todas as novas tabelas
- Criar storage bucket `company-logos` (ou reutilizar `avatars`)

---

## Ordem de Execucao

1. **Migracoes de banco** (tabelas + RLS + coluna profiles)
2. **Cadastro de empresa** (formulario + hook + rota)
3. **Perfil publico da empresa** (pagina + rota)
4. **Vinculo usuario-empresa** (solicitacao + aprovacao + notificacoes)
5. **Busca unificada** (pagina + hook + rota)
6. **Sistema de mencoes** (componentes + integracao nos editores + notificacoes)
7. **Testes e ajustes** finais

---

## Consideracoes Tecnicas

- Todas as consultas usam o cliente Supabase existente (`@/integrations/supabase/client`)
- RLS protege todos os dados sensiveis
- O sistema de mencoes usa regex para detectar `@` e extrair nomes
- A extensao `@tiptap/extension-mention` sera necessaria como nova dependencia
- Upload de logos reutiliza o bucket `avatars` existente
- Slug de empresas gerado automaticamente via trigger existente `generate_slug`
- Mobile-first em todas as novas paginas, seguindo o design system existente

