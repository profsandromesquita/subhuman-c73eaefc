import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  useAdminPodcasts,
  useCreatePodcast,
  useUpdatePodcast,
  useDeletePodcast,
  formatDuration,
  Podcast,
} from "@/hooks/usePodcasts";
import { useSpaces } from "@/hooks/useSpaces";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Pencil, Trash, Upload, X, MusicNote } from "@phosphor-icons/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminPodcasts() {
  const { user } = useAuth();
  const { data: podcasts, isLoading } = useAdminPodcasts();
  const { data: spaces } = useSpaces();
  const createPodcast = useCreatePodcast();
  const updatePodcast = useUpdatePodcast();
  const deletePodcast = useDeletePodcast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    space_id: "",
    audio_url: "",
    cover_url: "",
    duration_seconds: 0,
    tags: [] as string[],
    is_published: false,
  });
  const [tagInput, setTagInput] = useState("");

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      space_id: "",
      audio_url: "",
      cover_url: "",
      duration_seconds: 0,
      tags: [],
      is_published: false,
    });
    setTagInput("");
    setSelectedPodcast(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setFormData({
      title: podcast.title,
      description: podcast.description || "",
      space_id: podcast.space_id || "",
      audio_url: podcast.audio_url,
      cover_url: podcast.cover_url || "",
      duration_seconds: podcast.duration_seconds || 0,
      tags: podcast.tags || [],
      is_published: podcast.is_published,
    });
    setIsModalOpen(true);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Tipo de arquivo inválido. Use MP3, WAV ou OGG.");
      return;
    }

    // Validate file size (100MB)
    if (file.size > 104857600) {
      toast.error("Arquivo muito grande. Máximo 100MB.");
      return;
    }

    setUploadingAudio(true);

    try {
      // Get duration
      const audio = new Audio(URL.createObjectURL(file));
      await new Promise<void>((resolve) => {
        audio.addEventListener("loadedmetadata", () => {
          setFormData((prev) => ({
            ...prev,
            duration_seconds: Math.round(audio.duration),
          }));
          resolve();
        });
      });

      // Upload file
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("podcast-media")
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("podcast-media")
        .getPublicUrl(data.path);

      setFormData((prev) => ({
        ...prev,
        audio_url: urlData.publicUrl,
      }));

      toast.success("Áudio enviado com sucesso!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar áudio");
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Tipo de arquivo inválido. Use JPG, PNG ou WebP.");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10485760) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setUploadingCover(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-cover.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("podcast-media")
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("podcast-media")
        .getPublicUrl(data.path);

      setFormData((prev) => ({
        ...prev,
        cover_url: urlData.publicUrl,
      }));

      toast.success("Capa enviada com sucesso!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar capa");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (publish: boolean) => {
    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (!formData.audio_url) {
      toast.error("Áudio é obrigatório");
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      space_id: formData.space_id || null,
      audio_url: formData.audio_url,
      cover_url: formData.cover_url || null,
      duration_seconds: formData.duration_seconds,
      tags: formData.tags,
      is_published: publish,
      published_at: publish ? new Date().toISOString() : null,
    };

    if (selectedPodcast) {
      await updatePodcast.mutateAsync({ id: selectedPodcast.id, ...payload });
    } else {
      await createPodcast.mutateAsync(payload);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!selectedPodcast) return;
    await deletePodcast.mutateAsync(selectedPodcast.id);
    setDeleteDialogOpen(false);
    setSelectedPodcast(null);
  };

  const columns = [
    {
      key: "podcast",
      header: "Podcast",
      render: (podcast: Podcast) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
            {podcast.cover_url ? (
              <img
                src={podcast.cover_url}
                alt={podcast.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MusicNote className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <p className="font-medium">{podcast.title}</p>
            <p className="text-sm text-muted-foreground">
              {formatDuration(podcast.duration_seconds)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "space",
      header: "Espaço",
      render: (podcast: Podcast) => podcast.spaces?.name || "-",
    },
    {
      key: "tags",
      header: "Tags",
      render: (podcast: Podcast) => (
        <div className="flex gap-1 flex-wrap">
          {podcast.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
          {podcast.tags && podcast.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{podcast.tags.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (podcast: Podcast) => (
        <Badge variant={podcast.is_published ? "default" : "secondary"}>
          {podcast.is_published ? "Publicado" : "Rascunho"}
        </Badge>
      ),
    },
    {
      key: "date",
      header: "Data",
      render: (podcast: Podcast) =>
        format(new Date(podcast.created_at), "dd/MM/yyyy", { locale: ptBR }),
    },
    {
      key: "actions",
      header: "Ações",
      render: (podcast: Podcast) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditModal(podcast)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedPodcast(podcast);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Podcasts</h1>
            <p className="text-muted-foreground">
              Gerencie os episódios de podcast
            </p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Podcast
          </Button>
        </div>

        <DataTable
          data={podcasts || []}
          columns={columns}
          loading={isLoading}
        />
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPodcast ? "Editar Podcast" : "Novo Podcast"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Título *</label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Título do episódio"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Descrição do episódio..."
                rows={4}
              />
            </div>

            {/* Space */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Espaço</label>
              <Select
                value={formData.space_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, space_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um espaço" />
                </SelectTrigger>
                <SelectContent>
                  {spaces?.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Audio Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Áudio *</label>
              {formData.audio_url ? (
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <MusicNote className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Áudio carregado</p>
                    <p className="text-xs text-muted-foreground">
                      Duração: {formatDuration(formData.duration_seconds)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        audio_url: "",
                        duration_seconds: 0,
                      }))
                    }
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-muted-foreground transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {uploadingAudio ? "Enviando..." : "Clique para enviar áudio"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    MP3, WAV ou OGG (máx. 100MB)
                  </span>
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg"
                    className="hidden"
                    onChange={handleAudioUpload}
                    disabled={uploadingAudio}
                  />
                </label>
              )}
            </div>

            {/* Cover Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Capa</label>
              {formData.cover_url ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                  <img
                    src={formData.cover_url}
                    alt="Capa"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 bg-background/80"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, cover_url: "" }))
                    }
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-muted-foreground transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground text-center">
                    {uploadingCover ? "Enviando..." : "Capa"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                  />
                </label>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags (máx. 5)</label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Digite uma tag"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddTag}
                  disabled={formData.tags.length >= 5}
                >
                  Adicionar
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      #{tag} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => handleSubmit(false)}
                disabled={createPodcast.isPending || updatePodcast.isPending}
              >
                Salvar Rascunho
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={createPodcast.isPending || updatePodcast.isPending}
              >
                {formData.is_published ? "Atualizar" : "Publicar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir podcast?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O podcast será permanentemente
              removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
