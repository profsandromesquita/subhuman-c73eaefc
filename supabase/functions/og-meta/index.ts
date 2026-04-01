import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://subhumano.ia.br';
const SITE_NAME = 'Subhumano';
const DEFAULT_IMAGE = 'https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/ecossistema-subhumano-inteligencia-artificial-prof-sandro-mesquita.webp';
const DEFAULT_DESCRIPTION =
  'Curadoria de inteligência artificial validada por especialistas. Aprenda IA de forma prática e aplicada.';

const BOT_PATTERNS = [
  'facebookexternalhit', 'facebot', 'twitterbot', 'linkedinbot',
  'whatsapp', 'telegrambot', 'slackbot', 'discordbot',
  'googlebot', 'bingbot', 'applebot', 'pinterestbot',
  'snapchat', 'redditbot', 'skypeuripreview',
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(pattern => ua.includes(pattern));
}

function isWhatsApp(userAgent: string): boolean {
  return userAgent.toLowerCase().includes('whatsapp') ||
    userAgent.toLowerCase().includes('meta-externalagent');
}

function getImageUrl(thumbnailUrl: string | null, forWhatsApp: boolean): string {
  if (!thumbnailUrl || thumbnailUrl.trim() === '') {
    if (forWhatsApp) {
      return DEFAULT_IMAGE.includes('.webp')
        ? DEFAULT_IMAGE.replace(
            '/object/public/',
            '/render/image/public/'
          ) + '?width=1200&height=630&resize=cover&quality=90'
        : DEFAULT_IMAGE;
    }
    return DEFAULT_IMAGE;
  }

  if (forWhatsApp && thumbnailUrl.includes('/storage/v1/object/public/')) {
    const renderUrl = thumbnailUrl
      .replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
      .split('?')[0];
    return `${renderUrl}?width=1200&height=630&resize=cover&format=jpg&quality=85`;
  }

  return thumbnailUrl;
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
  imageType?: string;
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
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="${meta.imageType || 'image/webp'}" />
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
    const whatsapp = isWhatsApp(userAgent);
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
          image: getImageUrl(null, whatsapp),
          url: SITE_URL,
          imageType: whatsapp ? 'image/jpeg' : 'image/webp',
        }, bot),
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
          image: getImageUrl(null, whatsapp),
          url: SITE_URL,
          imageType: whatsapp ? 'image/jpeg' : 'image/webp',
        }, bot),
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
        image: getImageUrl(post.thumbnail_url, whatsapp),
        url: articleUrl,
        publishedTime: post.published_at ?? undefined,
        imageType: whatsapp ? 'image/jpeg' : 'image/webp',
      }, bot),
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
    const catchUa = req.headers.get('user-agent') || '';
    const catchBot = isBot(catchUa);
    const catchWhatsApp = isWhatsApp(catchUa);
    return new Response(
      buildHtml({
        title: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        image: getImageUrl(null, catchWhatsApp),
        url: SITE_URL,
        imageType: catchWhatsApp ? 'image/jpeg' : 'image/webp',
      }, catchBot),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
  }
});
