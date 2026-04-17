// Edge Function: sitemap.xml dinâmico
//
// Gera o sitemap em tempo real consultando o banco. Cache HTTP de 1h.
//
// Para adicionar novas rotas institucionais, edite a constante INSTITUTIONAL_URLS abaixo.
//
// Roteamento em produção:
//   GET https://subhumano.ia.br/sitemap.xml
//   → Cloudflare Worker faz proxy para esta função:
//     https://akkbfzfjappludgsrwsw.supabase.co/functions/v1/sitemap

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://subhumano.ia.br";

// Rotas institucionais fixas (sempre presentes no topo do sitemap)
const INSTITUTIONAL_URLS = [
  "/",
  "/plans",
  "/contato",
  "/termos",
  "/privacidade",
];

// Escapa caracteres XML em slugs/URLs
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatLastmod(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function urlEntry(path: string, lastmod?: string | null): string {
  const loc = `${SITE_URL}${path}`;
  const lm = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
  return `  <url><loc>${escapeXml(loc)}</loc>${lm}</url>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Espaços ativos
    const { data: spaces } = await supabase
      .from("spaces")
      .select("slug, updated_at")
      .eq("is_active", true);

    // Artigos publicados (com slug do espaço para construir a URL canônica)
    const { data: articles } = await supabase
      .from("space_updates")
      .select("slug, updated_at, spaces:space_id(slug)")
      .eq("is_published", true)
      .order("updated_at", { ascending: false });

    // Podcasts publicados
    const { data: podcasts } = await supabase
      .from("podcasts")
      .select("slug, updated_at")
      .eq("is_published", true);

    // Eventos publicados e ativos
    const { data: events } = await supabase
      .from("events")
      .select("slug, updated_at")
      .eq("is_published", true)
      .eq("is_active", true);

    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );

    // Institucionais
    for (const path of INSTITUTIONAL_URLS) {
      lines.push(urlEntry(path));
    }

    // Espaços (listagens)
    for (const s of spaces ?? []) {
      if (!s.slug) continue;
      lines.push(urlEntry(`/spaces/${s.slug}`, formatLastmod(s.updated_at)));
    }

    // Artigos
    for (const a of articles ?? []) {
      const spaceSlug = (a as any).spaces?.slug;
      if (!a.slug || !spaceSlug) continue;
      lines.push(
        urlEntry(
          `/spaces/${spaceSlug}/post/${a.slug}`,
          formatLastmod(a.updated_at),
        ),
      );
    }

    // Podcasts
    for (const p of podcasts ?? []) {
      if (!p.slug) continue;
      lines.push(
        urlEntry(`/podcasts/${p.slug}`, formatLastmod(p.updated_at)),
      );
    }

    // Eventos
    for (const e of events ?? []) {
      if (!e.slug) continue;
      lines.push(urlEntry(`/events/${e.slug}`, formatLastmod(e.updated_at)));
    }

    lines.push("</urlset>");

    const xml = lines.join("\n");

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[sitemap] error:", err);

    // Fallback mínimo: ainda retorna XML válido só com institucionais
    const fallback = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...INSTITUTIONAL_URLS.map((p) => urlEntry(p)),
      "</urlset>",
    ].join("\n");

    return new Response(fallback, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }
});
