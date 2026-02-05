-- Create ai_assistant_config table for storing AI assistant configuration
CREATE TABLE public.ai_assistant_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt text NOT NULL DEFAULT '',
  system_instruction text DEFAULT '',
  knowledge_base jsonb DEFAULT '{
    "models": [],
    "categories": {},
    "comparisons": [],
    "faqs": []
  }'::jsonb,
  model text NOT NULL DEFAULT 'openai/gpt-5',
  temperature numeric(3,2) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 1),
  max_tokens integer NOT NULL DEFAULT 2048 CHECK (max_tokens >= 100 AND max_tokens <= 8192),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_assistant_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage AI assistant config
CREATE POLICY "Admins can manage ai_assistant_config"
ON public.ai_assistant_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone authenticated can read config (needed for edge function)
CREATE POLICY "Authenticated users can read ai_assistant_config"
ON public.ai_assistant_config
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_ai_assistant_config_updated_at
BEFORE UPDATE ON public.ai_assistant_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration
INSERT INTO public.ai_assistant_config (
  system_prompt,
  system_instruction,
  knowledge_base,
  model,
  temperature,
  max_tokens,
  is_active
) VALUES (
  'Você é o Assistente IA do Subhumano, especialista em inteligência artificial.

Sua função é:
1. Comparar modelos de IA (gratuitos e pagos)
2. Recomendar ferramentas para tarefas específicas
3. Explicar diferenças técnicas de forma simples
4. Gerar prompts otimizados para diferentes necessidades

Diretrizes:
- Seja objetivo e direto
- Cite preços quando relevante
- Mencione limitações importantes
- Sugira alternativas gratuitas quando possível
- Use linguagem acessível (PT-BR)
- Formate respostas com markdown quando apropriado',
  'Use a base de conhecimento fornecida como referência principal. Se não tiver informação específica sobre algum modelo, informe que a base pode estar desatualizada e sugira verificar diretamente no site oficial.',
  '{
    "models": [
      {
        "name": "GPT-4o",
        "company": "OpenAI",
        "type": "text/multimodal",
        "pricing": "Gratuito limitado / Plus $20/mês",
        "context_window": "128k tokens",
        "best_for": ["código", "raciocínio", "análise de imagens"],
        "limitations": ["sem geração de imagem nativa"],
        "updated_at": "2025-01"
      },
      {
        "name": "Claude 3.5 Sonnet",
        "company": "Anthropic",
        "type": "text/multimodal",
        "pricing": "Gratuito limitado / Pro $20/mês",
        "context_window": "200k tokens",
        "best_for": ["contexto longo", "livros", "documentos"],
        "limitations": ["sem geração de mídia"],
        "updated_at": "2025-01"
      },
      {
        "name": "Gemini 2.0 Pro",
        "company": "Google",
        "type": "text/multimodal",
        "pricing": "Gratuito limitado / Advanced $20/mês",
        "context_window": "1M tokens",
        "best_for": ["documentos grandes", "pesquisa", "integração Google"],
        "limitations": ["menos preciso em código"],
        "updated_at": "2025-01"
      }
    ],
    "categories": {
      "code": ["GPT-4o", "Claude 3.5 Sonnet", "Gemini 2.0 Pro"],
      "images": ["Midjourney", "DALL-E 3", "Stable Diffusion", "Ideogram"],
      "video": ["Runway Gen-3", "Sora", "Pika", "Kling"],
      "audio": ["ElevenLabs", "OpenAI TTS", "Suno", "Udio"]
    },
    "comparisons": [],
    "faqs": []
  }'::jsonb,
  'openai/gpt-5',
  0.7,
  2048,
  true
);