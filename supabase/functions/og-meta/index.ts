import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SITE_URL, SITE_NAME } from '../_shared/site.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_IMAGE = 'https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/ecossistema-subhumano-inteligencia-artificial-prof-sandro-mesquita.webp';
const DEFAULT_DESCRIPTION =
  'Curadoria de inteligência artificial validada por especialistas. Aprenda IA de forma prática e aplicada.';

const BOT_PATTERNS = [
  'facebookexternalhit', 'facebot', 'twitterbot', 'linkedinbot',
  'whatsapp', 'telegrambot', 'slackbot', 'discordbot',
  'googlebot', 'bingbot', 'applebot', 'pinterestbot',
  'snapchat', 'redditbot', 'skypeuripreview', 'meta-externalagent',
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(pattern => ua.includes(pattern));
}

function getImageUrl(thumbnailUrl: string | null): string {
  if (!thumbnailUrl || thumbnailUrl.trim() === '') {
    return DEFAULT_IMAGE;
  }
  return thumbnailUrl;
}

function getRenderImageUrl(thumbnailUrl: string | null): string {
  const sourceUrl = (!thumbnailUrl || thumbnailUrl.trim() === '')
    ? DEFAULT_IMAGE
    : thumbnailUrl;

  if (sourceUrl.includes('/storage/v1/object/public/')) {
    const renderUrl = sourceUrl.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    const separator = renderUrl.includes('?') ? '&' : '?';
    return `${renderUrl}${separator}width=1200&height=630&resize=cover&quality=85`;
  }

  return sourceUrl;
}

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
}, isBot = false): string {
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
  <meta property="og:image:secure_url" content="${esc(meta.image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:url" content="${esc(meta.url)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  ${meta.author ? `<meta property="article:author" content="${esc(meta.author)}" />` : ''}
  ${meta.publishedTime ? `<meta property="article:published_time" content="${esc(meta.publishedTime)}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(meta.title)}" />
  <meta name="twitter:description" content="${esc(meta.description)}" />
  <meta name="twitter:image" content="${esc(meta.image)}" />
  ${isBot ? '' : `<script>window.location.href="${meta.url.replace(/"/g, '\\"')}";</script>`}
</head>
<body>
  <p>Redirecionando para ${esc(meta.title)}...</p>
</body>
</html>`;
}

const htmlHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/html; charset=utf-8',
  'content-type': 'text/html; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const spaceSlug = url.searchParams.get('space');
    const postSlug = url.searchParams.get('post');

    const userAgent = req.headers.get('user-agent') || '';
    const bot = isBot(userAgent);
    console.log('og-meta ua:', { isBot: bot, ua: userAgent.slice(0, 120) });
    console.log('og-meta request:', { spaceSlug, postSlug });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (!spaceSlug || !postSlug) {
      return new Response(
        buildHtml({
          title: `${SITE_NAME} — Inteligência que Acompanha seu Ritmo`,
          description: DEFAULT_DESCRIPTION,
          image: getImageUrl(null),
          url: SITE_URL,
        }, bot),
        { headers: { ...htmlHeaders, 'Cache-Control': 'public, max-age=3600' } }
      );
    }

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
          image: getImageUrl(null),
          url: SITE_URL,
        }, bot),
        { headers: { ...htmlHeaders, 'Cache-Control': 'public, max-age=60' } }
      );
    }

    const articleUrl = `${SITE_URL}/spaces/${spaceSlug}/post/${postSlug}`;
    const description = post.content ? stripHtml(post.content) : DEFAULT_DESCRIPTION;

    return new Response(
      buildHtml({
        title: post.title,
        description,
        image: getImageUrl(post.thumbnail_url),
        url: articleUrl,
        publishedTime: post.published_at ?? undefined,
      }, bot),
      { headers: { ...htmlHeaders, 'Cache-Control': 'public, max-age=3600' } }
    );
  } catch (err) {
    console.error('og-meta error:', err);
    const catchBot = isBot(req.headers.get('user-agent') || '');
    return new Response(
      buildHtml({
        title: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        image: getImageUrl(null),
        url: SITE_URL,
      }, catchBot),
      { headers: htmlHeaders }
    );
  }
});
