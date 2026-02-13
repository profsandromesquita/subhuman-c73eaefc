

# Upgrade: Gestao de Eventos - Upload de Capa e Integracao Dinamica

## Visao Geral

Tres areas precisam de ajustes: o formulario admin precisa de upload de imagem, a pagina de Planos precisa buscar eventos do banco, e a Landing Page precisa exibir o proximo evento dinamicamente.

---

## 1. Upload de Capa no Admin

**Problema**: O formulario de criar/editar evento em `/admin/events` nao possui campo de upload de imagem. A tabela `events` ja tem a coluna `cover_url`, mas nao e preenchida.

**Solucao**:

- Criar um bucket de storage chamado `event-covers` (publico) com politica RLS para admins fazerem upload
- Adicionar campo `cover_url` ao `FormData` do componente admin
- Adicionar um componente de upload de imagem no formulario (file picker com preview)
- Ao selecionar uma imagem, fazer upload para o bucket `event-covers` usando a mesma logica do `useMediaUpload` (mas com bucket diferente)
- Ao editar evento existente, exibir preview da imagem ja salva com opcao de trocar
- Gravar a URL publica no campo `cover_url` ao submeter

**Arquivo**: `src/pages/admin/Events.tsx`
- Adicionar estado `coverFile` e `coverPreview` ao formulario
- Adicionar secao de upload com drag-and-drop ou file picker antes do campo Titulo
- No `handleSubmit`, fazer upload da imagem se houver arquivo novo, obter URL publica, e incluir `cover_url` no payload
- No `openEditModal`, carregar `cover_url` existente no preview

**Migration SQL**: Criar bucket `event-covers` com politica de upload para admins

---

## 2. Pagina de Planos - Eventos Dinamicos

**Problema**: A pagina `/plans` tem um card de workshop hardcoded (linhas 14-27 do Plans.tsx) com titulo, preco e datas fixas. Nao reflete eventos criados no admin.

**Solucao**:

- Buscar eventos pagos e publicados da tabela `events` usando o hook `useEvents` ja existente
- Filtrar apenas eventos futuros e que nao sao gratuitos (produtos avulsos)
- Renderizar um card para cada evento encontrado na secao "ou adquira um produto"
- Usar `checkout_url` do evento (cadastrado no admin) como destino do botao de compra
- Exibir a imagem de capa (`cover_url`) se disponivel
- Se nao houver eventos pagos, ocultar a secao inteira

**Arquivo**: `src/pages/Plans.tsx`
- Remover o objeto `workshopProduct` hardcoded
- Importar `useEvents` e buscar eventos publicados
- Mapear eventos pagos futuros em cards dinamicos
- Usar `event.checkout_url` em vez de URL fixa

---

## 3. Landing Page - Proximo Evento Dinamico

**Problema**: O componente `LandingEvents` (landing page) tem titulo, descricao, datas e preco totalmente hardcoded.

**Solucao**:

- Buscar o proximo evento publicado (futuro) diretamente da tabela `events` com suas sessoes
- Renderizar dinamicamente titulo, descricao, tipo, modalidade, datas das sessoes, preco e link de checkout
- Exibir a imagem de capa se disponivel
- Se nao houver proximo evento, ocultar a secao inteira

**Arquivo**: `src/components/landing/LandingEvents.tsx`
- Importar `useEvents` ou fazer query direta com `supabase`
- Buscar primeiro evento futuro publicado
- Substituir dados hardcoded pelos dados do banco
- Condicionar renderizacao: se nao houver evento, retornar `null`

---

## Detalhes Tecnicos

### Migration SQL

```text
-- Criar bucket para capas de eventos
INSERT INTO storage.buckets (id, name, public) VALUES ('event-covers', 'event-covers', true);

-- Politica: admins podem fazer upload
CREATE POLICY "Admins can upload event covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-covers'
  AND public.is_admin_or_moderator(auth.uid())
);

-- Politica: admins podem atualizar
CREATE POLICY "Admins can update event covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-covers'
  AND public.is_admin_or_moderator(auth.uid())
);

-- Politica: admins podem deletar
CREATE POLICY "Admins can delete event covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-covers'
  AND public.is_admin_or_moderator(auth.uid())
);

-- Politica: qualquer pessoa pode ver (bucket publico)
CREATE POLICY "Anyone can view event covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-covers');
```

### Arquivos a serem editados

1. `src/pages/admin/Events.tsx` - Upload de capa no formulario
2. `src/pages/Plans.tsx` - Cards de eventos dinamicos
3. `src/components/landing/LandingEvents.tsx` - Proximo evento dinamico

### Ordem de implementacao

1. Criar bucket de storage (migration)
2. Adicionar upload de capa no admin
3. Tornar Plans dinamico
4. Tornar Landing Page dinamica
