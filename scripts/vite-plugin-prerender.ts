import { promises as fs } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { PRERENDER_ROUTES, SITE_URL, SITE_NAME, SITE_OG_IMAGE, type PrerenderRoute } from "./prerender-routes";

/**
 * Escapa entidades HTML em valores que vão para atributos/contents de meta tags.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Constrói o bloco de meta tags SEO específico de uma rota.
 * Inclui description, canonical, robots (opcional), og:* e twitter:*.
 */
function buildHeadTags(route: PrerenderRoute): string {
  const canonical = `${SITE_URL}${route.path === "/" ? "/" : route.path}`;
  const tags: string[] = [];

  tags.push(`<meta name="description" content="${escapeHtml(route.description)}" data-rh="true" />`);
  tags.push(`<link rel="canonical" href="${escapeHtml(canonical)}" data-rh="true" />`);

  if (route.robots) {
    tags.push(`<meta name="robots" content="${escapeHtml(route.robots)}" data-rh="true" />`);
  }

  // Open Graph
  tags.push(`<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" data-rh="true" />`);
  tags.push(`<meta property="og:type" content="${escapeHtml(route.ogType)}" data-rh="true" />`);
  tags.push(`<meta property="og:url" content="${escapeHtml(canonical)}" data-rh="true" />`);
  tags.push(`<meta property="og:title" content="${escapeHtml(route.title)}" data-rh="true" />`);
  tags.push(`<meta property="og:description" content="${escapeHtml(route.description)}" data-rh="true" />`);
  tags.push(`<meta property="og:image" content="${escapeHtml(SITE_OG_IMAGE)}" data-rh="true" />`);

  // Twitter
  tags.push(`<meta name="twitter:card" content="summary_large_image" data-rh="true" />`);
  tags.push(`<meta name="twitter:title" content="${escapeHtml(route.title)}" data-rh="true" />`);
  tags.push(`<meta name="twitter:description" content="${escapeHtml(route.description)}" data-rh="true" />`);
  tags.push(`<meta name="twitter:image" content="${escapeHtml(SITE_OG_IMAGE)}" data-rh="true" />`);

  return tags.map((t) => `    ${t}`).join("\n");
}

/**
 * Aplica title + bloco SEO ao HTML template.
 * Substitui o <title>...</title> existente e injeta as meta tags antes de </head>.
 */
function injectSeoIntoHtml(template: string, route: PrerenderRoute): string {
  const headBlock = buildHeadTags(route);
  const newTitle = `<title data-rh="true">${escapeHtml(route.title)}</title>`;

  // Substitui o primeiro <title>...</title> encontrado
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, newTitle);

  // Injeta o bloco SEO imediatamente antes de </head>
  html = html.replace(/<\/head>/i, `${headBlock}\n  </head>`);

  return html;
}

/**
 * Plugin Vite que pré-renderiza HTML estático para rotas públicas no hook closeBundle.
 * Lê dist/index.html e gera dist/{rota}/index.html para cada rota da tabela.
 */
export function prerenderPlugin(): Plugin {
  return {
    name: "subhumano-prerender",
    apply: "build",
    async closeBundle() {
      const distDir = path.resolve(process.cwd(), "dist");
      const templatePath = path.join(distDir, "index.html");

      let template: string;
      try {
        template = await fs.readFile(templatePath, "utf-8");
      } catch (err) {
        this.warn(`[prerender] dist/index.html não encontrado, pulando pré-renderização: ${(err as Error).message}`);
        return;
      }

      const results: { path: string; file: string }[] = [];

      for (const route of PRERENDER_ROUTES) {
        const html = injectSeoIntoHtml(template, route);

        let outFile: string;
        if (route.path === "/") {
          // Sobrescreve a raiz
          outFile = path.join(distDir, "index.html");
        } else {
          // Cria dist/{rota}/index.html (rota sem barra inicial dupla)
          const subdir = path.join(distDir, route.path.replace(/^\//, ""));
          await fs.mkdir(subdir, { recursive: true });
          outFile = path.join(subdir, "index.html");
        }

        await fs.writeFile(outFile, html, "utf-8");
        results.push({ path: route.path, file: path.relative(distDir, outFile) });
      }

      // Log final amigável
      console.log(`\n[prerender] ${results.length} rotas pré-renderizadas:`);
      for (const r of results) {
        console.log(`  ${r.path.padEnd(15)} -> dist/${r.file}`);
      }
      console.log("");
    },
  };
}
