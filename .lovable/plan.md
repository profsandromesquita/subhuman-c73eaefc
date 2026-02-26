

# Pagina de Termos de Uso

## Resumo

Criar a pagina `/termos` com os Termos de Uso do Subhumano, seguindo exatamente o padrao de layout das paginas publicas (header sticky com botao voltar + logo, conteudo em accordion, LandingFooter). Tambem atualizar o link "Termos de Uso" no footer da landing page.

## Alteracoes

### 1. Criar `src/pages/TermsOfUse.tsx`

Pagina publica seguindo o padrao da PrivacyPolicy com:

- Header sticky com ArrowLeft + Logo (identico ao padrao)
- Titulo: "Termos de Uso"
- Subtitulo com data de atualizacao
- Paragrafos introdutorios
- Accordion com secoes:
  1. Aceitacao dos Termos
  2. Descricao do Servico
  3. Cadastro e Conta do Usuario
  4. Assinatura e Pagamentos
  5. Propriedade Intelectual
  6. Regras de Conduta na Comunidade (Canais)
  7. Uso do Assistente de IA
  8. Limitacao de Responsabilidade
  9. Cancelamento e Encerramento
  10. Alteracoes nos Termos
  11. Foro e Legislacao Aplicavel
  12. Contato
- LandingFooter no rodape

### 2. Adicionar rota em `src/App.tsx`

Rota publica: `/termos` com lazy loading.

### 3. Atualizar `src/components/landing/LandingFooter.tsx`

Trocar o link "Termos de Uso" de `<a href="#">` para `<Link to="/termos">`.

## Detalhes tecnicos

| Arquivo | Alteracao |
|---|---|
| `src/pages/TermsOfUse.tsx` | Novo arquivo seguindo padrao PrivacyPolicy (header sticky, accordion, footer) |
| `src/App.tsx` | Adicionar `const TermsOfUse = lazy(...)` e `<Route path="/termos">` |
| `src/components/landing/LandingFooter.tsx` | Link "Termos de Uso" apontar para `/termos` |

O conteudo dos termos referencia o ITIA como responsavel, menciona a Ticto como gateway de pagamento, e inclui regras especificas para os canais da comunidade e o assistente de IA, coerentes com as funcionalidades existentes da plataforma.

