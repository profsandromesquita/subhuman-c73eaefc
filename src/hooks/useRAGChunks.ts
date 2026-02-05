import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RAGChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  token_count: number | null;
  tags: string[];
  priority: number;
  metadata: Record<string, unknown>;
  created_at: string;
  document?: {
    title: string;
    layer: string;
  };
}

export function useRAGChunks(documentId?: string) {
  return useQuery({
    queryKey: ["rag-chunks", documentId],
    queryFn: async () => {
      let query = supabase
        .from("rag_chunks")
        .select(`
          *,
          document:rag_documents!inner(title, layer)
        `)
        .order("priority", { ascending: false })
        .order("chunk_index", { ascending: true });

      if (documentId) {
        query = query.eq("document_id", documentId);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as RAGChunk[];
    },
  });
}

export function useRAGChunkStats() {
  return useQuery({
    queryKey: ["rag-chunk-stats"],
    queryFn: async () => {
      // Get total chunks count
      const { count: totalChunks, error: countError } = await supabase
        .from("rag_chunks")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;

      // Get documents count by layer
      const { data: documents, error: docsError } = await supabase
        .from("rag_documents")
        .select("layer, status");

      if (docsError) throw docsError;

      const byLayer = documents?.reduce(
        (acc, doc) => {
          acc[doc.layer] = (acc[doc.layer] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const byStatus = documents?.reduce(
        (acc, doc) => {
          acc[doc.status] = (acc[doc.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        totalChunks: totalChunks || 0,
        totalDocuments: documents?.length || 0,
        byLayer: byLayer || {},
        byStatus: byStatus || {},
      };
    },
  });
}
