import { useState, useRef, useEffect } from "react";
import { Robot, PaperPlaneRight, Trash } from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import ReactMarkdown from "react-markdown";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { cn } from "@/lib/utils";
const SUGGESTIONS = ["Qual IA é melhor para código?", "Compare GPT-5 vs Claude 4", "Qual IA tem mais contexto?", "Gere um prompt para análise de dados"];
export default function AIAssistant() {
  const {
    messages,
    isLoading,
    sendMessage,
    clearMessages
  } = useAIAssistant();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  };
  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return;
    await sendMessage(suggestion);
  };
  return <AppLayout>
       <div className="flex flex-col h-[calc(100dvh-64px)] max-w-lg mx-auto pb-safe">
         {/* Header */}
         <div className="px-4 py-4 border-b border-border">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <Logo size="sm" />
                  <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center">
                    <Robot className="w-5 h-5 text-foreground" weight="fill" />
                  </div>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Subhumano IA</h1>
                  <p className="text-xs text-muted-foreground">Especialista em modelos de IA</p>
                </div>
              </div>
             {messages.length > 0 && <Button variant="ghost" size="icon" onClick={clearMessages} className="text-muted-foreground hover:text-foreground">
                 <Trash className="w-5 h-5" />
               </Button>}
           </div>
         </div>
 
         {/* Messages Area */}
         <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
           {messages.length === 0 ? <div className="flex flex-col items-center justify-center h-full gap-6">
               <div className="text-center">
                 <Robot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                 <h2 className="text-lg font-medium text-foreground mb-2">
                   Como posso ajudar?
                 </h2>
                 <p className="text-sm text-muted-foreground max-w-xs">
                   Pergunte sobre modelos de IA, compare ferramentas ou peça ajuda com prompts.
                 </p>
               </div>
               <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                 {SUGGESTIONS.map(suggestion => <button key={suggestion} onClick={() => handleSuggestionClick(suggestion)} disabled={isLoading} className="px-3 py-2 text-sm bg-card hover:bg-elevated rounded-full text-foreground transition-colors disabled:opacity-50">
                     {suggestion}
                   </button>)}
               </div>
             </div> : <>
               {messages.map((message, index) => <div key={index} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                   <div className={cn("max-w-[85%] rounded-2xl px-4 py-3", message.role === "user" ? "bg-card text-foreground" : "bg-secondary text-foreground")}>
                     {message.role === "assistant" ? <div className="prose prose-sm prose-invert max-w-none">
                         <ReactMarkdown components={{
                  p: ({
                    children
                  }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({
                    children
                  }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                  ol: ({
                    children
                  }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                  li: ({
                    children
                  }) => <li className="mb-1">{children}</li>,
                  code: ({
                    children,
                    className
                  }) => {
                    const isInline = !className;
                    return isInline ? <code className="bg-background px-1 py-0.5 rounded text-sm">{children}</code> : <code className="block bg-background p-3 rounded-lg text-sm overflow-x-auto">{children}</code>;
                  },
                  pre: ({
                    children
                  }) => <pre className="bg-background p-3 rounded-lg overflow-x-auto mb-2">{children}</pre>,
                  h1: ({
                    children
                  }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                  h2: ({
                    children
                  }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                  h3: ({
                    children
                  }) => <h3 className="text-sm font-bold mb-2">{children}</h3>,
                  strong: ({
                    children
                  }) => <strong className="font-bold">{children}</strong>,
                  em: ({
                    children
                  }) => <em className="italic">{children}</em>
                }}>
                           {message.content}
                         </ReactMarkdown>
                       </div> : <p className="text-sm">{message.content}</p>}
                   </div>
                 </div>)}
               {isLoading && messages[messages.length - 1]?.role === "user" && <div className="flex justify-start">
                   <div className="bg-secondary rounded-2xl px-4 py-3">
                     <div className="flex gap-1">
                       <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{
                  animationDelay: "0ms"
                }} />
                       <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{
                  animationDelay: "150ms"
                }} />
                       <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{
                  animationDelay: "300ms"
                }} />
                     </div>
                   </div>
                 </div>}
               <div ref={messagesEndRef} />
             </>}
         </div>
 
          {/* Input Area */}
          <div className="px-4 py-3 pb-20 border-t border-border bg-background">
           <form onSubmit={handleSubmit} className="flex gap-2">
             <Input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Digite sua pergunta..." disabled={isLoading} className="flex-1" />
             <Button type="submit" disabled={!input.trim() || isLoading} size="icon" className="shrink-0">
               <PaperPlaneRight className="w-5 h-5" weight="fill" />
             </Button>
           </form>
         </div>
       </div>
     </AppLayout>;
}