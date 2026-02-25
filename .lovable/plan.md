

# Preparar Subhumano para Google Play Store via TWA

## Objetivo

Tornar o Subhumano publicavel na Google Play Store usando **Trusted Web Activity (TWA)**, que empacota o PWA existente em um app Android nativo. Para isso, o PWA precisa atender aos criterios de qualidade exigidos pelo Google.

## O que sera feito

### 1. Corrigir o Manifest (`public/manifest.json`)

Adicionar campos obrigatorios e recomendados que estao ausentes:

- `id`: Identificador unico do app (`/`)
- `scope`: Escopo de navegacao (`/`)
- `lang`: Idioma (`pt-BR`)
- `dir`: Direcao do texto (`ltr`)
- `categories`: Categorias do app (`["education", "news", "productivity"]`)
- `shortcuts`: Atalhos rapidos para Espacos, Canais e Podcasts
- `screenshots`: Array vazio preparado para adicionar screenshots futuramente (campo recomendado pelo Google para listagem na Play Store)
- Separar icones: um com `purpose: "any"` e outro com `purpose: "maskable"` (atualmente estao combinados em um unico, o que pode causar icones cortados)

### 2. Adicionar Cache Offline ao Service Worker (`public/sw.js`)

O SW atual so lida com push notifications. Para TWA de qualidade, e necessario:

- **Cache de shell do app**: Cachear os arquivos estaticos essenciais (HTML, CSS, JS) durante a instalacao
- **Estrategia network-first com fallback**: Tentar buscar da rede primeiro; se offline, servir do cache
- **Pagina offline**: Criar uma pagina simples de fallback quando nao ha conexao e o recurso nao esta em cache
- Manter toda a logica de push notifications existente intacta

### 3. Criar Pagina Offline (`public/offline.html`)

Pagina estatica simples exibida quando o usuario esta sem internet e o conteudo nao esta em cache. Seguira o design system do Subhumano (fundo preto, texto branco, icone sutil) com mensagem como "Voce esta sem conexao. Reconecte-se para continuar."

### 4. Adicionar meta tag para tema no manifest

Garantir que `theme_color` no manifest e na meta tag do `index.html` estejam consistentes (ambos `#000000` -- ja estao corretos).

## Arquivos alterados

| Arquivo | Alteracao |
|---|---|
| `public/manifest.json` | Campos adicionais + icones separados |
| `public/sw.js` | Cache offline + estrategia network-first |
| `public/offline.html` | Nova pagina de fallback offline |

## O que NAO sera feito aqui (etapas manuais do desenvolvedor)

Apos aprovar e publicar estas alteracoes, voce precisara:

1. **Criar conta de desenvolvedor Google Play** (taxa unica de US$ 25)
2. **Gerar o pacote TWA** usando a ferramenta [Bubblewrap](https://github.com/nicedayfor/nicedayfor-nicedayfor) do Google ou o site [PWABuilder.com](https://pwabuilder.com) (mais simples, interface visual)
3. **Preencher o questionario de classificacao de conteudo** no Google Play Console
4. **Fornecer screenshots** para a listagem na Play Store
5. **Enviar para revisao** no Google Play Console

## Detalhes tecnicos

### Estrategia de cache no Service Worker

```text
Instalacao (install)
  |
  v
Cachear shell do app (index.html, CSS, JS, icones)
  |
  v
Requisicao do usuario (fetch)
  |
  +-- Requisicao de navegacao? --> Network first, fallback para cache, fallback para offline.html
  |
  +-- Asset estatico? --> Cache first, fallback para network
  |
  +-- API (supabase)? --> Network only (sem cache)
```

### Separacao de icones no manifest

```text
Atual (problematico):
  icon-192.png -> purpose: "any maskable"  (pode cortar o icone)

Corrigido:
  icon-192.png -> purpose: "any"
  icon-512.png -> purpose: "any"
  icon-192.png -> purpose: "maskable" (entrada separada)
  icon-512.png -> purpose: "maskable" (entrada separada)
```

Nota: O ideal seria ter imagens diferentes para "maskable" (com padding extra), mas usar as mesmas imagens ja resolve o problema imediato de validacao. Futuramente, icones maskable dedicados podem ser criados para melhor aparencia.

