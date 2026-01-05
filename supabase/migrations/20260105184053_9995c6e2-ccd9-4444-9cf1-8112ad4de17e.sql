-- Limpar espaços e publicações existentes
DELETE FROM public.space_updates;
DELETE FROM public.spaces;

-- Inserir os 5 espaços temáticos
INSERT INTO public.spaces (id, slug, name, description, icon, is_active, sort_order)
VALUES 
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'produtividade', 'Produtividade Pessoal', 'Dicas e estratégias para maximizar sua produtividade e organização pessoal', 'Brain', true, 1),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'marketing', 'Marketing e Vendas', 'Estratégias de marketing digital, vendas e crescimento de negócios', 'Megaphone', true, 2),
  ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'programacao', 'Programação e Automação', 'Tutoriais de programação, automação e ferramentas de desenvolvimento', 'Code', true, 3),
  ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'audiovisual', 'AudioVisual', 'Criação de conteúdo em vídeo, áudio e produção multimídia', 'FilmStrip', true, 4),
  ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'estilo-vida', 'Estilo de Vida', 'Bem-estar, hábitos saudáveis e equilíbrio na vida pessoal e profissional', 'Heart', true, 5);

-- Publicações: Produtividade Pessoal
INSERT INTO public.space_updates (space_id, title, content, is_published, published_at, thumbnail_url, media_type)
VALUES 
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Como organizar seu dia com time-blocking para máxima produtividade', 
   'O time-blocking é uma técnica poderosa que pode transformar sua produtividade. Em vez de manter uma lista interminável de tarefas, você aloca blocos específicos de tempo para cada atividade. Isso reduz a fadiga de decisão e aumenta o foco.

## Por que funciona?

Quando você define horários específicos para cada tarefa, seu cérebro entra em modo de execução ao invés de modo de planejamento. Estudos mostram que pessoas que usam time-blocking são 40% mais produtivas.

## Como implementar

1. **Identifique suas tarefas principais** - Liste tudo que precisa fazer na semana
2. **Estime o tempo necessário** - Seja realista, adicione buffer de 25%
3. **Aloque blocos no calendário** - Trate como compromissos inegociáveis
4. **Respeite os intervalos** - Pausas são essenciais para manter a energia

O segredo está na consistência. Comece com blocos de 25-30 minutos e ajuste conforme sua necessidade.', 
   true, NOW() - INTERVAL '2 hours', 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=400&fit=crop', 'image'),
   
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '5 ferramentas de IA que vão revolucionar sua rotina de trabalho',
   'A inteligência artificial está transformando a forma como trabalhamos. Aqui estão 5 ferramentas que você precisa conhecer para aumentar sua produtividade em 2026.

## 1. Assistentes de Escrita com IA

Ferramentas como Claude e GPT revolucionaram a criação de conteúdo. Use para rascunhos, revisão e brainstorming.

## 2. Automação de Tarefas Repetitivas

Plataformas como n8n e Make permitem criar fluxos automatizados sem código. Economize horas por semana.

## 3. Transcrição e Resumo de Reuniões

IA pode transcrever e resumir reuniões automaticamente, gerando action items e follow-ups.

## 4. Organização Visual com IA

Ferramentas de design com IA ajudam a criar apresentações e documentos profissionais em minutos.

## 5. Análise de Dados Simplificada

Converse com seus dados usando linguagem natural e obtenha insights instantâneos.

O futuro do trabalho é híbrido: humanos + IA trabalhando juntos de forma inteligente.',
   true, NOW() - INTERVAL '1 day', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=400&fit=crop', 'image');

-- Publicações: Marketing e Vendas
INSERT INTO public.space_updates (space_id, title, content, is_published, published_at, thumbnail_url, media_type)
VALUES 
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'O poder do storytelling nas vendas: como contar histórias que convertem',
   'Histórias vendem. É cientificamente comprovado que nosso cérebro processa narrativas de forma diferente de dados puros. Quando você conta uma história, ativa áreas do cérebro do ouvinte que criam conexão emocional.

## A estrutura do storytelling de vendas

### 1. O Herói (seu cliente)
Seu cliente é o protagonista, não você ou seu produto. Mostre que você entende os desafios dele.

### 2. O Problema
Apresente o obstáculo de forma empática. Use exemplos reais que ressoem com a audiência.

### 3. A Jornada
Como seu produto/serviço ajuda na transformação? Mostre o processo, não apenas o resultado.

### 4. A Vitória
Resultados tangíveis. Use números, depoimentos e casos de sucesso.

## Dica de ouro

Colete histórias dos seus clientes atuais. Elas são mais poderosas do que qualquer pitch que você possa criar.',
   true, NOW() - INTERVAL '5 hours', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop', 'image'),

  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Tendências de marketing digital para 2026',
   'O marketing digital evolui rapidamente. Aqui estão as tendências que vão dominar 2026.

## 1. IA Generativa em Escala

Não é mais sobre SE usar IA, mas COMO usar de forma estratégica. Personalização em tempo real será o diferencial.

## 2. Vídeos Curtos Continuam Dominando

TikTok, Reels e Shorts não são modinha. São o novo padrão de consumo de conteúdo.

## 3. Comunidades > Seguidores

Audiência engajada vale mais que números grandes. Foque em criar comunidades ativas.

## 4. Search Everywhere

SEO não é só Google. Otimize para TikTok, YouTube, IA e assistentes de voz.

## 5. Autenticidade Acima de Tudo

Consumidores detectam conteúdo fake facilmente. Seja genuíno, mostre bastidores, admita erros.

A chave é adaptar-se rapidamente mantendo sua essência de marca.',
   true, NOW() - INTERVAL '3 days', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop', 'image');

-- Publicações: Programação e Automação
INSERT INTO public.space_updates (space_id, title, content, is_published, published_at, thumbnail_url, media_type)
VALUES 
  ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Automatizando tarefas repetitivas com n8n e Make',
   'Se você faz a mesma tarefa mais de 3 vezes por semana, provavelmente pode automatizá-la. Ferramentas no-code como n8n e Make tornam isso acessível para qualquer pessoa.

## Casos de uso práticos

### 1. Integração de Formulários
Conecte Google Forms com Notion, Slack e email automaticamente.

### 2. Social Media Automation
Publique conteúdo em múltiplas plataformas a partir de um único lugar.

### 3. Relatórios Automáticos
Compile dados de diferentes fontes e envie resumos diários/semanais.

### 4. Backup Automático
Sincronize arquivos entre serviços de cloud automaticamente.

## n8n vs Make

**n8n**: Mais técnico, self-hosted, gratuito para uso pessoal
**Make**: Interface amigável, mais conectores nativos, plano grátis limitado

## Por onde começar?

1. Liste suas tarefas repetitivas
2. Escolha a mais simples para automatizar
3. Crie um fluxo básico
4. Itere e expanda

A automação libera seu tempo para o que realmente importa.',
   true, NOW() - INTERVAL '8 hours', 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=400&fit=crop', 'image'),

  ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Introdução ao vibe coding: programando com assistentes de IA',
   'Vibe coding é o termo da moda para descrever programação assistida por IA. Mas como usar isso de forma eficiente?

## O que é Vibe Coding?

É programar em colaboração com assistentes de IA como Cursor, Copilot ou Claude. Você descreve o que quer, a IA sugere código, você refina.

## Boas práticas

### 1. Seja específico nos prompts
"Crie uma função" é vago. "Crie uma função TypeScript que valide emails usando regex e retorne boolean" é útil.

### 2. Revise SEMPRE
IA erra. Não aceite código cegamente. Entenda o que foi gerado.

### 3. Use para aprender
Peça explicações. "Por que você usou reduce ao invés de for?" Aproveite para expandir seu conhecimento.

### 4. Itere rapidamente
O poder está na velocidade de iteração. Gere, teste, refine, repita.

## Limitações

- IA não conhece seu contexto específico
- Código pode ter bugs sutis
- Dependências podem estar desatualizadas

Vibe coding é uma ferramenta, não um substituto para fundamentos sólidos de programação.',
   true, NOW() - INTERVAL '2 days', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=400&fit=crop', 'video');

-- Publicações: AudioVisual
INSERT INTO public.space_updates (space_id, title, content, is_published, published_at, thumbnail_url, media_type)
VALUES 
  ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'Como criar vídeos profissionais com ferramentas de IA',
   'Criar vídeos de qualidade profissional nunca foi tão acessível. Com IA, você pode produzir conteúdo incrível mesmo sem equipamento caro.

## Ferramentas Essenciais

### Roteiro e Ideação
Use IA para gerar roteiros, outlines e hooks. Forneça contexto sobre seu público e objetivo.

### Geração de B-Roll
Ferramentas como Runway e Pika geram clipes de vídeo a partir de texto ou imagens.

### Edição Automatizada
IA pode cortar silêncios, adicionar legendas e ajustar cores automaticamente.

### Voice-over e Dublagem
Clone sua voz ou use vozes sintéticas realistas para narração.

## Workflow Otimizado

1. **Planejamento** - Defina objetivo, público e formato
2. **Roteiro** - Use IA para estruturar ideias
3. **Gravação** - Foque no conteúdo, não na perfeição técnica
4. **Edição com IA** - Automatize tarefas repetitivas
5. **Legendas** - Essencial para engajamento

## Dica Final

Qualidade de áudio > qualidade de vídeo. Invista em um bom microfone antes de câmera cara.',
   true, NOW() - INTERVAL '12 hours', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400&h=400&fit=crop', 'video'),

  ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'O futuro da edição de vídeo: IA gerativa em ação',
   'A edição de vídeo está passando pela maior transformação desde a digitalização. IA gerativa permite coisas que pareciam ficção científica há poucos anos.

## O que já é possível

### Extensão de Clipes
Expanda um vídeo de 5 segundos para 15 mantendo coerência visual.

### Remoção de Objetos
Apague elementos indesejados do vídeo como se nunca existissem.

### Mudança de Estilo
Transforme vídeos em animação, pixel art ou outros estilos visuais.

### Geração de Cenas
Crie cenas completas a partir de descrições textuais.

## Implicações para Criadores

- **Produtividade**: Edições que levavam horas agora levam minutos
- **Criatividade**: Menos limitações técnicas, mais foco na ideia
- **Acessibilidade**: Qualquer pessoa pode criar conteúdo profissional

## Considerações Éticas

Com grande poder vem grande responsabilidade. Deepfakes e manipulação são preocupações reais. Use estas ferramentas de forma ética e transparente.

O futuro da criação de conteúdo é híbrido: criatividade humana potencializada por IA.',
   true, NOW() - INTERVAL '4 days', 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=400&fit=crop', 'image');

-- Publicações: Estilo de Vida
INSERT INTO public.space_updates (space_id, title, content, is_published, published_at, thumbnail_url, media_type)
VALUES 
  ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Equilibrando produtividade e bem-estar na era digital',
   'Vivemos conectados 24/7, mas a que custo? O equilíbrio entre alta performance e saúde mental é o grande desafio da nossa geração.

## Sinais de Alerta

- Verificar email antes de levantar da cama
- Dificuldade em desconectar nos finais de semana
- Sensação constante de estar "atrasado"
- Burnout recorrente

## Estratégias Práticas

### 1. Defina Limites Claros
Horário de trabalho é horário de trabalho. Notificações fora do expediente? Desligadas.

### 2. Digital Detox Semanal
Reserve algumas horas por semana completamente offline. Seu cérebro precisa descansar.

### 3. Movimento é Prioridade
30 minutos de exercício valem mais que 30 minutos extras de trabalho. É matemática de energia.

### 4. Sono Não é Negociável
8 horas de sono consistentes melhoram performance mais que qualquer hack de produtividade.

## Mindset Shift

Produtividade sustentável > produtividade explosiva. Maratonistas ganham a longo prazo.',
   true, NOW() - INTERVAL '6 hours', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=400&fit=crop', 'image'),

  ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Hábitos matinais dos profissionais de alta performance',
   'Como você começa o dia define como termina. Estudamos as rotinas matinais de CEOs, atletas e criadores de sucesso.

## Padrões Comuns

### Acordar Cedo (mas com qualidade de sono)
Não é sobre acordar às 5h, é sobre ter tempo antes das obrigações. Ajuste ao seu cronótipo.

### Sem Telas nos Primeiros 30 Minutos
Redes sociais e emails podem esperar. Use este tempo para você.

### Movimento Físico
Pode ser yoga, corrida ou alongamento. O importante é ativar o corpo.

### Hidratação e Nutrição
Água antes de café. Café da manhã rico em proteína para energia sustentada.

### Planejamento Intencional
Revise suas 3 prioridades do dia. Saiba exatamente o que precisa acontecer.

## Minha Rotina (exemplo)

6:00 - Acordar, água com limão
6:15 - Meditação 10min
6:30 - Exercício 30min
7:00 - Banho e café da manhã
7:30 - Journaling e planejamento
8:00 - Início do trabalho focado

Adapte ao seu estilo. Consistência > perfeição.',
   true, NOW() - INTERVAL '5 days', 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=400&h=400&fit=crop', 'image');