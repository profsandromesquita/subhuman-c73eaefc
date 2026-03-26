import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async () => {
  // Função exclusiva para keep-alive
  // Apenas retorna 200 para confirmar que o container está ativo
  return new Response(JSON.stringify({ alive: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
