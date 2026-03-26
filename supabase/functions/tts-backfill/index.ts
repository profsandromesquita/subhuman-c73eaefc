import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Busca artigos publicados sem áudio
    const { data: posts, error } = await supabaseAdmin
      .from('space_updates')
      .select('id, title, content')
      .eq('is_published', true)
      .is('audio_url', null)
      .not('content', 'is', null)
      .order('published_at', { ascending: false });

    if (error) throw error;
    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No posts to process', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Backfill: ${posts.length} posts to process`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const post of posts) {
      if (!post.content) continue;
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/tts-generate`,
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              post_id: post.id,
              html_content: post.content,
            }),
          }
        );

        if (response.ok) {
          results.success++;
          console.log(`✓ ${post.title}`);
        } else {
          results.failed++;
          results.errors.push(`${post.title}: ${response.status}`);
          console.error(`✗ ${post.title}: ${response.status}`);
        }
      } catch (err) {
        results.failed++;
        results.errors.push(`${post.title}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
