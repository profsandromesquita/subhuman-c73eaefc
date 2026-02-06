import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Robot, PaperPlaneRight, Trash, Copy, Check, Sparkle, ChatsCircle, Lightbulb, BookOpen, FileText, Users } from "@phosphor-icons/react";
import { Logo } from "@/components/Logo";
import ReactMarkdown from "react-markdown";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAIAssistant } from "@/hooks/useAIAssistant";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SUGGESTIONS = [
  "O que a plataforma Subhumano oferece?",
  "Quem está falando sobre IA para vídeos?",
  "Qual IA devo usar para código?",
  "Resuma os posts recentes sobre produtividade"
];

const CAPABILITIES = [
  { icon: Sparkle, text: "Comparar modelos de IA (preços, recursos, limitações)" },
  { icon: Lightbulb, text: "Explicar conceitos de forma acessível" },
  { icon: BookOpen, text: "Recomendar ferramentas para seu caso" },
  { icon: FileText, text: "Gerar prompts otimizados" },
  { icon: Users, text: "Indicar discussões relevantes na comunidade" },
  { icon: ChatsCircle, text: "Resumir posts publicados na plataforma" },
];

export default function AIAssistant() {
  const navigate = useNavigate();
  const {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    showClearConfirm,
    requestClearMessages,
    cancelClearMessages,
  } = useAIAssistant();
  const [input, setInput] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast.success("Resposta copiada!");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const markdownComponents = {
    p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
    li: ({ children }: any) => <li className="mb-1">{children}</li>,
    code: ({ children, className }: any) => {
      const isInline = !className;
      return isInline
        ? <code className="bg-background px-1 py-0.5 rounded text-sm">{children}</code>
        : <code className="block bg-background p-3 rounded-lg text-sm overflow-x-auto">{children}</code>;
    },
    pre: ({ children }: any) => (
      <pre className="bg-background p-3 rounded-lg overflow-x-auto mb-2">{children}</pre>
    ),
    h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-base font-bold mb-2">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-sm font-bold mb-2">{children}</h3>,
    strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    a: ({ href, children }: any) => {
      if (href?.startsWith('/')) {
        return (
          <button
            onClick={(e) => { e.preventDefault(); navigate(href); }}
            className="underline text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            {children}
          </button>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-blue-400 hover:text-blue-300">
          {children}
        </a>
      );
    },
  };

  return (
    <AppLayout>
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
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={requestClearMessages}
                className="text-muted-foreground hover:text-foreground"
              >
                <Trash className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="text-center">
                <Robot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-medium text-foreground mb-2">Como posso ajudar?</h2>
                <p className="text-sm text-muted-foreground max-w-xs mb-4">
                  Sou o assistente da plataforma Subhumano, especializado em IA.
                </p>
              </div>

              <div className="w-full max-w-sm bg-card rounded-xl p-4">
                <h3 className="text-sm font-medium text-foreground mb-3">O que posso fazer:</h3>
                <ul className="space-y-2">
                  {CAPABILITIES.map((cap, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <cap.icon className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
                      <span>{cap.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {SUGGESTIONS.map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isLoading}
                    className="px-3 py-2 text-sm bg-card hover:bg-elevated rounded-full text-foreground transition-colors disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 relative group",
                      message.role === "user"
                        ? "bg-card text-foreground"
                        : "bg-secondary text-foreground"
                    )}
                  >
                    {message.role === "assistant" && (
                      <>
                        <div className="prose prose-sm prose-invert max-w-none">
                          <ReactMarkdown components={markdownComponents}>
                            {message.content}
                          </ReactMarkdown>
                        </div>

                        {message.content && (
                          <button
                            onClick={() => handleCopyMessage(message.content, index)}
                            className="absolute -bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-elevated rounded-full p-1.5 hover:bg-border"
                            title="Copiar resposta"
                          >
                            {copiedIndex === index ? (
                              <Check className="w-3.5 h-3.5 text-accent" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>
                        )}
                      </>
                    )}

                    {message.role === "user" && (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="px-4 py-3 pb-20 border-t border-border bg-background">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua pergunta..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isLoading} size="icon" className="shrink-0">
              <PaperPlaneRight className="w-5 h-5" weight="fill" />
            </Button>
          </form>
        </div>
      </div>

      {/* Clear confirmation dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={(open) => !open && cancelClearMessages()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nova conversa</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja iniciar uma nova conversa? O histórico atual será apagado e não poderá ser recuperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={clearMessages}>Nova conversa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
