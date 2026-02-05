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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Cube,
  FileText,
  Hash,
  MagnifyingGlass,
  Spinner,
  Trash,
  TrashSimple,
  Warning,
  Lightning,
} from "@phosphor-icons/react";
import { useRAGChunks, useRAGChunkStats, useDeleteChunk, useDeleteAllChunks } from "@/hooks/useRAGChunks";
import { useRAGDocuments, useGenerateChunks } from "@/hooks/useRAGDocuments";

const LAYER_COLORS: Record<string, string> = {
  constituicao: "bg-amber-500/20 text-amber-500",
  nucleo: "bg-blue-500/20 text-blue-500",
  biblioteca: "bg-green-500/20 text-green-500",
};

export default function RAGChunks() {
  const [search, setSearch] = useState("");
  const [documentFilter, setDocumentFilter] = useState<string>("all");

  const { data: chunks, isLoading } = useRAGChunks(
    documentFilter !== "all" ? documentFilter : undefined
  );
  const { data: stats } = useRAGChunkStats();
  const { data: documents } = useRAGDocuments();
  const deleteChunkMutation = useDeleteChunk();
  const deleteAllChunksMutation = useDeleteAllChunks();
  const generateChunksMutation = useGenerateChunks();

  // Find documents that need attention (pending or error)
  const pendingDocs = documents?.filter(
    (doc) => doc.status === "pending" || doc.status === "error"
  ) || [];

  const filteredChunks = chunks?.filter((chunk) => {
    if (search && !chunk.content.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Get selected document for "Delete All" action
  const selectedDocument = documents?.find((doc) => doc.id === documentFilter);
  const selectedDocumentChunksCount = chunks?.filter((c) => c.document_id === documentFilter).length || 0;

  const handleDeleteChunk = (chunkId: string) => {
    deleteChunkMutation.mutate(chunkId);
  };

  const handleDeleteAllChunks = () => {
    if (documentFilter !== "all") {
      deleteAllChunksMutation.mutate(documentFilter);
    }
  };

  const handleGenerateChunks = (docId: string) => {
    generateChunksMutation.mutate(docId);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold">Chunks da Base de Conhecimento</h1>
        </div>

        {/* Alert for pending documents */}
        {pendingDocs.length > 0 && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <Warning className="w-4 h-4 text-yellow-500" />
            <AlertTitle className="text-yellow-400">
              Documentos aguardando geração de chunks
            </AlertTitle>
            <AlertDescription className="text-yellow-200/80">
              <div className="mb-2">
                <strong>{pendingDocs.length} documento(s)</strong> precisam ter seus chunks gerados manualmente.
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {pendingDocs.slice(0, 5).map((doc) => (
                  <Button
                    key={doc.id}
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerateChunks(doc.id)}
                    disabled={generateChunksMutation.isPending}
                    className="border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/20 gap-1"
                  >
                    {generateChunksMutation.isPending ? (
                      <Spinner className="w-3 h-3 animate-spin" />
                    ) : (
                      <Lightning className="w-3 h-3" weight="fill" />
                    )}
                    {doc.title.substring(0, 25)}
                    {doc.title.length > 25 ? "..." : ""}
                    <Badge
                      variant="outline"
                      className="ml-1 text-xs border-yellow-500/30"
                    >
                      {doc.status}
                    </Badge>
                  </Button>
                ))}
                {pendingDocs.length > 5 && (
                  <span className="text-sm text-yellow-300/60 self-center">
                    +{pendingDocs.length - 5} mais
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
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-yellow-500">
                  {stats?.byStatus?.pending || 0}
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

          {/* Delete All Chunks Button (only when document filter is active) */}
          {documentFilter !== "all" && selectedDocumentChunksCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1">
                  <TrashSimple className="w-4 h-4" />
                  Excluir Todos ({selectedDocumentChunksCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir todos os chunks?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você está prestes a excluir <strong>{selectedDocumentChunksCount} chunks</strong> do documento "{selectedDocument?.title}".
                    O documento voltará ao status "Pendente" e você precisará gerar os chunks novamente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAllChunks}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir Todos
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Chunks Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredChunks?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {documentFilter !== "all" 
              ? "Nenhum chunk encontrado. Use 'Gerar Chunks' na página de Documentos."
              : "Nenhum chunk encontrado"
            }
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredChunks?.map((chunk) => (
              <Card key={chunk.id} className="overflow-hidden group">
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
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Hash className="w-3 h-3" />
                        <span>{chunk.token_count || "?"} tokens</span>
                        <span className="mx-1">•</span>
                        <span>Prioridade: {chunk.priority}</span>
                      </div>
                      
                      {/* Delete button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash className="w-4 h-4 text-red-400" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir chunk?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O chunk #{chunk.chunk_index} será permanentemente excluído.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteChunk(chunk.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
