import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const TTS_MODEL = 'tts-1';
const TTS_VOICE = 'nova';
const MAX_CHARS_PER_CHUNK = 4000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|code|pre)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '. ')
    .replace(/<\/?(p|h[1-6]|li|blockquote|div)[^>]*>/gi, '. ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\.(\s*\.)+/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIntoChunks(text: string): string[] {
  if (text.length <= MAX_CHARS_PER_CHUNK) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHARS_PER_CHUNK) {
      chunks.push(remaining.trim());
      break;
    }
    let cutAt = remaining.lastIndexOf('. ', MAX_CHARS_PER_CHUNK);
    if (cutAt === -1) cutAt = MAX_CHARS_PER_CHUNK;
    else cutAt += 1;

    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }

  return chunks;
}

async function generateAudioChunk(text: string): Promise<Uint8Array> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      response_format: 'mp3',
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI TTS error: ${response.status} ${err}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body = await req.json();
    const { post_id, html_content } = body;

    // Keep-alive: retorna 200 sem processar
    if (!post_id && !html_content) {
      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!post_id || !html_content) {
      return new Response(
        JSON.stringify({ error: 'post_id and html_content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Extrai texto puro do HTML
    const plainText = htmlToText(html_content);
    if (!plainText || plainText.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Insufficient text content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Divide em chunks
    const chunks = splitIntoChunks(plainText);
    console.log(`Generating audio for post ${post_id}: ${chunks.length} chunks, ${plainText.length} chars`);

    // 3. Gera áudio para cada chunk sequencialmente
    const audioChunks: Uint8Array[] = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Chunk ${i + 1}/${chunks.length}: ${chunks[i].length} chars`);
      const audio = await generateAudioChunk(chunks[i]);
      audioChunks.push(audio);
    }

    // 4. Concatena todos os chunks em um único MP3
    const totalLength = audioChunks.reduce((sum, c) => sum + c.length, 0);
    const combinedAudio = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunks) {
      combinedAudio.set(chunk, offset);
      offset += chunk.length;
    }

    // 5. Upload para Storage
    const filePath = `${post_id}.mp3`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('article-audio')
      .upload(filePath, combinedAudio, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 6. Obtém URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('article-audio')
      .getPublicUrl(filePath);

    // 7. Atualiza audio_url na tabela
    const { error: updateError } = await supabaseAdmin
      .from('space_updates')
      .update({ audio_url: publicUrl })
      .eq('id', post_id);

    if (updateError) {
      console.error('DB update error:', updateError);
      throw new Error(`DB update failed: ${updateError.message}`);
    }

    console.log(`Audio generated and stored: ${publicUrl}`);

    return new Response(
      JSON.stringify({ audio_url: publicUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('tts-generate error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
