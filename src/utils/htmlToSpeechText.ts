/**
 * Converte HTML do Tiptap em array de blocos de texto para TTS.
 * Cada item do array representa um parágrafo ou bloco semântico.
 */
export function htmlToSpeechBlocks(html: string): string[] {
  if (!html) return [];

  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove elementos não-textuais
  temp.querySelectorAll(
    'img, iframe, video, audio, figure, code, pre'
  ).forEach(el => el.remove());

  const blockSelector = 'h1, h2, h3, h4, h5, h6, p, li, blockquote';
  const blockElements = temp.querySelectorAll(blockSelector);

  const blocks: string[] = [];

  blockElements.forEach(el => {
    const raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!raw) return;

    const text = raw.match(/[.!?]$/) ? raw : raw + '.';
    blocks.push(text);
  });

  if (blocks.length === 0) {
    const fallback = (temp.textContent || '').replace(/\s+/g, ' ').trim();
    return fallback
      .match(/[^.!?]+[.!?]+/g)
      ?.map(s => s.trim())
      .filter(Boolean) || [fallback];
  }

  return blocks;
}

/** Mantém exportação de string única para compatibilidade */
export function htmlToSpeechText(html: string): string {
  return htmlToSpeechBlocks(html).join(' ');
}
