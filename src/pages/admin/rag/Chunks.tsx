import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Cube,
  FileText,
  Hash,
  MagnifyingGlass,
  Spinner,
  ArrowClockwise,
  Warning,
} from "@phosphor-icons/react";
import { useRAGChunks, useRAGChunkStats } from "@/hooks/useRAGChunks";
import { useRAGDocuments, useReindexDocument } from "@/hooks/useRAGDocuments";
import { toast } from "sonner";

const LAYER_COLORS: Record<string, string> = {
  constituicao: "bg-amber-500/20 text-amber-500",
  nucleo: "bg-blue-500/20 text-blue-500",
  biblioteca: "bg-green-500/20 text-green-500",
};

export default function RAGChunks() {
  const [search, setSearch] = useState("");
  const [documentFilter, setDocumentFilter] = useState<string>("all");
  const [isReindexingAll, setIsReindexingAll] = useState(false);

  const { data: chunks, isLoading } = useRAGChunks(
    documentFilter !== "all" ? documentFilter : undefined
  );
  const { data: stats } = useRAGChunkStats();
  const { data: documents } = useRAGDocuments();
  const reindexMutation = useReindexDocument();

  // Find documents that are "indexed" but have no chunks
  const documentsWithoutChunks = documents?.filter((doc) => {
    const hasChunks = chunks?.some((chunk) => chunk.document_id === doc.id);
    return doc.status === "indexed" && !hasChunks;
  }) || [];

  // Find pending or error documents
  const pendingOrErrorDocs = documents?.filter(
    (doc) => doc.status === "pending" || doc.status === "error"
  ) || [];

  const problemDocs = [...documentsWithoutChunks, ...pendingOrErrorDocs];

  const handleReindexAll = async () => {
    if (problemDocs.length === 0) return;
    
    setIsReindexingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const doc of problemDocs) {
      try {
        await reindexMutation.mutateAsync(doc.id);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsReindexingAll(false);

    if (successCount > 0 && errorCount === 0) {
      toast.success(`${successCount} documento(s) reindexado(s) com sucesso!`);
    } else if (successCount > 0) {
      toast.warning(`${successCount} sucesso, ${errorCount} erro(s)`);
    } else {
      toast.error("Erro ao reindexar documentos");
    }
  };

  const filteredChunks = chunks?.filter((chunk) => {
    if (search && !chunk.content.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with Reindex Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold">Chunks da Base de Conhecimento</h1>
          {problemDocs.length > 0 && (
            <Button
              onClick={handleReindexAll}
              disabled={isReindexingAll || reindexMutation.isPending}
            >
              {isReindexingAll ? (
                <Spinner className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowClockwise className="w-4 h-4 mr-2" />
              )}
              Reindexar {problemDocs.length} Documento(s)
            </Button>
          )}
        </div>

        {/* Alert for documents without chunks */}
        {problemDocs.length > 0 && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <Warning className="w-4 h-4 text-yellow-500" />
            <AlertTitle className="text-yellow-400">
              Documentos precisam de atenção
            </AlertTitle>
            <AlertDescription className="text-yellow-200/80">
              {documentsWithoutChunks.length > 0 && (
                <div className="mb-2">
                  <strong>{documentsWithoutChunks.length} documento(s)</strong> marcados
                  como indexados mas sem chunks gerados.
                </div>
              )}
              {pendingOrErrorDocs.length > 0 && (
                <div className="mb-2">
                  <strong>{pendingOrErrorDocs.length} documento(s)</strong> pendentes ou
                  com erro de indexação.
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {problemDocs.slice(0, 5).map((doc) => (
                  <Button
                    key={doc.id}
                    size="sm"
                    variant="outline"
                    onClick={() => reindexMutation.mutate(doc.id)}
                    disabled={reindexMutation.isPending}
                    className="border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/20"
                  >
                    {reindexMutation.isPending ? (
                      <Spinner className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <ArrowClockwise className="w-3 h-3 mr-1" />
                    )}
                    {doc.title.substring(0, 25)}
                    {doc.title.length > 25 ? "..." : ""}
                    <Badge
                      variant="outline"
                      className="ml-2 text-xs border-yellow-500/30"
                    >
                      {doc.status}
                    </Badge>
                  </Button>
                ))}
                {problemDocs.length > 5 && (
                  <span className="text-sm text-yellow-300/60 self-center">
                    +{problemDocs.length - 5} mais
                  </span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Chunks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Cube className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{stats?.totalChunks || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{stats?.totalDocuments || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Indexados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-500">
                  {stats?.byStatus?.indexed || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Com Erros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-red-500">
                  {stats?.byStatus?.error || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar no conteúdo dos chunks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={documentFilter} onValueChange={setDocumentFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por documento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os documentos</SelectItem>
              {documents?.map((doc) => (
                <SelectItem key={doc.id} value={doc.id}>
                  {doc.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chunks Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredChunks?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum chunk encontrado
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredChunks?.map((chunk) => (
              <Card key={chunk.id} className="overflow-hidden">
                <CardHeader className="pb-2 bg-card/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        #{chunk.chunk_index}
                      </Badge>
                      <span className="text-sm font-medium">
                        {chunk.document?.title || "Documento"}
                      </span>
                      {chunk.document?.layer && (
                        <Badge className={LAYER_COLORS[chunk.document.layer]}>
                          {chunk.document.layer}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="w-3 h-3" />
                      <span>{chunk.token_count || "?"} tokens</span>
                      <span className="mx-1">•</span>
                      <span>Prioridade: {chunk.priority}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                    {chunk.content}
                  </p>
                  {chunk.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {chunk.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
