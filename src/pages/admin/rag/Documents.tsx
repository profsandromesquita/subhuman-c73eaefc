import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ArrowClockwise,
  Trash,
  FileText,
  Warning,
  CheckCircle,
  Clock,
  Spinner,
} from "@phosphor-icons/react";
import {
  useRAGDocuments,
  useIngestDocument,
  useReindexDocument,
  useDeleteRAGDocument,
} from "@/hooks/useRAGDocuments";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const LAYER_LABELS: Record<string, string> = {
  constituicao: "Constituição",
  nucleo: "Núcleo",
  biblioteca: "Biblioteca",
};

const LAYER_COLORS: Record<string, string> = {
  constituicao: "bg-amber-500/20 text-amber-500",
  nucleo: "bg-blue-500/20 text-blue-500",
  biblioteca: "bg-green-500/20 text-green-500",
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  indexed: { icon: CheckCircle, color: "text-green-500", label: "Indexado" },
  pending: { icon: Clock, color: "text-yellow-500", label: "Pendente" },
  processing: { icon: Spinner, color: "text-blue-500", label: "Processando" },
  error: { icon: Warning, color: "text-red-500", label: "Erro" },
};

const DOCUMENT_TEMPLATE = `---
title: "Título do Documento"
layer: biblioteca
priority: 50
tags: ["tag1", "tag2"]
---

# Conteúdo do Documento

Escreva o conteúdo aqui em Markdown.

## Seção 1

Texto da seção...

## Seção 2

Mais conteúdo...
`;

export default function RAGDocuments() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [content, setContent] = useState(DOCUMENT_TEMPLATE);
  const [layerFilter, setLayerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: documents, isLoading } = useRAGDocuments();
  const ingestMutation = useIngestDocument();
  const reindexMutation = useReindexDocument();
  const deleteMutation = useDeleteRAGDocument();

  const filteredDocuments = documents?.filter((doc) => {
    if (layerFilter !== "all" && doc.layer !== layerFilter) return false;
    if (statusFilter !== "all" && doc.status !== statusFilter) return false;
    return true;
  });

  const handleSubmit = async () => {
    await ingestMutation.mutateAsync(content);
    setIsDialogOpen(false);
    setContent(DOCUMENT_TEMPLATE);
  };

  const handleReindex = (id: string) => {
    reindexMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Documentos RAG</h1>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-2">
            <Select value={layerFilter} onValueChange={setLayerFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Camada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as camadas</SelectItem>
                <SelectItem value="constituicao">Constituição</SelectItem>
                <SelectItem value="nucleo">Núcleo</SelectItem>
                <SelectItem value="biblioteca">Biblioteca</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="indexed">Indexado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Documento à Base de Conhecimento</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="text-sm text-muted-foreground">
                  Cole o conteúdo do documento em formato Markdown com frontmatter YAML.
                  O frontmatter define título, camada (constituicao, nucleo, biblioteca),
                  prioridade (0-100) e tags.
                </div>

                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Cole o conteúdo do documento aqui..."
                />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={ingestMutation.isPending || !content.trim()}
                  >
                    {ingestMutation.isPending ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Indexar Documento"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Camada</TableHead>
                <TableHead className="text-center">Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Spinner className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredDocuments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum documento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments?.map((doc) => {
                  const StatusIcon = STATUS_CONFIG[doc.status]?.icon || Clock;
                  const statusColor = STATUS_CONFIG[doc.status]?.color || "text-muted-foreground";
                  const statusLabel = STATUS_CONFIG[doc.status]?.label || doc.status;

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{doc.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {doc.tags.slice(0, 3).join(", ")}
                              {doc.tags.length > 3 && ` +${doc.tags.length - 3}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={LAYER_COLORS[doc.layer]}>
                          {LAYER_LABELS[doc.layer]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono">{doc.priority}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <StatusIcon className={`w-4 h-4 ${statusColor} ${doc.status === 'processing' ? 'animate-spin' : ''}`} />
                          <span className={statusColor}>{statusLabel}</span>
                        </div>
                        {doc.error_message && (
                          <div className="text-xs text-red-400 mt-1">
                            {doc.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(doc.updated_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReindex(doc.id)}
                            disabled={reindexMutation.isPending}
                            title="Reindexar"
                          >
                            <ArrowClockwise className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleteMutation.isPending}
                            title="Excluir"
                          >
                            <Trash className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
