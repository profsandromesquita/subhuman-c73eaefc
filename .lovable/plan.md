

# Adicionar Meta Pixel em todas as paginas

## O que sera feito

Inserir o codigo do Meta Pixel (Facebook Pixel) no arquivo `index.html`, dentro da tag `<head>`. Como o Subhumano e uma Single Page Application (SPA) em React, o `index.html` e o ponto de entrada unico -- qualquer codigo inserido nele ja estara presente em **todas as paginas** automaticamente.

## Alteracao

**Arquivo:** `index.html`

Adicionar o bloco do Meta Pixel logo antes do fechamento da tag `</head>`, apos os estilos existentes:

```html
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
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=1384240548663705&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->
```

## Detalhes tecnicos

- Nenhum outro arquivo precisa ser alterado
- O `fbq('track', 'PageView')` sera disparado no carregamento inicial; para rastrear navegacoes internas da SPA, a Meta recomenda usar o evento padrao que ja funciona com o script base
- Nenhuma dependencia adicional necessaria

