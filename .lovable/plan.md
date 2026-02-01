

# Plano de Correção: Favicon do Subhumano

## Diagnóstico do Problema

Identifiquei **3 causas** que impedem o favicon de atualizar:

### Causa 1: Falta da tag `<link rel="icon">` no index.html

O arquivo `index.html` não possui nenhuma tag explícita para o favicon:

```html
<!-- ATUAL - Linha 23-25 -->
<!-- PWA -->
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icon-192.png" />
<!-- FALTA: <link rel="icon" href="/favicon.ico"> -->
```

Sem essa tag, o navegador depende do comportamento padrão de buscar `/favicon.ico` automaticamente, o que é menos confiável e mais suscetível a cache.

### Causa 2: Cache agressivo do navegador

Favicons são cacheados de forma extremamente agressiva pelos navegadores. Mesmo que o arquivo exista, o navegador pode estar mostrando a versão antiga por dias ou semanas.

### Causa 3: Ícones PWA não atualizados

O `manifest.json` referencia `icon-192.png` e `icon-512.png` que ainda são os ícones antigos. Se o usuário instalou como PWA, esses ícones serão usados.

---

## Solução Proposta

### Passo 1: Adicionar tag `<link rel="icon">` com cache busting

Modificar `index.html` para incluir referência explícita ao favicon com parâmetro de versão:

```html
<!-- Adicionar após linha 25 (apple-touch-icon) -->
<link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
```

O parâmetro `?v=2` força o navegador a tratar como um arquivo novo, ignorando o cache.

### Passo 2: Verificar o arquivo favicon.ico

Confirmar que o arquivo `public/favicon.ico` é realmente a nova logo do Subhumano (já foi copiado na mensagem anterior).

### Passo 3: (Opcional) Atualizar ícones PWA

Para consistência completa, os ícones do PWA (`icon-192.png` e `icon-512.png`) também devem ser atualizados para a logo do Subhumano. Isso requer que você forneça versões em PNG da logo nos tamanhos 192x192 e 512x512.

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `index.html` | Adicionar `<link rel="icon">` com cache busting |

## Arquivos a Atualizar (Opcional)

| Arquivo | Ação |
|---------|------|
| `public/icon-192.png` | Substituir pela logo Subhumano 192x192 |
| `public/icon-512.png` | Substituir pela logo Subhumano 512x512 |

---

## Instruções Pós-Implementação

Após aprovar e publicar:

1. **Limpar cache do navegador**: Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)
2. **Verificar em aba anônima**: Abrir o site em uma janela anônima para ver sem cache
3. **Aguardar propagação**: Em alguns casos, pode levar alguns minutos após o publish

---

## Detalhes Técnicos

A modificação no `index.html` será:

```html
<!-- Linha 23-26 - ANTES -->
<!-- PWA -->
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icon-192.png" />

<!-- Linha 23-27 - DEPOIS -->
<!-- PWA -->
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icon-192.png" />
<link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
```

