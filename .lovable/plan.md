

# Plano: Substituição do Favicon pela Imagem Correta

## Resumo

Você enviou o arquivo correto agora: `logo-subumano-ia-br-transparente.ico`. Vamos substituir o favicon atual por este novo arquivo.

## Ações a Executar

### Passo 1: Substituir o arquivo favicon.ico

Copiar o novo arquivo enviado para o projeto:

```
user-uploads://logo-subumano-ia-br-transparente.ico → public/favicon.ico
```

### Passo 2: Atualizar versão do cache busting

Incrementar o parâmetro de versão no `index.html` para forçar os navegadores a baixar o novo favicon:

```html
<!-- ANTES -->
<link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />

<!-- DEPOIS -->
<link rel="icon" type="image/x-icon" href="/favicon.ico?v=3" />
```

## Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `public/favicon.ico` | Substituir pelo novo arquivo |
| `index.html` | Atualizar `?v=2` para `?v=3` |

## Pós-Implementação

Após publicar:
1. **Ctrl+Shift+R** para forçar reload sem cache
2. Ou abrir em **aba anônima** para verificar

