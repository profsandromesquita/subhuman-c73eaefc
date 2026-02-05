import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MagnifyingGlass,
  Spinner,
  Lightning,
  Gauge,
  FileText,
} from "@phosphor-icons/react";
import { useRAGSearch, type RAGSearchResult } from "@/hooks/useRAGSearch";

const LAYER_COLORS: Record<string, string> = {
  constituicao: "bg-amber-500/20 text-amber-500",
  nucleo: "bg-blue-500/20 text-blue-500",
  biblioteca: "bg-green-500/20 text-green-500",
};

export default function RAGTest() {
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState([0.5]);
  const [topK, setTopK] = useState([8]);
  const [layerFilter, setLayerFilter] = useState<string>("all");
  const [includeConstitution, setIncludeConstitution] = useState(true);

  const { search, results, isSearching, error, clearResults } = useRAGSearch();

  const handleSearch = () => {
    if (!query.trim()) return;

    search(query, {
      matchThreshold: threshold[0],
      matchCount: topK[0],
      filterLayer: layerFilter !== "all" ? layerFilter : undefined,
      includeConstitution,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Teste de Busca RAG</h1>
        {/* Search Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightning className="w-5 h-5" />
              Configuração da Busca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Query Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Digite uma pergunta para testar o RAG..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
                {isSearching ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  "Buscar"
                )}
              </Button>
              {results.length > 0 && (
                <Button variant="outline" onClick={clearResults}>
                  Limpar
                </Button>
              )}
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Threshold */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Threshold de Similaridade</Label>
                  <span className="text-sm font-mono text-muted-foreground">
                    {threshold[0].toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={threshold}
                  onValueChange={setThreshold}
                  min={0.3}
                  max={0.9}
                  step={0.05}
                />
                <p className="text-xs text-muted-foreground">
                  Menor = mais resultados, maior = mais precisão
                </p>
              </div>

              {/* Top K */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Máximo de Resultados</Label>
                  <span className="text-sm font-mono text-muted-foreground">
                    {topK[0]}
                  </span>
                </div>
                <Slider
                  value={topK}
                  onValueChange={setTopK}
                  min={3}
                  max={20}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Quantidade máxima de chunks retornados
                </p>
              </div>

              {/* Layer Filter */}
              <div className="space-y-2">
                <Label>Filtrar por Camada</Label>
                <Select value={layerFilter} onValueChange={setLayerFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as camadas</SelectItem>
                    <SelectItem value="constituicao">Constituição</SelectItem>
                    <SelectItem value="nucleo">Núcleo</SelectItem>
                    <SelectItem value="biblioteca">Biblioteca</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Include Constitution */}
              <div className="space-y-2">
                <Label>Incluir Constituição</Label>
                <Select
                  value={includeConstitution ? "yes" : "no"}
                  onValueChange={(v) => setIncludeConstitution(v === "yes")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Sempre incluir</SelectItem>
                    <SelectItem value="no">Não incluir automaticamente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-red-500/50 bg-red-500/10">
            <CardContent className="py-4 text-red-400">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Resultados ({results.length} chunks)
              </h2>
            </div>

            <div className="grid gap-4">
              {results.map((result, index) => (
                <ResultCard key={result.id} result={result} rank={index + 1} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isSearching && results.length === 0 && !error && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MagnifyingGlass className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Digite uma pergunta e clique em Buscar para testar o RAG</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

function ResultCard({ result, rank }: { result: RAGSearchResult; rank: number }) {
  const similarityPercent = (result.similarity * 100).toFixed(1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 bg-card/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              #{rank}
            </Badge>
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{result.document_title}</span>
            <Badge className={LAYER_COLORS[result.layer]}>{result.layer}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Gauge className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-green-400">{similarityPercent}%</span>
            </div>
            <div className="text-muted-foreground">
              Prioridade: {result.priority}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {result.content}
        </p>
        {result.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {result.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
