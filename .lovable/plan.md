
# Plano: Expandir Página de Dados Pessoais

## Objetivo
Adicionar campos de cadastro na página `/profile/personal` para coletar informações que permitirão recomendações personalizadas de conteúdo no Subhumano.

---

## Novos Campos Propostos

### Localização
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `city` | text | Cidade do usuário |
| `state` | text | Estado brasileiro (sigla: SP, RJ, MG...) |

### Dados Profissionais
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `occupation_type` | text | Tipo de ocupação (enum: autonomo, estudante, clt, empreendedor, empresario, concursado, investidor, outro) |
| `company_name` | text | Nome da empresa atual ou anterior |
| `job_title` | text | Profissão ou cargo atual |
| `industry` | text | Área de atuação (ex: Tecnologia, Marketing, Educação) |

### Formação e Habilidades
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `education` | text | Nível de formação + área (ex: "Superior - Engenharia de Software") |
| `skills` | text[] | Array de habilidades (ex: ["Python", "Marketing Digital", "Gestão de Projetos"]) |

### Interesses e Personalização
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `hobbies` | text | Hobbies e interesses pessoais |
| `bio` | text | Mini-bio ou descrição pessoal |
| `ai_experience_level` | text | Nível de experiência com IA (iniciante, intermediario, avancado) |
| `goals` | text | Objetivo principal com IA (automação, produtividade, criação de conteúdo, etc.) |

---

## Etapas de Implementação

### Etapa 1: Migração do Banco de Dados
Adicionar novos campos à tabela `profiles`:

```sql
ALTER TABLE public.profiles
ADD COLUMN city text,
ADD COLUMN state text,
ADD COLUMN occupation_type text,
ADD COLUMN company_name text,
ADD COLUMN job_title text,
ADD COLUMN industry text,
ADD COLUMN education text,
ADD COLUMN skills text[],
ADD COLUMN hobbies text,
ADD COLUMN bio text,
ADD COLUMN ai_experience_level text,
ADD COLUMN goals text;
```

### Etapa 2: Atualizar Página PersonalData.tsx

Reorganizar a página em seções para melhor UX:

**Seção 1 - Informações Básicas** (existente)
- Nome completo
- Email (readonly)
- Membro desde (readonly)

**Seção 2 - Localização**
- Cidade (input text)
- Estado (select com todos estados BR)

**Seção 3 - Dados Profissionais**
- Tipo de ocupação (select: Autônomo, Estudante, CLT, etc.)
- Área de atuação (select: Tecnologia, Marketing, Saúde, etc.)
- Nome da empresa (input text)
- Profissão/Cargo (input text)

**Seção 4 - Formação**
- Nível de escolaridade (select: Fundamental, Médio, Superior, Pós-graduação, Mestrado, Doutorado)
- Habilidades (input com tags, separadas por vírgula)

**Seção 5 - Sobre Você**
- Bio (textarea, max 280 caracteres)
- Hobbies (input text)

**Seção 6 - Experiência com IA**
- Nível de experiência (select: Iniciante, Intermediário, Avançado)
- Objetivo principal (select: Automatizar tarefas, Aumentar produtividade, Criar conteúdo, Programar, Aprender, Outro)

---

## Constantes para os Selects

```typescript
const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  // ... todos os 27 estados
];

const OCCUPATION_TYPES = [
  { value: 'autonomo', label: 'Autônomo' },
  { value: 'estudante', label: 'Estudante' },
  { value: 'clt', label: 'CLT' },
  { value: 'empreendedor', label: 'Empreendedor' },
  { value: 'empresario', label: 'Empresário' },
  { value: 'concursado', label: 'Concursado' },
  { value: 'investidor', label: 'Investidor' },
  { value: 'aposentado', label: 'Aposentado' },
  { value: 'outro', label: 'Outro' },
];

const INDUSTRIES = [
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'marketing', label: 'Marketing e Publicidade' },
  { value: 'financas', label: 'Finanças e Investimentos' },
  { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'audiovisual', label: 'Audiovisual e Mídia' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'industria', label: 'Indústria' },
  { value: 'varejo', label: 'Varejo' },
  { value: 'outro', label: 'Outro' },
];

const EDUCATION_LEVELS = [
  { value: 'fundamental', label: 'Ensino Fundamental' },
  { value: 'medio', label: 'Ensino Médio' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'superior_incompleto', label: 'Superior Incompleto' },
  { value: 'superior', label: 'Superior Completo' },
  { value: 'pos_graduacao', label: 'Pós-graduação' },
  { value: 'mestrado', label: 'Mestrado' },
  { value: 'doutorado', label: 'Doutorado' },
];

const AI_EXPERIENCE_LEVELS = [
  { value: 'iniciante', label: 'Iniciante - Ainda estou descobrindo' },
  { value: 'intermediario', label: 'Intermediário - Uso no dia a dia' },
  { value: 'avancado', label: 'Avançado - Desenvolvo com IA' },
];

const AI_GOALS = [
  { value: 'automacao', label: 'Automatizar tarefas repetitivas' },
  { value: 'produtividade', label: 'Aumentar produtividade' },
  { value: 'conteudo', label: 'Criar conteúdo' },
  { value: 'programacao', label: 'Programar e desenvolver' },
  { value: 'aprender', label: 'Aprender sobre IA' },
  { value: 'negocios', label: 'Aplicar no meu negócio' },
  { value: 'outro', label: 'Outro' },
];
```

---

## Layout Visual

```text
┌─────────────────────────────────────┐
│  ← Dados pessoais                   │
├─────────────────────────────────────┤
│         [Avatar + Camera]           │
│      Toque para alterar a foto      │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ 👤 Informações básicas      │    │
│  │ ─────────────────────────── │    │
│  │ Nome completo    [________] │    │
│  │ Email            [readonly] │    │
│  │ Membro desde     [readonly] │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📍 Localização              │    │
│  │ ─────────────────────────── │    │
│  │ Cidade           [________] │    │
│  │ Estado           [▼ Select] │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 💼 Dados profissionais      │    │
│  │ ─────────────────────────── │    │
│  │ Ocupação         [▼ Select] │    │
│  │ Área de atuação  [▼ Select] │    │
│  │ Empresa          [________] │    │
│  │ Cargo            [________] │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🎓 Formação                 │    │
│  │ ─────────────────────────── │    │
│  │ Escolaridade     [▼ Select] │    │
│  │ Habilidades      [________] │    │
│  │ (separar por vírgula)       │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ✨ Sobre você               │    │
│  │ ─────────────────────────── │    │
│  │ Bio              [________] │    │
│  │                  [________] │    │
│  │ Hobbies          [________] │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🤖 Experiência com IA       │    │
│  │ ─────────────────────────── │    │
│  │ Nível            [▼ Select] │    │
│  │ Objetivo         [▼ Select] │    │
│  └─────────────────────────────┘    │
│                                     │
│  [      Salvar alterações       ]   │
│                                     │
└─────────────────────────────────────┘
```

---

## Arquivos Impactados

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar - Adicionar colunas à tabela `profiles` |
| `src/pages/profile/PersonalData.tsx` | Alterar - Expandir formulário com novos campos |
| `src/lib/constants/profile.ts` | Criar - Constantes para os selects (estados, ocupações, etc.) |

---

## Benefícios para Personalização

Com esses dados, o Subhumano poderá:

1. **Recomendar Espaços** baseado em área de atuação e interesses
2. **Sugerir Canais** alinhados com nível de experiência em IA
3. **Personalizar feed** considerando objetivos do usuário
4. **Filtrar conteúdo** por relevância profissional
5. **Criar comunidades** conectando usuários com perfis similares
6. **Adaptar linguagem** baseado no nível técnico do usuário

---

## Validação

- Todos os campos novos são opcionais (nullable)
- Bio limitada a 280 caracteres (estilo Twitter)
- Habilidades armazenadas como array para facilitar busca
- Estados como siglas (2 caracteres) para padronização
