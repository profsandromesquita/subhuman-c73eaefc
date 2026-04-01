

# Plano: Atualizar DEFAULT_IMAGE no og-meta e index.html

## Arquivo 1: `supabase/functions/og-meta/index.ts`

### Edição — linha 11

**Antes:**
```typescript
const DEFAULT_IMAGE = 'https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/logo-subhumano.png?v=1';
```

**Depois:**
```typescript
const DEFAULT_IMAGE = 'https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/ecossistema-subhumano-inteligencia-artificial-prof-sandro-mesquita.webp';
```

## Arquivo 2: `index.html`

### Edição A — og:image (linha 18)

**Antes:**
```html
<meta property="og:image" content="https://subhumano.ia.br/og-default.png" />
```

**Depois:**
```html
<meta property="og:image" content="https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/ecossistema-subhumano-inteligencia-artificial-prof-sandro-mesquita.webp" />
```

### Edição B — twitter:image (linha 22)

**Antes:**
```html
<meta name="twitter:image" content="https://subhumano.ia.br/og-default.png" />
```

**Depois:**
```html
<meta name="twitter:image" content="https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/ecossistema-subhumano-inteligencia-artificial-prof-sandro-mesquita.webp" />
```

## Não alterado
- Nenhum outro arquivo ou linha

