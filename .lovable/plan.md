

# Fallback para links absolutos da plataforma no `markdownComponents.a`

## Arquivo: `src/pages/AIAssistant.tsx` (linhas 123-138)

Adicionar, antes do `if (href?.startsWith('/'))`, uma verificação que detecta URLs absolutas de domínios da plataforma, extrai o pathname e usa `navigate()`.

```tsx
a: ({ href, children }: any) => {
  // Fallback: converter URLs absolutas da plataforma em paths relativos
  const platformPattern = /^https?:\/\/(www\.)?(subhumano\.com|subhumano\.ia\.br)(\/.*)?$/i;
  const match = href?.match(platformPattern);
  const resolvedHref = match ? (match[3] || '/') : href;

  if (resolvedHref?.startsWith('/')) {
    return (
      <button onClick={e => { e.preventDefault(); navigate(resolvedHref); }}
        className="underline text-primary hover:text-primary/80 cursor-pointer">
        {children}
      </button>
    );
  }
  return (
    <a href={resolvedHref} target="_blank" rel="noopener noreferrer"
      className="underline text-primary hover:text-primary/80">
      {children}
    </a>
  );
}
```

Nenhum outro arquivo ou componente é alterado.

