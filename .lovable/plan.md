

# Corrigir erro "Cannot read properties of undefined (reading 'event_type')"

## Causa raiz

No arquivo `src/components/landing/LandingEvents.tsx`, linha 34:

```typescript
const nextEvent = events?.[0];
```

`nextEvent` pode ser `undefined` quando os dados ainda estao carregando ou quando nao ha eventos futuros. Porem, nas linhas 37-51, o codigo acessa `nextEvent.event_type`, `nextEvent.is_free`, etc. **sem verificar se `nextEvent` existe**, causando o crash.

## Correcao

Adicionar um guard clause logo apos a linha 34. Se `nextEvent` for `undefined`, o componente retorna `null` (nao renderiza nada):

```typescript
const nextEvent = events?.[0];

if (!nextEvent) return null;
```

Isso resolve o crash e tambem faz com que a secao de eventos da landing page seja ocultada caso nao haja nenhum evento futuro publicado.

## Arquivo alterado

| Arquivo | Alteracao |
|---|---|
| `src/components/landing/LandingEvents.tsx` | Adicionar `if (!nextEvent) return null;` na linha 35 |

## Impacto

- Corrige o crash imediato que impede o acesso ao app
- Zero impacto em outras funcionalidades
- Comportamento esperado: secao de eventos so aparece quando ha eventos futuros publicados
