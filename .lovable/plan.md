

# Corrigir Meta Pixel -- Erro de Build

## Problema

O `<noscript>` contendo `<img>` dentro do `<head>` e proibido pela especificacao HTML. O parser do Vite (parse5) rejeita isso com o erro `disallowed-content-in-noscript-in-head`, fazendo o build falhar. Por isso o Pixel nunca chegou a producao.

## Solucao

**Arquivo:** `index.html`

1. **Manter o `<script>` do Pixel no `<head>`** -- isso funciona normalmente
2. **Mover o `<noscript>` para o `<body>`** -- logo apos a tag `<body>`, antes do `<div id="root">`

### Resultado no index.html

```html
<head>
  ...
  <!-- Meta Pixel Code -->
  <script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1384240548663705');
  fbq('track', 'PageView');
  </script>
  <!-- End Meta Pixel Code -->
</head>

<body class="dark">
  <noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=1384240548663705&ev=PageView&noscript=1"
  /></noscript>
  <div id="root">
    ...
  </div>
</body>
```

## Por que isso resolve

- O `<script>` no `<head>` e valido e carrega o Pixel normalmente (99,9% dos usuarios)
- O `<noscript>` com `<img>` so e permitido dentro do `<body>` pela especificacao HTML
- O build do Vite passara sem erros
- Apos publicar, o Meta Pixel Helper detectara o Pixel corretamente

## Apos implementar

Sera necessario clicar em **Publicar** para que a alteracao va para producao em subhumano.ia.br.

