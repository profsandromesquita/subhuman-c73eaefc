import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://subhumano.ia.br';
const SITE_NAME = 'Subhumano';
const DEFAULT_IMAGE = 'https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/logo-subhumano.png?v=1';
const DEFAULT_DESCRIPTION =
  'Curadoria de inteligência artificial validada por especialistas. Aprenda IA de forma prática e aplicada.';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function buildHtml(meta: {
  title: string;
  description: string;
  image: string;
  url: string;
  author?: string;
  publishedTime?: string;
}): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>${esc(meta.title)}</title>
  <meta property="og:title" content="${esc(meta.title)}" />
  <meta property="og:description" content="${esc(meta.description)}" />
  <meta property="og:image" content="${esc(meta.image)}" />
  <meta property="og:url" content="${esc(meta.url)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  ${meta.author ? `<meta property="article:author" content="${esc(meta.author)}" />` : ''}
  ${meta.publishedTime ? `<meta property="article:published_time" content="${esc(meta.publishedTime)}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(meta.title)}" />
  <meta name="twitter:description" content="${esc(meta.description)}" />
  <meta name="twitter:image" content="${esc(meta.image)}" />
  <meta http-equiv="refresh" content="0;url=${esc(meta.url)}" />
</head>
<body>
  <p>Redirecionando para ${esc(meta.title)}...</p>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const spaceSlug = url.searchParams.get('space');
    const postSlug = url.searchParams.get('post');

    console.log('og-meta request:', { spaceSlug, postSlug });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // No params — return home meta tags
    if (!spaceSlug || !postSlug) {
      return new Response(
        buildHtml({
          title: `${SITE_NAME} — Inteligência que Acompanha seu Ritmo`,
          description: DEFAULT_DESCRIPTION,
          image: DEFAULT_IMAGE,
          url: SITE_URL,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        }
      );
    }

    // Fetch article data — public data, no auth needed
    const { data: post, error } = await supabase
      .from('space_updates')
      .select(`
    title,
    slug,
    thumbnail_url,
    content,
    published_at,
    author_id,
    spaces!inner ( slug, name )
      `)
      .eq('slug', postSlug)
      .eq('spaces.slug', spaceSlug)
      .eq('is_published', true)
      .single();

    console.log('og-meta result:', { found: !!post, error: error?.message, title: (post as any)?.title });

    if (error || !post) {
      console.error('Post not found:', error?.message);
      return new Response(
        buildHtml({
          title: `${SITE_NAME} — Inteligência que Acompanha seu Ritmo`,
          description: DEFAULT_DESCRIPTION,
          image: DEFAULT_IMAGE,
          url: SITE_URL,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=60',
          },
        }
      );
    }

    const articleUrl = `${SITE_URL}/spaces/${spaceSlug}/post/${postSlug}`;

    const description = post.content
      ? stripHtml(post.content)
      : DEFAULT_DESCRIPTION;

    return new Response(
      buildHtml({
        title: post.title,
        description,
        image: post.thumbnail_url ?? DEFAULT_IMAGE,
        url: articleUrl,
        publishedTime: post.published_at ?? undefined,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (err) {
    console.error('og-meta error:', err);
    return new Response(
      buildHtml({
        title: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        image: DEFAULT_IMAGE,
        url: SITE_URL,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
  }
});
