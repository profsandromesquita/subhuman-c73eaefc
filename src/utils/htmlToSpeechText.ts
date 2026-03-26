/**
 * Converte HTML do Tiptap em array de strings para TTS.
 * 
 * Regras:
 * - <p> filhos diretos de <li> são ignorados (Tiptap aninha p dentro de li)
 * - Blocos são agrupados em chunks de até 3000 chars para reduzir cold starts
 * - Cada chunk é uma utterance contínua, produzindo leitura mais fluida
 */
const BLOCK_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, li, blockquote';
const MAX_CHUNK_CHARS = 3000;

function extractBlocks(html: string): string[] {
  if (!html) return [];

  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove elementos não-textuais
  temp.querySelectorAll(
    'img, iframe, video, audio, figure, code, pre'
  ).forEach(el => el.remove());

  const blocks: string[] = [];

  temp.querySelectorAll(BLOCK_SELECTOR).forEach(el => {
    // CRÍTICO: ignora <p> aninhados dentro de <li> (estrutura padrão do Tiptap)
    // sem isso, cada item de lista é lido duas vezes
    if (
      el.tagName === 'P' &&
      el.parentElement?.tagName === 'LI'
    ) return;

    const raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!raw) return;

    // Garante pontuação terminal para pausa natural entre blocos
    const text = /[.!?]$/.test(raw) ? raw : raw + '.';
    blocks.push(text);
  });

  // Fallback se o HTML não tiver estrutura semântica reconhecida
  if (blocks.length === 0) {
    const fallback = (temp.textContent || '').replace(/\s+/g, ' ').trim();
    if (fallback) blocks.push(fallback);
  }

  return blocks;
}

/**
 * Agrupa blocos em chunks de até MAX_CHUNK_CHARS caracteres.
 * Menos utterances = menos cold starts = leitura mais fluida.
 */
export function htmlToSpeechBlocks(html: string): string[] {
  const blocks = extractBlocks(html);
  if (blocks.length === 0) return [];

  const chunks: string[] = [];
  let current = '';

  for (const block of blocks) {
    const separator = current ? ' ' : '';
    if (current.length > 0 && (current + separator + block).length > MAX_CHUNK_CHARS) {
      chunks.push(current.trim());
      current = block;
    } else {
      current += separator + block;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

// Compatibilidade — retorna string única (usado em fallbacks)
export function htmlToSpeechText(html: string): string {
  return htmlToSpeechBlocks(html).join(' ');
}
