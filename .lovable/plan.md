

# Corrigir Logo nos Emails e Investigar Falha no Envio de Recuperacao

## Problemas Identificados

### 1. Logo quebrada nos emails (imagem com "?")
O logo usado nos templates de email e um arquivo **SVG** (`logo-subhumano.svg`). A maioria dos clientes de email (Gmail, Outlook, Apple Mail) **nao suporta SVG**. Por isso, a imagem aparece quebrada com o icone de interrogacao, como mostrado no screenshot.

**Solucao**: Converter o logo SVG para **PNG**, fazer upload no bucket `email-assets`, e atualizar todos os 6 templates de email para usar o arquivo PNG.

### 2. Email de recuperacao nao enviado pelo fluxo do usuario
Os logs de autenticacao mostram que a ultima tentativa de recuperacao retornou **HTTP 429 (rate limit exceeded)**. Isso significa que o sistema de autenticacao bloqueou o envio por excesso de tentativas consecutivas (provavelmente causado pelos testes anteriores no painel Cloud).

Quando o rate limit e atingido, o email simplesmente nao e enviado - e o hook `auth-email-hook` nunca chega a ser chamado. Isso explica por que o teste pelo painel Cloud funcionou (usa um caminho diferente - o endpoint `/preview`) mas o fluxo real do usuario nao.

**Solucao**: Alem de esperar o rate limit expirar, o codigo da pagina `/forgot-password` precisa tratar melhor o erro 429, informando o usuario de forma clara. Atualmente o tratamento existe mas depende do texto da mensagem de erro conter "rate limit" ou "429" - vou verificar e garantir que cobre todos os casos.

## Alteracoes

### 1. Converter logo SVG para PNG e fazer upload
- O projeto tem o logo em `src/assets/logo-subhumano.svg`
- Criar uma versao PNG do logo (usando o proprio SVG como base)
- Fazer upload do PNG para o bucket `email-assets` usando a ferramenta de storage
- Manter o SVG existente como fallback no atributo `alt`

### 2. Atualizar todos os 6 templates de email
Alterar a URL da imagem em todos os templates de:
```
.../email-assets/logo-subhumano.svg?v=1
```
Para:
```
.../email-assets/logo-subhumano.png?v=1
```

Arquivos afetados:
- `supabase/functions/_shared/email-templates/signup.tsx`
- `supabase/functions/_shared/email-templates/recovery.tsx`
- `supabase/functions/_shared/email-templates/magic-link.tsx`
- `supabase/functions/_shared/email-templates/invite.tsx`
- `supabase/functions/_shared/email-templates/email-change.tsx`
- `supabase/functions/_shared/email-templates/reauthentication.tsx`

### 3. Melhorar tratamento de erro na pagina ForgotPassword
Garantir que o erro 429 / rate limit seja detectado de forma robusta, cobrindo variantes da mensagem de erro que o Supabase pode retornar (ex: "over_email_send_rate_limit", "rate limit", "429").

### 4. Redeploy da edge function auth-email-hook
Apos as alteracoes nos templates, fazer deploy da edge function para que as mudancas entrem em vigor.

## Sobre o rate limit
O rate limit do Supabase Auth geralmente expira apos alguns minutos. Depois das correcoes, sera necessario aguardar o tempo de cooldown e testar novamente o fluxo completo.

