import { Helmet } from "react-helmet-async";
import { SITE_URL, SITE_NAME, SITE_OG_IMAGE } from "@/lib/constants/site";

interface SEOProps {
  title: string;
  description: string;
  /**
   * Path relativo iniciado por "/", ex: "/plans". Para home use "/".
   * Usado para derivar canonical/ogUrl quando estes não são passados explicitamente.
   * Opcional se `canonical` for fornecido.
   */
  path?: string;
  /** URL canônica absoluta. Sobrescreve `path` se fornecida. */
  canonical?: string;
  /**
   * Conteúdo cru de meta robots, ex: "noindex,follow".
   * Sobrescreve as flags noindex/nofollow.
   */
  robots?: string;
  noindex?: boolean;
  nofollow?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogImage?: string;
  ogType?: "website" | "article";
}

export function SEO({
  title,
  description,
  path,
  canonical,
  robots,
  noindex = false,
  nofollow = false,
  ogTitle,
  ogDescription,
  ogUrl,
  ogImage = SITE_OG_IMAGE,
  ogType = "website",
}: SEOProps) {
  const resolvedCanonical =
    canonical ?? (path ? `${SITE_URL}${path}` : SITE_URL);
  const resolvedOgUrl = ogUrl ?? resolvedCanonical;
  const resolvedOgTitle = ogTitle ?? title;
  const resolvedOgDescription = ogDescription ?? description;

  let robotsContent: string | null = null;
  if (robots) {
    robotsContent = robots;
  } else {
    const parts: string[] = [];
    if (noindex) parts.push("noindex");
    if (nofollow) parts.push("nofollow");
    if (parts.length > 0) {
      // Quando noindex sem nofollow explícito, garantimos follow
      robotsContent =
        parts.join(",") + (noindex && !nofollow ? ",follow" : "");
    }
    // Quando indexável, omitimos a meta robots para deixar o default (index,follow)
  }

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={resolvedCanonical} />
      {robotsContent && <meta name="robots" content={robotsContent} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={resolvedOgUrl} />
      <meta property="og:title" content={resolvedOgTitle} />
      <meta property="og:description" content={resolvedOgDescription} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedOgTitle} />
      <meta name="twitter:description" content={resolvedOgDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}

// Alias requisitado pelo plano de SEO por rota
export const SEOHead = SEO;
