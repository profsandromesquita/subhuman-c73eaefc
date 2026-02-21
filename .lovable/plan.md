

# Correcao do React Error #310 no AuthorModal

## Problema

No arquivo `src/components/post/AuthorModal.tsx`, linha 51, existe um `return null` condicional **antes** da chamada do hook `useUserBadge` na linha 54. O React exige que todos os hooks sejam chamados na mesma ordem em toda renderizacao -- retornar antes de um hook quebra essa regra.

```text
Linha 44: export function AuthorModal(...) {
Linha 45:   const { user } = useAuth();          // hook 1
Linha 46:   const { data: profile } = useProfile(); // hook 2
Linha 47-50: useState...                          // hooks 3-5
Linha 51:   if (!author) return null;              // <-- RETURN ANTES DO HOOK
Linha 54:   const badgeType = useUserBadge(author.id); // hook 6 -- NAO EXECUTADO!
```

## Solucao

Mover o `useUserBadge` para **antes** do `return null`, passando `author?.id` (que pode ser `undefined` quando author e null -- o hook ja trata isso com `enabled: !!userId`).

### Arquivo alterado

**`src/components/post/AuthorModal.tsx`**

Antes:
```tsx
const { user } = useAuth();
const { data: profile } = useProfile();
const [showMessageForm, setShowMessageForm] = useState(false);
const [messageText, setMessageText] = useState("");
const [sending, setSending] = useState(false);

if (!author) return null;

const hasSocialLinks = ...;
const badgeType = useUserBadge(author.id);
```

Depois:
```tsx
const { user } = useAuth();
const { data: profile } = useProfile();
const badgeType = useUserBadge(author?.id);  // movido para antes do return
const [showMessageForm, setShowMessageForm] = useState(false);
const [messageText, setMessageText] = useState("");
const [sending, setSending] = useState(false);

if (!author) return null;

const hasSocialLinks = ...;
// useUserBadge removido daqui
```

Apenas 2 linhas mudam. Nenhum outro arquivo precisa ser alterado.
