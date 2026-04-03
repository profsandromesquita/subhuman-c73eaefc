

# Plano: Cards de artigos — layout vertical responsivo

## Arquivo: `supabase/functions/send-daily-digest/index.ts`

### Edição única — Substituir bloco de cards (linhas 350-378)

Substituir todo o bloco que gera `thumbnailCell` e o `updatesHtml` do card por layout vertical:

**Antes (linhas 350-378):** Layout 2 colunas com `thumbnailCell` + `<td>` lado a lado.

**Depois:**

```typescript
      const thumbnailRow = update.thumbnail_url
        ? `<tr>
            <td style="padding:0;">
              <a href="${articleUrl}" style="text-decoration:none;">
                <img src="${update.thumbnail_url}" width="520" height="0" alt="" style="display:block;width:100%;height:auto;max-height:200px;object-fit:cover;">
              </a>
            </td>
          </tr>`
        : `<tr>
            <td style="padding:0;">
              <div style="width:100%;height:120px;background:#e5e7eb;display:table;">
                <div style="display:table-cell;vertical-align:middle;text-align:center;">
                  <span style="color:#9ca3af;font-size:12px;font-family:${fontFamily};">Subhumano</span>
                </div>
              </div>
            </td>
          </tr>`;

      updatesHtml += `
      <tr>
        <td style="padding:12px 40px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            ${thumbnailRow}
            <tr>
              <td style="padding:16px 20px;">
                <a href="${articleUrl}" style="color:#1a1a1a;text-decoration:none;font-size:16px;font-weight:600;line-height:1.3;display:block;margin-bottom:8px;font-family:${fontFamily};">${update.title}</a>
                ${excerpt ? `<p style="margin:0 0 12px;font-size:14px;color:#6b7280;line-height:1.5;font-family:${fontFamily};">${excerpt}</p>` : ''}
                <a href="${articleUrl}" style="color:#000000;font-size:13px;font-weight:600;text-decoration:none;font-family:${fontFamily};">Ler artigo →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
```

Mudanças-chave:
- Thumbnail ocupa largura total do card (`width:100%`, `width="520"`)
- `max-height:200px` limita thumbnails altas no desktop
- Texto abaixo da imagem com font-sizes maiores (16/14/13px)
- Placeholder sem thumbnail: `height:120px`, largura total
- `border-radius` removido da imagem (o `overflow:hidden` da table pai já arredonda os cantos)

## O que NÃO muda

- Banner, greeting, CTA, footer
- `generatePlainText`, `extractExcerpt`, query, subject, throttle
- Nenhum outro arquivo

