import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RAGDocument {
  id: string;
  title: string;
  slug: string;
  layer: "constituicao" | "nucleo" | "biblioteca";
  priority: number;
  source_content: string;
  status: "pending" | "processing" | "indexed" | "error";
  error_message: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useRAGDocuments() {
  return useQuery({
    queryKey: ["rag-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rag_documents")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RAGDocument[];
    },
  });
}

export function useRAGDocument(id: string | undefined) {
  return useQuery({
    queryKey: ["rag-document", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("rag_documents")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as RAGDocument;
    },
    enabled: !!id,
  });
}

// Add document (without generating chunks automatically)
export function useIngestDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Você precisa estar logado");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ content }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao salvar documento");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rag-documents"] });
      toast.success(`Documento "${data.title}" salvo! Use 'Gerar Chunks' para criar os fragmentos.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Generate chunks manually
export function useGenerateChunks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Você precisa estar logado");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-chunks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ documentId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao gerar chunks");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rag-documents"] });
      queryClient.invalidateQueries({ queryKey: ["rag-chunks"] });
      queryClient.invalidateQueries({ queryKey: ["rag-chunk-stats"] });
      toast.success(data.message || "Chunks gerados com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Reindex document (calls generate-chunks)
export function useReindexDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Você precisa estar logado");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-chunks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ documentId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao reindexar documento");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rag-documents"] });
      queryClient.invalidateQueries({ queryKey: ["rag-chunks"] });
      queryClient.invalidateQueries({ queryKey: ["rag-chunk-stats"] });
      toast.success("Chunks regenerados com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Fix document metadata by re-parsing frontmatter
export function useFixDocumentMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      // Fetch the document
      const { data: doc, error: fetchError } = await supabase
        .from("rag_documents")
        .select("source_content")
        .eq("id", documentId)
        .single();

      if (fetchError || !doc) {
        throw new Error("Documento não encontrado");
      }

      // Parse frontmatter locally
      const content = doc.source_content;
      const parsed = parseFrontmatter(content);

      if (!parsed.hasFrontmatter) {
        throw new Error("Documento não possui frontmatter válido");
      }

      // Extract values
      const title = parsed.metadata.title && String(parsed.metadata.title).trim()
        ? String(parsed.metadata.title).trim()
        : "Documento sem título";

      let layer = String(parsed.metadata.layer || "biblioteca").toLowerCase();
      if (!["constituicao", "nucleo", "biblioteca"].includes(layer)) {
        layer = "biblioteca";
      }

      const priority = Number(parsed.metadata.priority) || 50;

      const manualTags = Array.isArray(parsed.metadata.tags)
        ? parsed.metadata.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
        : [];

      // Update document
      const { error: updateError } = await supabase
        .from("rag_documents")
        .update({
          title,
          layer,
          priority,
          tags: manualTags.length > 0 ? manualTags : undefined, // Keep existing if no manual tags
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (updateError) throw updateError;

      return { title, layer, priority, tags: manualTags };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["rag-documents"] });
      toast.success(`Metadados corrigidos: "${data.title}" (${data.layer})`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Local frontmatter parser (same logic as backend)
function parseFrontmatter(content: string): {
  metadata: Record<string, unknown>;
  body: string;
  hasFrontmatter: boolean;
} {
  let cleanContent = content.replace(/^\uFEFF/, '');
  cleanContent = cleanContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = cleanContent.split('\n');

  let startIndex = -1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].trim() === '---') {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    return { metadata: {}, body: cleanContent, hasFrontmatter: false };
  }

  let endIndex = -1;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { metadata: {}, body: cleanContent, hasFrontmatter: false };
  }

  const yamlLines = lines.slice(startIndex + 1, endIndex);
  const body = lines.slice(endIndex + 1).join('\n').trim();

  const metadata: Record<string, unknown> = {};

  for (const line of yamlLines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmedLine.substring(0, colonIndex).trim();
    let value: string | string[] | number = trimmedLine.substring(colonIndex + 1).trim();

    if (!key || value === '') continue;

    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1);
      value = arrayContent
        .split(',')
        .map(item => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else if (!isNaN(Number(value)) && value !== '') {
      value = Number(value);
    }

    metadata[key] = value;
  }

  return { metadata, body, hasFrontmatter: true };
}

export function useUpdateDocumentPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: number }) => {
      const clampedPriority = Math.max(0, Math.min(100, priority));

      const { error: docError } = await supabase
        .from("rag_documents")
        .update({ priority: clampedPriority, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (docError) throw docError;

      const { error: chunkError } = await supabase
        .from("rag_chunks")
        .update({ priority: clampedPriority })
        .eq("document_id", id);

      if (chunkError) throw chunkError;

      return clampedPriority;
    },
    onSuccess: (newPriority) => {
      queryClient.invalidateQueries({ queryKey: ["rag-documents"] });
      queryClient.invalidateQueries({ queryKey: ["rag-chunks"] });
      toast.success(`Prioridade atualizada para ${newPriority}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteRAGDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from("rag_documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rag-documents"] });
      queryClient.invalidateQueries({ queryKey: ["rag-chunks"] });
      queryClient.invalidateQueries({ queryKey: ["rag-chunk-stats"] });
      toast.success("Documento excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Tarefa 8: Convert content to RAG document
export function useConvertToRAG() {
  const ingestMutation = useIngestDocument();
  const generateChunksMutation = useGenerateChunks();

  const convert = async (params: {
    title: string;
    content: string;
    layer?: string;
    tags?: string[];
    source_type: "space_update" | "channel_post";
  }) => {
    const { title, content, layer = "biblioteca", tags = [], source_type } = params;

    // Strip HTML
    const cleanContent = content.replace(/<[^>]*>/g, "").trim();
    if (!cleanContent) {
      toast.error("Conteúdo vazio após remover HTML");
      return;
    }

    // Build frontmatter document
    const allTags = [...new Set([source_type, ...tags])];
    const sourceContent = `---
title: "${title.replace(/"/g, '\\"')}"
layer: ${layer}
priority: 50
tags: [${allTags.map(t => `"${t}"`).join(", ")}]
---

${cleanContent}`;

    try {
      const result = await ingestMutation.mutateAsync(sourceContent);
      if (result?.id) {
        // Auto-generate chunks
        await generateChunksMutation.mutateAsync(result.id);
        toast.success(`"${title}" convertido em conhecimento RAG com chunks gerados!`);
      }
    } catch (error) {
      // Error already handled by individual mutations
    }
  };

  return {
    convert,
    isConverting: ingestMutation.isPending || generateChunksMutation.isPending,
  };
}
