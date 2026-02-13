import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WarningCircle, ArrowCounterClockwise, CaretDown, CaretUp } from "@phosphor-icons/react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
  errorTimestamp: string | null;
}

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message || "";
  const name = error.name || "";
  return (
    name === "ChunkLoadError" ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  );
}

const CHUNK_RELOAD_KEY = "chunk_reload_attempted";

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false, errorTimestamp: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorTimestamp: new Date().toISOString() };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    if (isChunkLoadError(error) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
      window.location.reload();
      return;
    }

    // Clear the flag on non-chunk errors so future chunk errors can auto-reload
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  }

  handleReset = () => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    this.setState({ hasError: false, error: null, showDetails: false, errorTimestamp: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, showDetails, errorTimestamp } = this.state;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <WarningCircle className="w-8 h-8 text-destructive" weight="fill" />
            </div>
            <h2 className="text-xl font-bold">Algo deu errado</h2>
            <p className="text-muted-foreground text-sm">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            {errorTimestamp && (
              <p className="text-xs text-muted-foreground">
                {new Date(errorTimestamp).toLocaleString("pt-BR")}
              </p>
            )}
            <Button onClick={this.handleReset} className="gap-2">
              <ArrowCounterClockwise className="w-4 h-4" />
              Recarregar página
            </Button>
            {error && (
              <button
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="flex items-center gap-1 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showDetails ? <CaretUp className="w-3 h-3" /> : <CaretDown className="w-3 h-3" />}
                Ver detalhes
              </button>
            )}
            {showDetails && error && (
              <pre className="text-xs text-left bg-muted p-3 rounded-lg overflow-auto max-h-40 break-all whitespace-pre-wrap">
                {error.name}: {error.message}
              </pre>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
