 import { useState, useCallback } from "react";
 import { toast } from "sonner";
 import { supabase } from "@/integrations/supabase/client";
 
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
 }
 
 export function useAIAssistant(): UseAIAssistantReturn {
   const [messages, setMessages] = useState<Message[]>([]);
   const [isLoading, setIsLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
 
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
       
       // Remove the empty assistant message if there was an error before any content
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
     setError(null);
   }, []);
 
   return {
     messages,
     isLoading,
     error,
     sendMessage,
     clearMessages,
   };
 }