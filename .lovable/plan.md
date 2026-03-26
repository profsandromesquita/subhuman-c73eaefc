

# Plano: Keep-alive para tts-generate via pg_cron

## Resumo

3 alterações: 1 Edge Function nova (keepalive), 1 ajuste na tts-generate (short-circuit para keep-alive), 1 cron job SQL. O cron pinga a cada 4 minutos para manter o container Deno acordado (timeout de inatividade é ~5min).

## 1. `supabase/functions/tts-keepalive/index.ts` — novo

Função mínima que retorna `{ alive: true }`. Não é estritamente necessária se vamos pingar `tts-generate` diretamente, mas o usuário pediu. **Porém**, analisando o pedido, o cron pinga `tts-generate` diretamente (não a keepalive). Logo esta função não será usada pelo cron. Vou seguir o pedido do usuário e criá-la, mas o cron aponta para `tts-generate`.

## 2. `supabase/functions/tts-generate/index.ts` — short-circuit keep-alive

Mover `req.json()` para antes da validação de auth e adicionar early return para `keep-alive`:

- Linhas 43-50 substituídas por:
  - `const body = await req.json();`
  - `const { text } = body;`
  - Se `!text` ou `text.trim() === 'keep-alive'` ou `text.trim().length === 0` → retorna `{ ok: true }` com 200
  - Isso evita chamar OpenAI e evita a validação de auth (o cron usa service_role_key que não passa por `getClaims`)

**Importante**: o short-circuit deve ficar **antes** da validação de auth, porque o cron usa `service_role_key` diretamente e `getClaims` pode falhar com ele. Reordenar para: OPTIONS → parse body → check keep-alive → auth → OpenAI.

## 3. Cron job — SQL via migration tool (NÃO migration file)

Conforme as instruções do sistema, cron jobs com URLs e anon keys devem ser inseridos via **insert tool**, não via migration file. O SQL:

```sql
create extension if not exists pg_cron;

select cron.unschedule('tts-keepalive')
where exists (select 1 from cron.job where jobname = 'tts-keepalive');

select cron.schedule(
  'tts-keepalive',
  '*/4 * * * *',
  $$
  select net.http_post(
    url := 'https://akkbfzfjappludgsrwsw.supabase.co/functions/v1/tts-generate',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2JmemZqYXBwbHVkZ3Nyd3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjAxMzQsImV4cCI6MjA4MzE5NjEzNH0.y1fMM7Nh3UNYL2GItj3tvdNKp3GQDcLB03P166GrpX8"}'::jsonb,
    body := '{"text":"keep-alive"}'::jsonb
  );
  $$
);
```

## 4. `supabase/config.toml` — adicionar keepalive

```toml
[functions.tts-keepalive]
  verify_jwt = false
```

## Ordem de execução

1. Criar `tts-keepalive/index.ts`
2. Adicionar bloco em `config.toml`
3. Alterar `tts-generate/index.ts` — reordenar: parse body → keep-alive check → auth → OpenAI
4. Executar SQL do cron via insert tool

## Arquivos alterados

1. `supabase/functions/tts-keepalive/index.ts` — novo
2. `supabase/config.toml` — 2 linhas
3. `supabase/functions/tts-generate/index.ts` — reordenar linhas 19-50
4. SQL cron via insert tool (não migration file)

