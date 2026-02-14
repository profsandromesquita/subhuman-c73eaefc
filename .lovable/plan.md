

# Proteger botao do workshop com autenticacao obrigatoria

## Problema identificado

Na **Landing Page** (`LandingEvents.tsx`), o botao "Garantir minha vaga" do workshop e um link direto (`<a href>`) para o checkout da Ticto, **sem verificar se o usuario esta logado** e **sem anexar email/user_id** na URL. Isso significa que:

1. Usuarios nao logados conseguem ir para o checkout sem identificacao
2. A compra nao sera associada ao usuario na plataforma (o webhook nao consegue encontrar o usuario)
3. Voce perde o rastreamento para disparos de mensagens e avisos

Na pagina de **Planos** (`Plans.tsx`), a logica ja esta correta com `handleEventPurchase` que verifica login e injeta dados.

## Alteracoes necessarias

### Arquivo: `src/components/landing/LandingEvents.tsx`

1. Importar `useAuth` e `useNavigate`
2. Substituir o `<a href>` direto por um `<button>` com handler que:
   - Verifica se o usuario esta logado
   - Se **nao logado**: redireciona para `/login` (com state para retornar)
   - Se **logado**: monta a URL com `email`, `src` (user_id) e `redirect_url`, e redireciona

**Codigo atual (linha 125-132):**
```tsx
<Button asChild variant="glow" size="lg" className="w-full">
  {nextEvent.checkout_url ? (
    <a href={nextEvent.checkout_url} target="_blank" rel="noopener noreferrer">
      Garantir minha vaga
    </a>
  ) : (
    <Link to="/plans">Garantir minha vaga</Link>
  )}
</Button>
```

**Codigo novo:**
```tsx
<Button 
  variant="glow" 
  size="lg" 
  className="w-full"
  onClick={() => handleEventClick(nextEvent.checkout_url)}
>
  Garantir minha vaga
</Button>
```

Onde `handleEventClick` sera:
```tsx
const handleEventClick = (checkoutUrl?: string | null) => {
  if (!checkoutUrl) {
    navigate('/plans');
    return;
  }
  if (!user) {
    navigate('/login', { state: { from: '/' } });
    return;
  }
  const url = new URL(checkoutUrl);
  if (user.email) url.searchParams.set('email', user.email);
  if (user.id) url.searchParams.set('src', user.id);
  url.searchParams.set('redirect_url', `${window.location.origin}/payment-success`);
  window.location.href = url.toString();
};
```

### Arquivo: `src/pages/Plans.tsx`

Nenhuma alteracao necessaria -- `handleEventPurchase` ja faz a verificacao de login e injeta os dados corretamente.

## Resumo

| Arquivo | Alteracao |
|---|---|
| `LandingEvents.tsx` | Substituir link direto por handler com verificacao de login + injeccao de dados |
| `Plans.tsx` | Nenhuma (ja correto) |
| Webhook | Nenhuma (ja correto) |
