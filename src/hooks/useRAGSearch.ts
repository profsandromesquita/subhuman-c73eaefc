import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RAGSearchResult {
  id: string;
  document_id: string;
  document_title: string;
  layer: string;
  content: string;
  priority: number;
  tags: string[];
  similarity: number;
}

export interface RAGSearchResponse {
  chunks: RAGSearchResult[];
  query: string;
  count: number;
}

export function useRAGSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RAGSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = async (
    query: string,
    options?: {
      matchThreshold?: number;
      matchCount?: number;
      filterTags?: string[];
      filterLayer?: string;
      includeConstitution?: boolean;
    }
  ) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Você precisa estar logado");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-chunks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            query,
            matchThreshold: options?.matchThreshold,
            matchCount: options?.matchCount,
            filterTags: options?.filterTags,
            filterLayer: options?.filterLayer,
            includeConstitution: options?.includeConstitution,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro na busca");
      }

      const data: RAGSearchResponse = await response.json();
      setResults(data.chunks);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(message);
      setResults([]);
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setError(null);
  };

  return {
    search,
    clearResults,
    results,
    isSearching,
    error,
  };
}
