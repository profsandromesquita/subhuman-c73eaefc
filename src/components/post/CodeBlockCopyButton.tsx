import { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";

interface CodeBlockCopyButtonProps {
  code: string;
}

export function CodeBlockCopyButton({ code }: CodeBlockCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-lg bg-[hsl(var(--elevated))] hover:bg-[hsl(var(--border))] transition-colors text-muted-foreground hover:text-foreground"
      title={copied ? "Copiado!" : "Copiar"}
      type="button"
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-400" weight="bold" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}
