

# Plano: Fase 3B.1 — Header condensado + YouTube embed

## Arquivo: `src/pages/EventDetail.tsx`

### 1. Adicionar estado e utilitário

- `useState` para `isDescriptionExpanded` (default false)
- Função `extractYouTubeId(url)` que extrai VIDEO_ID dos formatos: `watch?v=`, `youtu.be/`, `/embed/`, `/live/`
- Derivar `youtubeId` de `youtubeUrl`

### 2. Reestruturar o bloco principal (linhas 130-236)

**Header condensado (substitui cover + badges + title + description + metadata + price/actions):**

- Badges em linha: tipo, modalidade, status (Encerrado se `isPast`, "Em breve" se `hasSessions && !isPast`)
- Título h1 (manter)
- Metadados compactos (sessions, local, capacidade) — manter como está
- Indicador de preço inline (manter `getPriceLabel`)
- Descrição colapsável: `line-clamp-3` quando colapsado, botão "Ver descrição completa" / "Recolher"
- Botão "Entrar na Sala ao Vivo" — SOMENTE se `meetUrl && !isPast`

**Remover:**
- Cover image grande como destaque (linhas 131-138)
- Todos os botões de ação (Acessar ao Vivo, Assistir Gravação, Acessar) — linhas 193-222
- Textos "Este evento foi encerrado" / "Aguarde informações de acesso"

### 3. Player de vídeo (após header)

- Se `youtubeId` existe → iframe embed 16:9 com título "Gravação do Evento"
- Se `youtubeId` não existe mas `cover_url` existe → mostrar cover image como fallback visual
- Se nenhum dos dois → nada

### 4. Mensagem contextual (após vídeo/capa)

- Somente se NÃO há `youtubeUrl` E `materials.length === 0`:
  - Futuro → "O conteúdo será disponibilizado após o evento"
  - Encerrado → "Conteúdo em preparação — será publicado em breve"

### 5. Seção de materiais — NÃO alterar (linhas 226-234)

### 6. Cleanup de imports

- Remover `YoutubeLogo` (não mais usado como ícone de botão)
- Manter demais imports

## Arquivos alterados

- `src/pages/EventDetail.tsx` — único arquivo

