

# Plano: Ajustes finais no template do daily digest

## Arquivo: `supabase/functions/send-daily-digest/index.ts`

### Edição 1 — Remover row da logo (linhas 396-401)

Remover estas 6 linhas:

```html
          <!-- Header: Logo -->
          <tr>
            <td align="center" style="padding:32px 40px 24px;">
              <img src="${logoUrl}" width="140" alt="Subhumano" style="display:block;">
            </td>
          </tr>
```

O banner (linhas 402-409) passa a ser o primeiro elemento visual do container.

### Edição 2 — Redesenhar footer (linhas 426-433)

Substituir o bloco atual do footer por:

```html
          <!-- Footer -->
          <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>
          <tr>
            <td align="center" style="padding:24px 40px 0;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;font-family:${fontFamily};">Subhumano</p>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;font-family:${fontFamily};">Ecossistema de Inteligência Artificial</p>
              <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;font-family:${fontFamily};">Mantido pelo ITIA — Instituto de Tecnologia e Inteligência Artificial</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 40px 0;">
              <p style="margin:0;font-size:12px;font-family:${fontFamily};">
                <a href="https://subhumano.ia.br/login" style="color:#6b7280;text-decoration:underline;">Site</a>
                <span style="color:#d1d5db;"> · </span>
                <a href="https://subhumano.ia.br/spaces" style="color:#6b7280;text-decoration:underline;">Espaços</a>
                <span style="color:#d1d5db;"> · </span>
                <a href="https://subhumano.ia.br/channels" style="color:#6b7280;text-decoration:underline;">Canais</a>
                <span style="color:#d1d5db;"> · </span>
                <a href="https://subhumano.ia.br/podcasts" style="color:#6b7280;text-decoration:underline;">Podcasts</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 40px 0;">
              <p style="margin:0;font-size:12px;font-family:${fontFamily};">
                <a href="https://instagram.com/subhumano.ia" style="color:#6b7280;text-decoration:underline;">Instagram</a>
                <span style="color:#d1d5db;"> · </span>
                <a href="https://youtube.com/@subhumano.ia" style="color:#6b7280;text-decoration:underline;">YouTube</a>
                <span style="color:#d1d5db;"> · </span>
                <a href="https://linkedin.com/company/subhumano" style="color:#6b7280;text-decoration:underline;">LinkedIn</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 40px 0;">
              <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;font-family:${fontFamily};">Você está recebendo este email porque habilitou o resumo diário nas suas preferências.</p>
              <a href="https://subhumano.ia.br/profile/notifications" style="font-size:11px;color:#6b7280;text-decoration:underline;font-family:${fontFamily};">Gerenciar preferências</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 40px 32px;">
              <p style="margin:0;font-size:11px;color:#d1d5db;font-family:${fontFamily};">© 2026 Subhumano. Todos os direitos reservados.</p>
            </td>
          </tr>
```

**Nota:** A URL de Canais foi corrigida para `/channels` (padrão de rota do projeto) em vez de `/canais` mencionado na spec.

## O que NÃO muda

- Banner, greeting, cards de artigos, CTA
- `generatePlainText`, `extractExcerpt`, query, subject, throttle
- Nenhum outro arquivo

