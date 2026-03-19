

# Plano Revisado: LiveStatsSection entre Autoridade e FAQ

## Única alteração em relação ao plano aprovado anteriormente

A **Fase 4** muda apenas o posicionamento do componente `LiveStatsSection` em `src/pages/Landing.tsx`:

**Antes (plano anterior):** entre `LandingSocialProof` e `LandingProblem` (posição 2→3)

**Agora:** entre `LandingAuthor` e `LandingFAQ` (posição 8→9)

```text
<LandingAuthor />
<LiveStatsSection />   ← aqui
<LandingFAQ />
```

Todas as outras fases (banco, edge functions, componente) permanecem exatamente como aprovadas.

