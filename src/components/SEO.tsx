import { Helmet } from "react-helmet-async";
import { SITE_URL, SITE_NAME, SITE_OG_IMAGE } from "@/lib/constants/site";

interface SEOProps {
  title: string;
  description: string;
  /** Path relativo iniciado por "/", ex: "/plans". Para home use "/". */
  path: string;
  noindex?: boolean;
  nofollow?: boolean;
  ogImage?: string;
  ogType?: "website" | "article";
}

export function SEO({
  title,
  description,
  path,
  noindex = false,
  nofollow = false,
  ogImage = SITE_OG_IMAGE,
  ogType = "website",
}: SEOProps) {
  const canonical = `${SITE_URL}${path}`;
  const robotsParts: string[] = [];
  if (noindex) robotsParts.push("noindex");
  if (nofollow) robotsParts.push("nofollow");
  // Quando indexável, omitimos a meta robots para deixar o default (index,follow)
  const robotsContent =
    robotsParts.length > 0
      ? robotsParts.join(",") + (noindex && !nofollow ? ",follow" : "")
      : null;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {robotsContent && <meta name="robots" content={robotsContent} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
