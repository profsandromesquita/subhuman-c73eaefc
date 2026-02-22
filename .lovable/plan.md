

# Próximos Passos: Criar Templates e Deploy

## Status Atual

O domínio `subhumano.ia.br` está em "Setting up" (verificação DNS em andamento). Isso é normal e pode levar de minutos a 48 horas. Enquanto isso, podemos avançar com os passos 2, 3 e 4 do plano original.

## O que será feito agora

### Passo 1: Criar os 6 templates de e-mail de autenticação

Usar a ferramenta `scaffold_auth_email_templates` para gerar automaticamente:
- Confirmacao de cadastro (signup)
- Link magico (magic-link)
- **Recuperacao de senha (recovery)** -- o template principal
- Convite (invite)
- Alteracao de e-mail (email-change)
- Reautenticacao (reauthentication)

### Passo 2: Aplicar identidade visual do Subhumano

Personalizar cada template com:
- Fundo do body do e-mail branco (#ffffff) -- obrigatorio para compatibilidade com clientes de e-mail
- Botoes escuros (bg preto, texto branco) seguindo a identidade do projeto
- Logo do Subhumano (upload do arquivo `src/assets/logo-subhumano.svg` para bucket de storage)
- Todos os textos em portugues brasileiro, tom informal/profissional
- Terminologia consistente com a plataforma ("Subhumano", "Redefinir senha", etc.)

### Passo 3: Deploy da edge function `auth-email-hook`

Publicar a edge function que processara todos os e-mails de autenticacao.

### Passo 4: Confirmar ativacao

Os e-mails customizados serao ativados automaticamente assim que a verificacao DNS for concluida. Ate la, os e-mails padrao continuam sendo enviados. Voce podera acompanhar o progresso em Cloud > Email.

## Importante

- Nenhuma alteracao em arquivos `.tsx` ou hooks do frontend
- A verificacao DNS continuara em background -- nao precisa fazer nada
- Assim que o DNS for verificado, os e-mails passarao a sair de `noreply@subhumano.ia.br` automaticamente

