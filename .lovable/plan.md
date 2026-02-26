
# Ajuste na Pagina de Contato - Informacoes Institucionais

## Resumo

Expandir a pagina `/contato` para incluir as informacoes completas do ecossistema Subhumano: entidade mantenedora (ITIA), coordenador (Prof. Sandro Mesquita) e apoiadora (Roboticamente), com CNPJ, registros profissionais e links para websites.

## Alteracoes

Apenas o arquivo `src/pages/Contact.tsx` sera modificado.

### Estrutura final da pagina

A pagina tera 3 cards separados, cada um representando uma entidade do ecossistema:

```text
+----------------------------------+
| [<-]  Logo                       |
+----------------------------------+
|                                  |
|  Contato                         |
|                                  |
|  Mantido pelo ITIA               |  <- Subtitulo da secao
|  +----------------------------+  |
|  | ITIA - Instituto de Tecno- |  |
|  | logia e Inteligencia Art.  |  |
|  | CNPJ: 58.246.571/0001-90   |  |
|  | itia.org.br | itia.ia.br   |  |
|  +----------------------------+  |
|                                  |
|  Coordenado por                  |  <- Subtitulo da secao
|  +----------------------------+  |
|  | Sandro Costa Mesquita      |  |
|  | CREA-CE: 44680             |  |
|  | Email / WhatsApp           |  |
|  | profsandromesquita.com.br  |  |
|  +----------------------------+  |
|                                  |
|  Apoiado pela Roboticamente      |  <- Subtitulo da secao
|  +----------------------------+  |
|  | Roboticamente              |  |
|  | CNPJ: 43.451.391/0001-73   |  |
|  | roboticamente.eng.br       |  |
|  +----------------------------+  |
|                                  |
+----------------------------------+
|  LandingFooter                   |
+----------------------------------+
```

### Detalhes de cada card

**Card 1 - ITIA (Mantenedora)**
- Icone: Building2 (lucide)
- Nome: ITIA -- Instituto de Tecnologia e Inteligencia Artificial
- CNPJ: 58.246.571/0001-90
- Website oficial: itia.org.br (link externo)
- Website secundario: itia.ia.br (link externo)

**Card 2 - Prof. Sandro Mesquita (Coordenador)**
- Icone: User (lucide)
- Nome: Sandro Costa Mesquita
- CREA-CE: 44680
- Email: sandro.mesquita@itia.org.br (mailto)
- WhatsApp: (85) 98818-2453 (wa.me)
- Website: profsandromesquita.com.br (link externo)

**Card 3 - Roboticamente (Apoiadora)**
- Icone: Handshake (lucide)
- Nome: Roboticamente
- CNPJ: 43.451.391/0001-73
- Website: roboticamente.eng.br (link externo)

### Detalhes tecnicos

| Item | Detalhe |
|---|---|
| Arquivo | `src/pages/Contact.tsx` |
| Novos icones Lucide | `Building2`, `Handshake`, `Globe`, `FileText`, `ExternalLink` |
| Layout | Cada card usa `bg-card rounded-xl p-5 space-y-4` |
| Links externos | `target="_blank" rel="noopener noreferrer"` |
| Subtitulos | `text-lg font-semibold` acima de cada card |
| Labels | `text-xs text-muted-foreground` para rotulos como "CNPJ", "CREA-CE" |
