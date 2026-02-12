
# Correcao: Contador de Tentativas Restantes no Login

## Problema

Quando o usuario erra a senha, a mensagem exibida e apenas "Email ou senha incorretos" (para tentativas 1 e 2). O bloqueio acontece na tentativa 3 sem aviso previo, causando surpresa e ma experiencia.

## Solucao

Alterar a mensagem de erro nas tentativas 1 e 2 para incluir quantas tentativas restam antes do bloqueio.

**Arquivo**: `src/pages/Login.tsx`

**Mudanca**: No bloco `else` (linha 139-141), substituir a mensagem generica por uma que inclua o contador:

```text
// ANTES:
toast.error("Email ou senha incorretos");

// DEPOIS:
const remaining = 3 - attempts;
toast.error(`Email ou senha incorretos. ${remaining === 1 ? "Mais 1 tentativa antes do bloqueio." : `Mais ${remaining} tentativas antes do bloqueio.`}`);
```

Mensagens resultantes:
- Tentativa 1: "Email ou senha incorretos. Mais 2 tentativas antes do bloqueio."
- Tentativa 2: "Email ou senha incorretos. Mais 1 tentativa antes do bloqueio."
- Tentativa 3+: "Credenciais incorretas. Conta bloqueada por 30s." (ja existe)

Nenhum outro arquivo sera modificado.
