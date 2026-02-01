
# Plano de Correção Definitiva do Favicon

## Diagnóstico

Após investigação detalhada, identifiquei que:

1. O favicon atualmente servido em `subhumano.ia.br` mostra um ícone "H" (letra estilizada) em fundo claro
2. Este NÃO corresponde ao arquivo que você enviou agora
3. O arquivo correto foi anexado nesta mensagem: `logo-subumano-ia-br-transparente-2.ico`

## Ações a Executar

### Passo 1: Substituir o arquivo favicon.ico

Copiar o arquivo enviado NESTA mensagem para o projeto:

```
user-uploads://logo-subumano-ia-br-transparente-2.ico → public/favicon.ico
```

### Passo 2: Incrementar versão de cache busting

Atualizar o parâmetro de versão no `index.html` de `?v=4` para `?v=5`:

```html
<!-- ANTES -->
<link rel="icon" type="image/x-icon" href="/favicon.ico?v=4" />

<!-- DEPOIS -->
<link rel="icon" type="image/x-icon" href="/favicon.ico?v=5" />
```

## Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `public/favicon.ico` | Substituir pelo novo arquivo da mensagem atual |
| `index.html` | Atualizar `?v=4` para `?v=5` |

## Verificação Pós-Implementação

Após aprovar e publicar:

1. Acessar `https://subhumano.ia.br/favicon.ico?v=5` diretamente no navegador e verificar se a imagem correta aparece
2. Fazer hard refresh (Ctrl+Shift+R) no site
3. Testar em uma aba anônima para evitar cache

## Seção Técnica

A diferença entre os arquivos anteriores e o atual é que desta vez o arquivo correto (`logo-subumano-ia-br-transparente-2.ico`) será utilizado. O cache busting com versão incrementada força todos os navegadores a baixarem o arquivo novo, ignorando qualquer versão cacheada anteriormente.
