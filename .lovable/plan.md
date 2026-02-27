
# Atualizar start_url e description no manifest.json

## Situacao atual

- `start_url` esta como `"/"` (relativo, nao aponta para o dominio subhumano.ia.br)
- `description` esta como `"Atualizacoes segmentadas sobre Inteligencia Artificial"` (texto curto e generico)

## Alteracoes

Duas substituicoes simples no `public/manifest.json`, mantendo todo o resto intacto:

### 1. start_url (linha 6)
- **De:** `"/"`
- **Para:** `"https://subhumano.ia.br/"`

### 2. description (linha 5)
- **De:** `"Atualizacoes segmentadas sobre Inteligencia Artificial"`
- **Para:** `"Ecossistema focado em alta performance que integra Inteligencia Artificial e Engenharia de Software. O Subhumano IA fornece atualizacoes segmentadas, ferramentas de produtividade e metodologias avancadas para alavancar o desenvolvimento tecnologico de profissionais e empresas."`

## Risco

**Minimo.** Sao apenas dois valores de texto no JSON. Nenhum codigo da aplicacao e afetado.

## Observacao sobre scope

O campo `scope` (linha 7) permanece como `"/"`. Se no futuro o Google Play exigir consistencia com o dominio absoluto, basta atualizar para `"https://subhumano.ia.br/"` tambem. Por ora, nao faz parte do pedido e nao sera alterado.
