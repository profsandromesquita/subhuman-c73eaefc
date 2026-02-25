

# Corrigir Pagina de Contato - Seguir Padrao do Subhumano

## Problema

A pagina `/contato` foi criada sem seguir o padrao de layout das outras paginas publicas (como `/privacidade`). Falta:
- Header sticky com botao de voltar (seta ArrowLeft)
- Footer da landing page (LandingFooter)
- O usuario fica "preso" na pagina sem navegacao clara

## Solucao

Refatorar `src/pages/Contact.tsx` para seguir exatamente o padrao da pagina `/privacidade`:

### Alteracoes em `src/pages/Contact.tsx`

1. **Header sticky** com backdrop blur, botao de voltar (ArrowLeft linkando para `/`) e Logo, identico ao da PrivacyPolicy
2. **Adicionar LandingFooter** no final da pagina para manter consistencia com a landing page
3. **Ajustar estrutura do main** para usar `max-w-3xl` como a pagina de privacidade

### Estrutura final

```text
+----------------------------------+
| [<-]  Logo                       |  <- Header sticky com blur
+----------------------------------+
|                                  |
|  Contato                         |  <- Titulo
|                                  |
|  +----------------------------+  |
|  | Responsavel                |  |
|  | Prof. Sandro Mesquita      |  |  <- Card com infos
|  | Email / WhatsApp           |  |
|  +----------------------------+  |
|                                  |
+----------------------------------+
|  Logo + Links + Copyright        |  <- LandingFooter
+----------------------------------+
```

### Detalhes tecnicos

| Elemento | De | Para |
|---|---|---|
| Header | Logo centralizada simples | Header sticky com ArrowLeft + Logo (padrao PrivacyPolicy) |
| Container | `max-w-md` | `max-w-3xl` para consistencia |
| Footer | Ausente | `LandingFooter` importado |
| Import | `User, Mail, Phone` | Adicionar `ArrowLeft`, `LandingFooter` |

Apenas o arquivo `src/pages/Contact.tsx` sera modificado.
