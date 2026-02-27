
# Adicionar Screenshots ao manifest.json para Mini-Loja PWA

## Contexto

O arquivo correto e `public/manifest.json` -- ja possui um array `screenshots` vazio (linha 61). O plano e simples: copiar as 3 imagens para `public/` e preencher esse array.

## Risco

**Minimo.** Apenas adiciona imagens estaticas ao diretorio publico e preenche um campo JSON ja existente. Nenhum codigo da aplicacao e alterado.

## Tarefas

### 1. Copiar as 3 imagens para o diretorio publico

- `user-uploads://screenshot-01-login.png` -> `public/screenshot-01-login.png`
- `user-uploads://screenshot-02-home.png` -> `public/screenshot-02-home.png`
- `user-uploads://screenshot-03-ia.png` -> `public/screenshot-03-ia.png`

### 2. Atualizar `public/manifest.json`

Substituir o array `"screenshots": []` pelo seguinte:

```json
"screenshots": [
  {
    "src": "/screenshot-01-login.png",
    "sizes": "1080x1920",
    "type": "image/png",
    "form_factor": "narrow"
  },
  {
    "src": "/screenshot-02-home.png",
    "sizes": "1080x1920",
    "type": "image/png",
    "form_factor": "narrow"
  },
  {
    "src": "/screenshot-03-ia.png",
    "sizes": "1080x1920",
    "type": "image/png",
    "form_factor": "narrow"
  }
]
```

O `form_factor: "narrow"` indica telas de celular, que e exatamente o que o Chrome/Edge usa para exibir a mini-loja ao usuario antes da instalacao.

### Arquivos modificados

| Arquivo | Acao |
|---|---|
| `public/screenshot-01-login.png` | Criado (copia da imagem enviada) |
| `public/screenshot-02-home.png` | Criado (copia da imagem enviada) |
| `public/screenshot-03-ia.png` | Criado (copia da imagem enviada) |
| `public/manifest.json` | Atualizado (array screenshots preenchido) |

### Observacao sobre tamanho das imagens

O campo `sizes` sera definido como `1080x1920` conforme voce solicitou. Se as imagens reais tiverem dimensoes diferentes, o navegador ainda as exibira corretamente -- mas para precisao maxima, confirme se as capturas estao em 1080x1920. Caso contrario, posso ajustar os valores apos aprovacao.
