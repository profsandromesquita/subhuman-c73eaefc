import { PublicPageLayout } from "@/components/PublicPageLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function PrivacyPolicy() {
  return (
    <PublicPageLayout>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Política de Privacidade</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Última atualização: 20 de fevereiro de 2026
      </p>

      <p className="text-muted-foreground mb-8 leading-relaxed">
        Esta Política de Privacidade descreve como o <strong className="text-foreground">Subhumano</strong> coleta, 
        utiliza, armazena e protege os dados pessoais dos seus usuários, em conformidade com a 
        Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).
      </p>

      <Accordion type="multiple" className="space-y-2">
        {/* 1. Identificação */}
        <AccordionItem value="identificacao" className="border border-border rounded-xl px-4 bg-card">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            1. Identificação da Empresa Responsável
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-3">
            <p>
              O <strong className="text-foreground">Subhumano</strong> é uma plataforma de curadoria de conteúdo 
              sobre Inteligência Artificial, mantida e operada pelo:
            </p>
            <div className="bg-background rounded-lg p-4 space-y-1 text-sm">
              <p className="text-foreground font-semibold">ITIA — Instituto de Tecnologia e Inteligência Artificial</p>
              <p>CNPJ: 58.246.571/0001-90</p>
              <p>Responsável: Prof. Msc. Sandro Mesquita — Presidente</p>
              <p>Telefone: (85) 98818-2453</p>
              <p>E-mail: sandro.mesquita@itia.org.br</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Dados Coletados */}
        <AccordionItem value="dados-coletados" className="border border-border rounded-xl px-4 bg-card">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            2. Quais Dados São Coletados
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-4">
            <p>Coletamos os seguintes dados pessoais, de acordo com a finalidade de cada interação:</p>
            <div className="space-y-3">
              <div>
                <h4 className="text-foreground font-medium text-sm mb-1">Cadastro e Autenticação</h4>
                <p className="text-sm">Nome completo, endereço de e-mail, senha (armazenada em hash criptográfico) e avatar. Caso opte pelo login social, recebemos os dados públicos da conta Google (nome e e-mail).</p>
              </div>
              <div>
                <h4 className="text-foreground font-medium text-sm mb-1">Perfil Pessoal</h4>
                <p className="text-sm">Cidade, estado, tipo de ocupação, empresa, cargo, indústria de atuação, formação acadêmica, habilidades, hobbies, biografia, nível de experiência com IA e objetivos pessoais.</p>
              </div>
              <div>
                <h4 className="text-foreground font-medium text-sm mb-1">Perfil Empresarial (opcional)</h4>
                <p className="text-sm">CNPJ, nome da empresa, website, descrição e links de redes sociais (Instagram, LinkedIn).</p>
              </div>
              <div>
                <h4 className="text-foreground font-medium text-sm mb-1">Dados de Pagamento</h4>
                <p className="text-sm">Os dados de pagamento (cartão de crédito, PIX, etc.) são processados exclusivamente pelo gateway de pagamento Ticto. O Subhumano não armazena dados financeiros sensíveis em seus servidores.</p>
              </div>
              <div>
                <h4 className="text-foreground font-medium text-sm mb-1">Dados de Uso da Plataforma</h4>
                <p className="text-sm">Interações com o assistente de IA (perguntas realizadas), publicações e comentários nos canais da comunidade, conteúdos salvos, preferências de notificação e dados de navegação.</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Finalidade */}
        <AccordionItem value="finalidade" className="border border-border rounded-xl px-4 bg-card">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            3. Para Que os Dados São Usados
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-2">
            <p>Os dados pessoais coletados são utilizados para as seguintes finalidades:</p>
            <ul className="list-disc list-inside space-y-2 text-sm ml-2">
              <li><strong className="text-foreground">Personalização da experiência:</strong> adaptar o conteúdo, recomendações e funcionalidades da plataforma ao perfil e interesses de cada usuário.</li>
              <li><strong className="text-foreground">Comunicação:</strong> enviar notificações sobre atualizações de espaços, novos conteúdos, comentários e menções.</li>
              <li><strong className="text-foreground">Marketing:</strong> enviar e-mails promocionais e informativos, somente mediante consentimento prévio do usuário, que pode ser revogado a qualquer momento.</li>
              <li><strong className="text-foreground">Análise e melhoria:</strong> analisar padrões de uso para aprimorar a qualidade dos conteúdos, funcionalidades e desempenho da plataforma.</li>
              <li><strong className="text-foreground">Inteligência de conteúdo:</strong> utilizar dados agregados e anonimizados para identificar lacunas de conhecimento e gerar sugestões de novos conteúdos.</li>
              <li><strong className="text-foreground">Cumprimento de obrigações legais:</strong> atender exigências regulatórias, fiscais e judiciais aplicáveis.</li>
              <li><strong className="text-foreground">Segurança:</strong> prevenir fraudes, acessos não autorizados e garantir a integridade da plataforma.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Compartilhamento */}
        <AccordionItem value="compartilhamento" className="border border-border rounded-xl px-4 bg-card">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            4. Com Quem os Dados São Compartilhados
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-3">
            <p>Os dados pessoais podem ser compartilhados com os seguintes terceiros, exclusivamente para os fins descritos nesta política:</p>
            <ul className="list-disc list-inside space-y-2 text-sm ml-2">
              <li><strong className="text-foreground">ITIA — Instituto de Tecnologia e Inteligência Artificial:</strong> empresa responsável por todo o ecossistema Subhumano, incluindo operações administrativas, suporte e desenvolvimento.</li>
              <li><strong className="text-foreground">Processadores de pagamento (Ticto):</strong> para viabilizar transações de assinatura e compra de eventos.</li>
              <li><strong className="text-foreground">Plataformas de publicidade (Meta/Facebook):</strong> dados anonimizados ou pseudonimizados para fins de remarketing e otimização de campanhas publicitárias, conforme consentimento do usuário.</li>
              <li><strong className="text-foreground">Provedores de infraestrutura:</strong> serviços de hospedagem e banco de dados para garantir o funcionamento seguro da plataforma.</li>
            </ul>
            <p className="text-sm">Não vendemos, alugamos ou cedemos dados pessoais para terceiros com finalidades diferentes das aqui descritas.</p>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Segurança */}
        <AccordionItem value="seguranca" className="border border-border rounded-xl px-4 bg-card">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            5. Como os Dados São Protegidos
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-2">
            <p>Adotamos medidas técnicas e organizacionais para proteger os dados pessoais dos nossos usuários:</p>
            <ul className="list-disc list-inside space-y-2 text-sm ml-2">
              <li><strong className="text-foreground">Criptografia:</strong> todas as comunicações são protegidas por HTTPS/TLS. Senhas são armazenadas com hash criptográfico unidirecional (bcrypt).</li>
              <li><strong className="text-foreground">Controle de acesso:</strong> políticas de segurança em nível de linha (Row Level Security) garantem que cada usuário acesse apenas seus próprios dados.</li>
              <li><strong className="text-foreground">Autenticação segura:</strong> utilizamos tokens JWT (JSON Web Tokens) com expiração automática e suporte a autenticação multifator.</li>
              <li><strong className="text-foreground">Acesso restrito:</strong> apenas pessoal autorizado do ITIA tem acesso aos dados, mediante autenticação administrativa com permissões granulares.</li>
              <li><strong className="text-foreground">Monitoramento:</strong> logs de acesso e atividades são mantidos para auditoria e detecção de atividades suspeitas.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* 6. Direitos LGPD */}
        <AccordionItem value="direitos" className="border border-border rounded-xl px-4 bg-card">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            6. Direitos dos Usuários (LGPD)
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-3">
            <p>Em conformidade com a LGPD, você possui os seguintes direitos sobre seus dados pessoais:</p>
            <ul className="list-disc list-inside space-y-2 text-sm ml-2">
              <li><strong className="text-foreground">Acesso:</strong> solicitar uma cópia dos dados pessoais que possuímos sobre você.</li>
              <li><strong className="text-foreground">Correção:</strong> solicitar a atualização ou correção de dados incompletos, inexatos ou desatualizados.</li>
              <li><strong className="text-foreground">Exclusão:</strong> solicitar a eliminação dos seus dados pessoais, exceto quando houver obrigação legal de retenção.</li>
              <li><strong className="text-foreground">Portabilidade:</strong> solicitar a transferência dos seus dados a outro fornecedor de serviço.</li>
              <li><strong className="text-foreground">Revogação de consentimento:</strong> retirar o consentimento previamente concedido para o tratamento dos seus dados, a qualquer momento.</li>
              <li><strong className="text-foreground">Oposição:</strong> opor-se ao tratamento de dados pessoais quando realizado com base em interesse legítimo.</li>
              <li><strong className="text-foreground">Informação:</strong> ser informado sobre as entidades públicas e privadas com as quais compartilhamos seus dados.</li>
            </ul>
            <p className="text-sm">
              Para exercer qualquer um desses direitos, entre em contato pelo e-mail{" "}
              <a href="mailto:sandro.mesquita@itia.org.br" className="text-foreground underline">
                sandro.mesquita@itia.org.br
              </a>{" "}
              ou pelo telefone (85) 98818-2453. Responderemos em até 15 dias úteis.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* 7. Cookies */}
        <AccordionItem value="cookies" className="border border-border rounded-xl px-4 bg-card">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            7. Uso de Cookies e Tecnologias Semelhantes
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-3">
            <p>O Subhumano utiliza cookies e tecnologias semelhantes para melhorar a experiência do usuário:</p>
            <ul className="list-disc list-inside space-y-2 text-sm ml-2">
              <li><strong className="text-foreground">Cookies essenciais:</strong> necessários para o funcionamento da plataforma, como manutenção de sessão de login e preferências de idioma.</li>
              <li><strong className="text-foreground">Cookies de análise:</strong> utilizados para entender como os usuários interagem com a plataforma, permitindo melhorias contínuas.</li>
              <li><strong className="text-foreground">Cookies de publicidade:</strong> utilizados por parceiros como a Meta (Facebook/Instagram) para exibir anúncios relevantes com base nos seus interesses, mediante consentimento.</li>
            </ul>
            <p className="text-sm">
              Você pode gerenciar ou desativar cookies nas configurações do seu navegador. 
              Note que a desativação de cookies essenciais pode comprometer o funcionamento da plataforma.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* 8. Retenção */}
        <AccordionItem value="retencao" className="border border-border rounded-xl px-4 bg-card">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            8. Período de Retenção dos Dados
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-2">
            <p>Os dados pessoais são retidos de acordo com os seguintes critérios:</p>
            <ul className="list-disc list-inside space-y-2 text-sm ml-2">
              <li><strong className="text-foreground">Conta ativa:</strong> enquanto o usuário mantiver sua conta ativa na plataforma, os dados serão armazenados para prestação do serviço.</li>
              <li><strong className="text-foreground">Após exclusão da conta:</strong> os dados serão eliminados em até 30 dias, exceto aqueles necessários para cumprimento de obrigações legais, fiscais ou regulatórias.</li>
              <li><strong className="text-foreground">Obrigações legais:</strong> determinados dados poderão ser mantidos por até 5 anos após o encerramento da conta, conforme exigências legais aplicáveis.</li>
              <li><strong className="text-foreground">Dados anonimizados:</strong> dados agregados e anonimizados podem ser mantidos indefinidamente para fins estatísticos e de melhoria do serviço.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* 9. Contato */}
        <AccordionItem value="contato" className="border border-border rounded-xl px-4 bg-card">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            9. Contato para Dúvidas
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed space-y-3">
            <p>
              Para dúvidas, solicitações ou reclamações relacionadas a esta Política de Privacidade 
              ou ao tratamento dos seus dados pessoais, entre em contato:
            </p>
            <div className="bg-background rounded-lg p-4 space-y-1 text-sm">
              <p className="text-foreground font-semibold">Encarregado de Proteção de Dados (DPO)</p>
              <p>Prof. Msc. Sandro Mesquita</p>
              <p>
                E-mail:{" "}
                <a href="mailto:sandro.mesquita@itia.org.br" className="text-foreground underline">
                  sandro.mesquita@itia.org.br
                </a>
              </p>
              <p>Telefone: (85) 98818-2453</p>
            </div>
            <p className="text-sm">
              Caso não obtenha uma resposta satisfatória, você poderá apresentar reclamação à 
              Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </PublicPageLayout>
  );
}
