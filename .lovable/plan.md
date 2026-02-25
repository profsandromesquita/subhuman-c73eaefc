
# Pagina de Contato do Subhumano

## Resumo

Criar a pagina `/contato` com as informacoes de contato do Prof. Sandro Mesquita, seguindo o design system dark do Subhumano. Tambem atualizar o link "Contato" no footer da landing page para apontar para essa nova rota.

## Alteracoes

### 1. Criar `src/pages/Contact.tsx`

Pagina publica com layout minimalista contendo:

- Titulo: "Contato"
- Card com informacoes do responsavel:
  - Nome: Prof. Sandro Mesquita
  - Email: sandro.mesquita@itia.org.br (link mailto)
  - WhatsApp: (85) 98818-2453 (link para wa.me)
- Icones Lucide (User, Mail, Phone)
- Estilo consistente: fundo preto, card bg-card (#141414), texto branco, rounded-xl

### 2. Adicionar rota em `src/App.tsx`

Nova rota publica: `<Route path="/contato" element={<Contact />} />`

### 3. Atualizar `src/components/landing/LandingFooter.tsx`

Trocar o link "Contato" de `<a href="#">` para `<Link to="/contato">`.

## Detalhes tecnicos

| Arquivo | Alteracao |
|---|---|
| `src/pages/Contact.tsx` | Novo arquivo - pagina de contato |
| `src/App.tsx` | Adicionar rota publica `/contato` |
| `src/components/landing/LandingFooter.tsx` | Link "Contato" apontar para `/contato` |
