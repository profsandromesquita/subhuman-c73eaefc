

# Reset de Senha para Contas de Teste

## Situacao

As 3 contas existem no banco:

| Email | ID |
|-------|-----|
| roboticmente@gmail.com | 1a0c2ffe-... |
| subhumano.ia@gmail.com | 9bbfe6c7-... |
| contato@arduinoceara.cc | 3a290b90-... |

Senhas sao armazenadas como hashes criptograficos (bcrypt) e nao podem ser lidas. Precisamos usar a API administrativa do backend para redefinir.

## Plano

### 1. Criar uma funcao backend temporaria `admin-reset-password`

Essa funcao usara a chave administrativa (service role) para chamar `auth.admin.updateUserById()` e definir a nova senha para cada conta.

Apos o uso, a funcao pode ser removida por seguranca.

### 2. Executar o reset das 3 contas

Chamar a funcao passando os IDs e a senha padrao `K@nn1056c`.

### 3. Correcao do email de recuperacao de senha

Investigar e configurar as redirect URLs permitidas na autenticacao do backend para garantir que o fluxo de recuperacao funcione no futuro.

## Detalhes tecnicos

```
Edge Function: admin-reset-password
- Recebe: lista de user IDs + nova senha
- Valida: que o chamador e admin (via JWT)
- Executa: supabase.auth.admin.updateUserById(id, { password })
- Retorna: resultado de cada operacao
```

Apos confirmar que as senhas foram redefinidas, a funcao sera removida do projeto.

