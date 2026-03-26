/**
 * Converte HTML do Tiptap em texto puro adequado para TTS.
 * Remove tags, decodifica entidades HTML e normaliza espaços.
 */
export function htmlToSpeechText(html: string): string {
  if (!html) return '';

  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Remove elementos não-textuais
  const nonTextElements = temp.querySelectorAll(
    'img, iframe, video, audio, figure, figcaption, code, pre'
  );
  nonTextElements.forEach(el => el.remove());

  // Adiciona ponto final apenas quando o bloco não termina com pontuação
  const blockElements = temp.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote');
  blockElements.forEach(el => {
    const text = el.textContent?.trim();
    if (text && !text.match(/[.!?]$/)) {
      el.textContent = text + '. ';
    }
  });

  return (temp.textContent || temp.innerText || '')
    .replace(/\s+/g, ' ')
    .trim();
}
