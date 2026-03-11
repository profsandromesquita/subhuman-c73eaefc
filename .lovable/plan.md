

# Boost Multiplicativo na Ordenação do `search_rag_chunks_lexical`

## Mudança

Alterar a cláusula `ORDER BY` da função SQL `search_rag_chunks_lexical` para usar prioridade como boost multiplicativo no score FTS, em vez de critério de ordenação independente.

### Antes (ORDER BY atual)
```sql
ORDER BY 
  CASE WHEN d.layer = 'constituicao' THEN 0 WHEN d.layer = 'nucleo' THEN 1 ELSE 2 END,
  c.priority DESC,
  rank DESC
```

### Depois
```sql
ORDER BY 
  CASE WHEN d.layer = 'constituicao' THEN 0 WHEN d.layer = 'nucleo' THEN 1 ELSE 2 END,
  (rank * (c.priority / 70.0)) DESC
```

## Implementação

Uma única migração SQL com `CREATE OR REPLACE FUNCTION` que recria a função `search_rag_chunks_lexical` com a nova cláusula ORDER BY. Todo o resto da função permanece idêntico.

## Impacto

- Constituição e Núcleo continuam sempre no topo (layer sort mantido)
- Prioridade vira multiplicador do score FTS em vez de critério dominante
- Nenhuma alteração na Edge Function ou no código frontend

