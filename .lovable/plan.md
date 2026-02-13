
# Correcao do modal de interacao para usuarios Freemium logados

## Problema

Na pagina `PostDetail.tsx`, quando um usuario freemium (logado, mas sem assinatura) tenta curtir ou comentar, o sistema mostra o `AuthPromptDialog` com a mensagem "Entre para interagir / Criar conta / Ja tenho conta". Isso esta errado porque o usuario **ja esta logado**. O modal correto deveria ser um prompt de upgrade com:

- **Titulo**: "Desbloqueie este conteudo com seu Passe VIP"
- **Descricao**: "Leia artigos completos e tenha acesso a todo o conteudo."
- **Botao**: "Ver planos" (navega para `/plans`)

## Causa raiz

Linha 272 de `src/pages/PostDetail.tsx`:

```
onLikeToggle={canLike ? handleLikeToggle : () => setShowAuthPrompt(true)}
```

Quando `canLike` e `false`, independente de o usuario estar logado ou nao, mostra o `AuthPromptDialog`. Falta distinguir entre "nao logado" e "logado sem permissao".

## Plano de correcao

### Arquivo: `src/pages/PostDetail.tsx`

1. Adicionar um novo estado `showUpgradePrompt` (`useState(false)`)
2. Criar uma logica condicional nos handlers:
   - Se `!user` -> mostrar `AuthPromptDialog` (manter comportamento atual para visitantes)
   - Se `user` mas `!canLike` / `!canComment` -> mostrar um dialog de upgrade
3. Importar e usar o `SubscriptionModal` existente (ou criar um dialog inline simples) para o prompt de upgrade
4. Atualizar a linha 272 para:
   ```
   onLikeToggle={canLike ? handleLikeToggle : () => {
     if (!user) setShowAuthPrompt(true);
     else setShowUpgradePrompt(true);
   }}
   ```
5. Tambem corrigir `handleLikeToggle` (linha 55), `handleSaveToggle` (linha 71), `handleLikeComment` (linha 96), e `handleSubmitComment` (linha 136) para usar a mesma logica condicional
6. Adicionar o dialog de upgrade no JSX com o texto especificado pelo usuario:
   - Icone de cadeado
   - "Desbloqueie este conteudo com seu Passe VIP"
   - "Leia artigos completos e tenha acesso a todo o conteudo."
   - Botao "Ver planos" que navega para `/plans`

### Impacto

- 1 arquivo editado: `src/pages/PostDetail.tsx`
- Nenhuma alteracao de banco ou backend
- O `AuthPromptDialog` continua funcionando para visitantes nao logados
- Usuarios freemium logados verao o prompt correto de upgrade
