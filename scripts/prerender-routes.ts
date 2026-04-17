/**
 * Tabela única de rotas pré-renderizadas estaticamente no build.
 * Espelha o conteúdo SEO usado pelo componente <SEO /> no client (react-helmet-async),
 * porém é injetado fisicamente no HTML estático para que crawlers (Googlebot, etc.)
 * leiam título, descrição, canonical e robots sem executar JavaScript.
 *
 * IMPORTANTE: mantenha sincronizado com src/components/SEO.tsx e src/lib/constants/site.ts.
 */

export const SITE_URL = "https://subhumano.ia.br";
export const SITE_NAME = "Subhumano";
export const SITE_OG_IMAGE =
  "https://akkbfzfjappludgsrwsw.supabase.co/storage/v1/object/public/email-assets/ecossistema-subhumano-inteligencia-artificial-prof-sandro-mesquita.webp";

export interface PrerenderRoute {
  /** Path iniciado por "/". A home é "/". */
  path: string;
  title: string;
  description: string;
  /** Quando definido, vira `<meta name="robots" content="...">`. Quando null, omitido (default index,follow). */
  robots: string | null;
  ogType: "website" | "article";
}

export const PRERENDER_ROUTES: PrerenderRoute[] = [
  {
    path: "/",
    title: "Subhumano — Assuma o Comando da IA Sem Perder Seu Tempo",
    description:
      "Curadoria de inteligência artificial validada por especialistas. Notícias, ferramentas, comunidade e podcast para profissionais que precisam de foco, não de ruído.",
    robots: null,
    ogType: "website",
  },
  {
    path: "/plans",
    title: "Planos e Assinatura — Subhumano",
    description:
      "Escolha o plano ideal para acelerar sua jornada em IA. Mensal, anual ou vitalício — acesso a artigos, podcasts, comunidade e mentorias do Prof. Sandro Mesquita.",
    robots: null,
    ogType: "website",
  },
  {
    path: "/contato",
    title: "Contato — Subhumano",
    description:
      "Fale com a equipe Subhumano. Tire dúvidas sobre planos, parcerias, conteúdo editorial e suporte técnico da plataforma.",
    robots: null,
    ogType: "website",
  },
  {
    path: "/termos",
    title: "Termos de Uso — Subhumano",
    description:
      "Termos de uso da plataforma Subhumano: regras de utilização, responsabilidades, planos de assinatura e condições do serviço.",
    robots: null,
    ogType: "website",
  },
  {
    path: "/privacidade",
    title: "Política de Privacidade — Subhumano",
    description:
      "Política de privacidade do Subhumano: como coletamos, tratamos e protegemos seus dados pessoais, em conformidade com a LGPD.",
    robots: null,
    ogType: "website",
  },
  {
    path: "/login",
    title: "Entrar — Subhumano",
    description:
      "Acesse sua conta Subhumano e continue de onde parou: artigos, podcasts, comunidade e assistente de IA.",
    robots: "noindex,follow",
    ogType: "website",
  },
  {
    path: "/register",
    title: "Criar Conta — Subhumano",
    description:
      "Crie sua conta gratuita no Subhumano e comece a explorar o ecossistema de inteligência artificial validado por especialistas.",
    robots: "noindex,follow",
    ogType: "website",
  },
];
