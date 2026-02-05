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
        throw new Error(errorData.error || "Erro ao processar documento");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rag-documents"] });
      queryClient.invalidateQueries({ queryKey: ["rag-chunks"] });
      toast.success("Documento indexado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-document`,
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
      toast.success("Documento reindexado com sucesso!");
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
      toast.success("Documento excluído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
