
Objetivo: corrigir definitivamente o problema de safe area no topo (notch/status bar) nas páginas públicas de documento, para que o botão de voltar nunca fique inacessível no celular.

Diagnóstico confirmado no código atual:
- `src/pages/Contact.tsx` e `src/pages/TermsOfUse.tsx` usam container raiz sem `pt-safe`.
- Ambas têm header sticky com `top-0`, então em iOS/Android com notch o conteúdo pode ficar “por baixo” da área de sistema.
- O mesmo padrão também existe em `src/pages/PrivacyPolicy.tsx` (risco de reincidência do mesmo bug).
- Já existe padrão funcional no projeto: utilitário `pt-safe` aplicado em páginas sensíveis (`Login`, `Register`, `ConversationDetail`, etc.).

Estratégia (para garantir que não se repita):
1) Corrigir imediatamente as páginas reportadas
- Adicionar `pt-safe` no container raiz de:
  - `src/pages/Contact.tsx`
  - `src/pages/TermsOfUse.tsx`

2) Prevenir reincidência com padronização real
- Criar um componente/layout reutilizável para páginas públicas estáticas (ex.: `PublicPageLayout`) com:
  - wrapper `min-h-screen bg-background text-foreground pt-safe`
  - header sticky padrão (ArrowLeft + Logo)
  - slot de conteúdo (`main`)
  - `LandingFooter`
- Migrar para esse layout:
  - `Contact`
  - `TermsOfUse`
  - `PrivacyPolicy`
- Resultado: qualquer nova página pública já nasce com safe area correta e mesma estrutura visual.

3) Ajuste fino de espaçamento para mobile
- Garantir header com altura e padding consistentes (mantendo padrão existente).
- Preservar `pb-20` no conteúdo para respiro inferior e navegação confortável.

Arquivos envolvidos:
- `src/pages/Contact.tsx` (ajuste imediato + possível migração para layout comum)
- `src/pages/TermsOfUse.tsx` (ajuste imediato + possível migração para layout comum)
- `src/pages/PrivacyPolicy.tsx` (alinhamento preventivo)
- `src/components/...` (novo layout público reutilizável, se adotado)

Critérios de aceite:
- Em viewport mobile (390x844 e 375x812), botão de voltar fica totalmente visível e clicável.
- Header não sobrepõe status bar/hora/notch em iOS e Android.
- Contato, Termos e Privacidade mantêm o mesmo padrão visual (sticky header + logo + footer).
- Não há regressão de navegação (voltar para `/` funcionando em todas).

Validação E2E (obrigatória):
- Abrir `/contato`, `/termos` e `/privacidade` em modo mobile no preview.
- Tocar no botão voltar em cada página e confirmar retorno para `/`.
- Verificar em rolagem (topo e meio da página) se header permanece acessível.
- Repetir em tablet/desktop para confirmar consistência de layout.

Observação de procedimento padrão (definitivo):
- Toda nova página fora do `AppLayout` deve obrigatoriamente usar `pt-safe` no wrapper raiz.
- Para páginas públicas estáticas, usar o layout público reutilizável (com safe area embutida), evitando erro humano em páginas futuras.
