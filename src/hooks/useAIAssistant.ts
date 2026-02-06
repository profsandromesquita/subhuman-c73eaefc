import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "subhumano_chat_history";
const MAX_MESSAGES = 100;

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface UseAIAssistantReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  showClearConfirm: boolean;
  requestClearMessages: () => void;
  cancelClearMessages: () => void;
}

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(-MAX_MESSAGES);
  } catch {
    // ignore
  }
  return [];
}

function saveMessages(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
  } catch {
    // ignore
  }
}

export function useAIAssistant(): UseAIAssistantReturn {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Persist messages on change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Você precisa estar logado para usar o assistente.");
      }

      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || "Erro ao processar sua mensagem";
        
        if (response.status === 429) {
          toast.error("Limite de requisições excedido. Aguarde alguns segundos.");
        } else if (response.status === 402) {
          toast.error("Créditos de IA insuficientes.");
        } else {
          toast.error(errorMsg);
        }
        
        throw new Error(errorMsg);
      }

      if (!response.body) {
        throw new Error("Resposta sem conteúdo");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              updateAssistant(deltaContent);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) updateAssistant(deltaContent);
          } catch {
            // Ignore parsing errors for leftover data
          }
        }
      }
    } catch (err) {
      console.error("AI Assistant error:", err);
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMsg);
      
      if (!assistantContent) {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setShowClearConfirm(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    toast.success("Nova conversa iniciada");
  }, []);

  const requestClearMessages = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  const cancelClearMessages = useCallback(() => {
    setShowClearConfirm(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    showClearConfirm,
    requestClearMessages,
    cancelClearMessages,
  };
}
