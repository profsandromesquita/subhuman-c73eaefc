

# Politica de Privacidade -- Pagina Publica

## Resumo

Criar uma pagina publica `/privacidade` com a Politica de Privacidade completa do Subhumano, em conformidade com a LGPD, e atualizar os links existentes no footer da landing page. A pagina sera estatica (sem necessidade de banco de dados), com design consistente com o restante do site.

---

## Dados Coletados pela Plataforma (Baseado na Analise do Banco)

Com base na tabela `profiles` e no fluxo de autenticacao, os dados coletados sao:

- **Cadastro/Autenticacao**: Nome completo, e-mail, senha (hash), avatar, autenticacao via Google OAuth
- **Perfil Pessoal**: Cidade, estado, ocupacao, empresa, cargo, industria, formacao, habilidades, hobbies, bio, nivel de experiencia com IA, objetivos
- **Perfil Empresarial**: CNPJ, website, redes sociais (Instagram, LinkedIn)
- **Preferencias de Notificacao**: Configuracoes de notificacao por tipo (espacos, comentarios, mencoes, anuncios, email diario)
- **Assinatura/Pagamento**: Dados de pagamento processados via Ticto (gateway externo)
- **Uso da Plataforma**: Queries ao assistente IA, posts e comentarios nos canais, conteudos salvos

---

## Plano de Implementacao

### Passo 1 -- Criar pagina `src/pages/PrivacyPolicy.tsx`

Pagina publica com conteudo completo da politica, organizado em secoes com acordeao (Accordion) para facilitar a leitura:

1. **Identificacao da Empresa**: ITIA - Instituto de Tecnologia e Inteligencia Artificial, CNPJ 58.246.571/0001-90, contato Prof. Msc. Sandro Mesquita
2. **Dados Coletados**: Lista detalhada baseada na analise acima
3. **Finalidade do Uso**: Personalizacao, comunicacao, marketing (com consentimento), analise, obrigacoes legais
4. **Compartilhamento**: ITIA como empresa responsavel, processadores de pagamento (Ticto), plataformas de publicidade (Meta) para fins de remarketing
5. **Seguranca**: Criptografia, RLS, autenticacao JWT, acesso restrito
6. **Direitos dos Usuarios (LGPD)**: Acesso, correcao, exclusao, portabilidade, revogacao de consentimento
7. **Cookies e Tecnologias**: Cookies de sessao, analytics, publicidade, como gerencia-los
8. **Retencao de Dados**: Enquanto a conta estiver ativa + 5 anos apos inatividade (obrigacoes legais)
9. **Contato**: sandro.mesquita@itia.org.br, telefone 85 98818-2453

**Design**: Fundo preto, texto branco/cinza, secoes com Accordion colapsavel, botao de voltar no topo. Sem bottom navigation (pagina publica).

### Passo 2 -- Adicionar rota no `App.tsx`

Adicionar rota publica `/privacidade` apontando para o componente `PrivacyPolicy` (lazy loaded).

### Passo 3 -- Atualizar links no `LandingFooter.tsx`

Alterar o link "Politica de Privacidade" de `href="#"` para `href="/privacidade"` (usando `Link` do react-router-dom para navegacao SPA).

---

## Arquivos Criados/Alterados

| # | Arquivo | Acao |
|---|---|---|
| 1 | `src/pages/PrivacyPolicy.tsx` | Nova pagina com conteudo completo |
| 2 | `src/App.tsx` | Adicionar rota publica `/privacidade` |
| 3 | `src/components/landing/LandingFooter.tsx` | Atualizar link para `/privacidade` |

## URL Final para Meta Ads

A URL a ser informada no campo de Politica de Privacidade da Meta sera:

```
https://subhuman.lovable.app/privacidade
```

Ou, se o dominio customizado estiver configurado:

```
https://subhumano.ia.br/privacidade
```

