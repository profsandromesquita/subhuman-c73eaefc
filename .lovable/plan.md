

# Plano: Adicionar banner no header do email de resumo diário

## Arquivo: `supabase/functions/send-daily-digest/index.ts`

### Edição única — entre linhas 398 e 399

Inserir uma nova row com o banner **após** a row da logo (linha 398) e **antes** da row do separador (linha 399).

**Código a inserir:**

```html
<!-- Banner -->
<tr>
  <td style="padding:16px 0 0;">
    <a href="https://subhumano.ia.br/login" style="text-decoration:none;">
      <img 
        src="https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/banner-email-subhumano.png" 
        width="600" 
        height="200" 
        alt="Subhumano - Ecossistema de Inteligência Artificial" 
        style="display:block;width:100%;height:auto;border-radius:0;"
      >
    </a>
  </td>
</tr>
```

### Localização exata no código

```typescript
// Linha 393-398 (logo - NÃO alterar)
          <!-- Header: Logo -->
          <tr>
            <td align="center" style="padding:32px 40px 24px;">
              <img src="${logoUrl}" width="140" alt="Subhumano" style="display:block;">
            </td>
          </tr>
          ▼▼▼ INSERIR BANNER AQUI ▼▼▼
// Linha 399 (separador - NÃO alterar)
          <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e5e7eb;"></div></td></tr>
```

## O que NÃO muda

- Logo, separador, greeting, cards, CTA, footer
- `generatePlainText`, `extractExcerpt`, query, subject
- Nenhum outro arquivo

