

# Plano: Links do Chat com Navegacao Interna + Persistencia de Conversa

## Problema 1: Links do chat bloqueiam acesso

### Causa raiz
O componente `ReactMarkdown` no `AIAssistant.tsx` nao tem um renderer customizado para links (`<a>`). Quando a IA responde com `[Networking](/channels/abc123)`, o Markdown gera um `<a href="/channels/abc123">` padrao do navegador. Ao clicar, ocorre um **reload completo da pagina** em vez de navegacao via React Router. Durante o reload:

1. O Supabase client reinicializa do zero
2. `useAuth` retorna `user = null` por ~500ms enquanto restaura a sessao
3. `useChannelAccess` executa com `userId = undefined`
4. O hook conclui que o usuario nao tem acesso e mostra "ambiente exclusivo"
5. Quando o auth finalmente carrega, o componente ja renderizou a tela de bloqueio

### Correcao
No `AIAssistant.tsx`, adicionar um renderer customizado para o elemento `a` dentro do `ReactMarkdown`. Links internos (que comecam com `/`) usarao `navigate()` do React Router em vez de `<a href>`, mantendo a sessao intacta.

```
Arquivo: src/pages/AIAssistant.tsx

Dentro de ReactMarkdown components, adicionar:
a: ({ href, children }) => {
  // Links internos: usar React Router
  if (href?.startsWith('/')) {
    return <button onClick={() => navigate(href)} className="underline text-blue-400 hover:text-blue-300">{children}</button>
  }
  // Links externos: abrir em nova aba
  return <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-blue-400">{children}</a>
}
```

Isso resolve o problema porque a navegacao interna mantem o React tree montado, o AuthContext nunca perde o `user`, e o `useChannelAccess` recebe o `userId` correto desde o primeiro render.

---

## Problema 2: Chat perde historico ao sair da pagina

### Causa raiz
O hook `useAIAssistant` usa `useState` para armazenar mensagens. Qualquer navegacao (incluindo clicar num link do chat) desmonta o componente e perde tudo.

### Correcao
Persistir as mensagens no `localStorage` e adicionar confirmacao antes de limpar.

#### Mudancas no hook `useAIAssistant.ts`:

1. **Inicializar mensagens do localStorage**:
   - Ao montar, ler `subhumano_chat_history` do localStorage
   - Se existir, carregar as mensagens salvas

2. **Salvar a cada nova mensagem**:
   - Apos cada mensagem (user ou assistant completa), salvar no localStorage
   - Usar `useEffect` que observa `messages` e persiste quando muda

3. **Limpar com confirmacao**:
   - `clearMessages` passa a retornar sem fazer nada sozinho
   - Criar novo estado `showClearConfirm` para controlar o dialog
   - Expor `requestClearMessages` e `confirmClearMessages` no retorno do hook

#### Mudancas na pagina `AIAssistant.tsx`:

1. **Dialog de confirmacao**:
   - Ao clicar no icone de lixeira, abrir um `AlertDialog`
   - Mensagem: "Deseja iniciar uma nova conversa? O historico atual sera apagado e nao podera ser recuperado."
   - Botoes: "Cancelar" e "Nova conversa"
   - Ao confirmar: limpa mensagens do state e do localStorage

2. **Comportamento na montagem**:
   - Se existirem mensagens salvas, o chat ja abre com a conversa anterior
   - Auto-scroll para o final das mensagens carregadas

---

## Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/AIAssistant.tsx` | Adicionar renderer de link com `navigate()`, importar `useNavigate`, adicionar `AlertDialog` de confirmacao no botao de limpar |
| `src/hooks/useAIAssistant.ts` | Persistir mensagens no `localStorage`, expor funcoes de confirmacao de limpeza |

---

## Detalhes tecnicos

### localStorage key e estrutura
```
Key: "subhumano_chat_history"
Value: JSON.stringify(messages)  // Array de { role, content }
```

### Limite de seguranca
- Limitar a 100 mensagens no localStorage (truncar as mais antigas)
- Envolver operacoes de localStorage em try/catch para navegadores com storage desabilitado

### Fluxo do AlertDialog
```
Usuario clica lixeira
  -> Abre AlertDialog
  -> "Cancelar": fecha dialog
  -> "Nova conversa": 
     -> setMessages([])
     -> localStorage.removeItem("subhumano_chat_history")
     -> fecha dialog
     -> toast "Nova conversa iniciada"
```

### Fluxo de links internos
```
IA responde com [Networking](/channels/abc123)
  -> ReactMarkdown renderiza botao estilizado como link
  -> Click aciona navigate("/channels/abc123")
  -> React Router navega sem reload
  -> Auth permanece intacta
  -> useChannelAccess recebe userId correto
  -> Acesso concedido normalmente
```

---

## Resultado esperado

1. Links do chat navegam internamente sem perder sessao - acesso ao canal funciona
2. Conversa persiste ao sair e voltar ao chat
3. Botao de lixeira pede confirmacao antes de limpar
4. Links externos abrem em nova aba
