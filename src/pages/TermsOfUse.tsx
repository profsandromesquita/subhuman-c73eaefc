import { PublicPageLayout } from "@/components/PublicPageLayout";
import { SEO } from "@/components/SEO";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const sections = [
  {
    id: "aceitacao",
    title: "1. Aceitação dos Termos",
    content:
      "Ao acessar ou utilizar a plataforma Subhumano, você concorda com estes Termos de Uso em sua totalidade. Caso não concorde com qualquer disposição, você não deve utilizar os serviços. O uso continuado da plataforma após alterações nos termos constitui aceitação das modificações.",
  },
  {
    id: "servico",
    title: "2. Descrição do Serviço",
    content:
      "O Subhumano é uma plataforma de curadoria de conteúdo sobre Inteligência Artificial, mantida pelo ITIA — Instituto de Tecnologia e Inteligência Artificial (CNPJ: 58.246.571/0001-90). O serviço inclui: Espaços temáticos com atualizações curadas sobre IA; Canais de comunidade para interação entre membros; Podcasts exclusivos sobre tecnologia e IA; Assistente de IA para consultas personalizadas; e Eventos online e presenciais.",
  },
  {
    id: "cadastro",
    title: "3. Cadastro e Conta do Usuário",
    content:
      "Para utilizar a plataforma, é necessário criar uma conta com informações verídicas. Você é responsável por manter a confidencialidade de suas credenciais de acesso. Cada conta é pessoal e intransferível. O ITIA reserva-se o direito de suspender ou encerrar contas que violem estes termos ou que apresentem informações falsas.",
  },
  {
    id: "pagamentos",
    title: "4. Assinatura e Pagamentos",
    content:
      "O acesso à plataforma requer uma assinatura paga. Os pagamentos são processados pela Ticto, nosso gateway de pagamento parceiro. Ao realizar uma assinatura, você concorda com os termos de pagamento da Ticto. Os planos disponíveis, valores e condições são apresentados na página de planos. Cupons promocionais podem ser oferecidos a critério do ITIA e possuem regras específicas de validade e uso.",
  },
  {
    id: "propriedade",
    title: "5. Propriedade Intelectual",
    content:
      "Todo o conteúdo publicado nos Espaços temáticos, podcasts e materiais educativos é de propriedade do ITIA ou de seus autores licenciados. É proibida a reprodução, distribuição ou comercialização do conteúdo sem autorização prévia por escrito. O conteúdo gerado por usuários nos Canais da comunidade permanece de propriedade de seus respectivos autores, porém ao publicá-lo na plataforma, o usuário concede ao ITIA uma licença não exclusiva para exibição e moderação.",
  },
  {
    id: "conduta",
    title: "6. Regras de Conduta na Comunidade",
    content:
      "Nos Canais da comunidade, os usuários devem: manter o respeito e a cordialidade nas interações; não publicar conteúdo ilegal, ofensivo, discriminatório ou que viole direitos de terceiros; não fazer spam, autopromoção excessiva ou publicidade não autorizada; não compartilhar informações pessoais de outros usuários sem consentimento. Publicações que violem estas regras poderão ser removidas e os autores poderão ter suas contas suspensas. A moderação é realizada pela equipe do ITIA.",
  },
  {
    id: "ia",
    title: "7. Uso do Assistente de IA",
    content:
      "O Assistente de IA é uma ferramenta de apoio que fornece respostas baseadas em sua base de conhecimento. As respostas geradas pela IA são informativas e não constituem aconselhamento profissional, jurídico, financeiro ou técnico definitivo. O ITIA não se responsabiliza por decisões tomadas com base exclusiva nas respostas do assistente. O uso do assistente está sujeito aos limites do plano contratado.",
  },
  {
    id: "responsabilidade",
    title: "8. Limitação de Responsabilidade",
    content:
      "O ITIA emprega esforços razoáveis para manter a plataforma disponível e o conteúdo atualizado, mas não garante disponibilidade ininterrupta ou ausência de erros. O ITIA não se responsabiliza por: danos indiretos, incidentais ou consequenciais decorrentes do uso da plataforma; conteúdo publicado por terceiros nos Canais da comunidade; indisponibilidade temporária dos serviços por motivos técnicos ou de manutenção; e perdas decorrentes de uso indevido das credenciais pelo usuário.",
  },
  {
    id: "cancelamento",
    title: "9. Cancelamento e Encerramento",
    content:
      "O usuário pode cancelar sua assinatura a qualquer momento. Após o cancelamento, o acesso permanece ativo até o final do período já pago. Não há reembolso proporcional por períodos não utilizados, salvo disposição legal em contrário. O ITIA pode encerrar ou suspender o acesso de usuários que violem estes termos, sem direito a reembolso.",
  },
  {
    id: "alteracoes",
    title: "10. Alterações nos Termos",
    content:
      "O ITIA reserva-se o direito de alterar estes Termos de Uso a qualquer momento. As alterações serão comunicadas através da plataforma e/ou por e-mail. O uso continuado da plataforma após a comunicação das alterações constitui aceitação dos novos termos.",
  },
  {
    id: "foro",
    title: "11. Foro e Legislação Aplicável",
    content:
      "Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de Fortaleza, Estado do Ceará, para dirimir quaisquer controvérsias decorrentes destes termos, com renúncia a qualquer outro, por mais privilegiado que seja.",
  },
  {
    id: "contato",
    title: "12. Contato",
    content:
      "Para dúvidas, sugestões ou solicitações relacionadas a estes Termos de Uso, entre em contato: Prof. Sandro Mesquita — Presidente do ITIA. E-mail: sandro.mesquita@itia.org.br. WhatsApp: (85) 98818-2453.",
  },
];

export default function TermsOfUse() {
  return (
    <PublicPageLayout>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Termos de Uso</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Última atualização: 26 de fevereiro de 2026
      </p>

      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed mb-8">
        <p>
          Bem-vindo ao Subhumano. Estes Termos de Uso regulam o acesso e a utilização da
          plataforma Subhumano, operada pelo ITIA — Instituto de Tecnologia e Inteligência
          Artificial (CNPJ: 58.246.571/0001-90). Ao utilizar nossos serviços, você declara ter
          lido, compreendido e concordado com os termos aqui descritos.
        </p>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {sections.map((section) => (
          <AccordionItem
            key={section.id}
            value={section.id}
            className="border border-border rounded-xl px-4 bg-card"
          >
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline">
              {section.title}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              {section.content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </PublicPageLayout>
  );
}
