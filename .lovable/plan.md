

# Plano de Correção: E-mails de Recuperação de Senha

## Diagnóstico

Os e-mails de recuperação de senha não estão chegando aos usuários porque o projeto usa o serviço SMTP padrão do backend de autenticação, que tem baixa taxa de entrega e limites severos. O domínio `subhumano.ia.br` existe como domínio customizado do projeto, mas **não está configurado como domínio de envio de e-mail**.

O código frontend está correto -- a API aceita a requisição sem erro, mas o e-mail não é entregue na ponta.

## Solução

Configurar o domínio `subhumano.ia.br` como remetente de e-mails de autenticação e criar templates customizados. Isso resolve:

- Entrega confiável (infraestrutura de e-mail profissional)
- Reputação do remetente (DKIM/SPF do próprio domínio)
- E-mails saem de um endereço como `noreply@subhumano.ia.br` em vez de um domínio genérico

## Passos

### Passo 1: Configurar domínio de e-mail

Abrir o painel de configuração de e-mail para registrar `subhumano.ia.br` como domínio de envio. Isso requer adicionar registros DNS (DKIM, SPF) que o painel irá fornecer.

### Passo 2: Criar templates de e-mail de autenticação

Usar a ferramenta `scaffold_auth_email_templates` para gerar os 6 templates padrão de e-mail:
- Confirmação de cadastro (signup)
- Link mágico (magic-link)
- **Recuperação de senha (recovery)** -- o template que resolve o problema reportado
- Convite (invite)
- Alteração de e-mail (email-change)
- Reautenticação (reauthentication)

### Passo 3: Aplicar identidade visual do Subhumano

Após a criação dos templates, personalizar com:
- Cores do projeto (fundo branco no body do e-mail, botões escuros)
- Logo do Subhumano (upload para bucket de assets)
- Textos em português brasileiro, tom informal/profissional
- Linguagem consistente com a plataforma

### Passo 4: Deploy da edge function

Publicar a edge function `auth-email-hook` que processará os e-mails.

### Passo 5: Aguardar verificação DNS

Após configurar os registros DNS, a verificação pode levar de minutos a 48 horas. Até lá, os e-mails padrão continuam sendo enviados normalmente.

## Resultado esperado

- E-mails de recuperação de senha passam a ser entregues de forma confiável
- Remetente: `noreply@subhumano.ia.br` (ou similar)
- Todos os e-mails de autenticação (cadastro, verificação, recuperação) se beneficiam da mesma infraestrutura
- Sem alteração no código frontend -- a mudança é toda na infraestrutura de envio

## Importante

- A primeira etapa (configuração do domínio) requer interação manual para copiar registros DNS no provedor do domínio
- Não há alteração em nenhum arquivo `.tsx` ou hook -- o problema não é de código

