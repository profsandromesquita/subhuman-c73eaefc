import { useState, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  useAdminEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  type AdminEvent,
  type SessionInput,
  type MaterialInput,
} from "@/hooks/useAdminEvents";
import { Plus, Pencil, Trash, CalendarBlank, X, Image, UploadSimple } from "@phosphor-icons/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const typeOptions = [
  { value: "workshop", label: "Workshop" },
  { value: "palestra", label: "Palestra" },
  { value: "live", label: "Live" },
  { value: "aula_ao_vivo", label: "Aula ao Vivo" },
  { value: "mentoria_grupo", label: "Mentoria em Grupo" },
  { value: "mentoria_individual", label: "Mentoria Individual" },
  { value: "curso", label: "Curso" },
];

const modalityOptions = [
  { value: "online_gravado", label: "Online Gravado" },
  { value: "online_ao_vivo", label: "Online ao Vivo" },
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Híbrido" },
];

interface MaterialFormItem {
  type: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url: string;
  sort_order: number;
  is_free: boolean;
}

interface FormData {
  title: string;
  description: string;
  event_type: string;
  modality: string;
  price: string;
  is_free: boolean;
  location: string;
  max_participants: string;
  checkout_url: string;
  access_url: string;
  youtube_url: string;
  meet_url: string;
  ticto_offer_id: string;
  sessions: SessionInput[];
  materials: MaterialFormItem[];
}

const emptyForm: FormData = {
  title: "",
  description: "",
  event_type: "workshop",
  modality: "online_gravado",
  price: "0",
  is_free: false,
  location: "",
  max_participants: "",
  checkout_url: "",
  access_url: "",
  youtube_url: "",
  meet_url: "",
  ticto_offer_id: "",
  sessions: [],
  materials: [],
};

export default function AdminEvents() {
  const { data: events, isLoading } = useAdminEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  // Cover upload state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedEvent(null);
    setCoverFile(null);
    setCoverPreview(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = async (event: AdminEvent) => {
    setSelectedEvent(event);
    const utcToLocalInput = (utcStr: string) => {
      const date = new Date(utcStr);
      const offset = date.getTimezoneOffset();
      const local = new Date(date.getTime() - offset * 60000);
      return local.toISOString().slice(0, 16);
    };

    // Fetch materials for this event
    const { data: materialsData } = await supabase
      .from("event_materials")
      .select("*")
      .eq("event_id", event.id)
      .order("sort_order", { ascending: true });

    setFormData({
      title: event.title,
      description: event.description || "",
      event_type: event.event_type,
      modality: event.modality,
      price: event.price?.toString() || "",
      is_free: event.is_free,
      location: event.location || "",
      max_participants: event.max_participants?.toString() || "",
      checkout_url: event.checkout_url || "",
      access_url: event.access_url || "",
      youtube_url: (event as any).youtube_url || "",
      meet_url: (event as any).meet_url || "",
      ticto_offer_id: event.ticto_offer_id || "",
      sessions: event.sessions.map((s) => ({
        starts_at: utcToLocalInput(s.starts_at),
        ends_at: utcToLocalInput(s.ends_at),
        session_url: s.session_url || "",
      })),
      materials: (materialsData || []).map((m) => ({
        type: m.type,
        title: m.title,
        description: m.description || "",
        url: m.url,
        thumbnail_url: m.thumbnail_url || "",
        sort_order: m.sort_order,
        is_free: m.is_free,
      })),
    });
    setCoverFile(null);
    setCoverPreview(event.cover_url || null);
    setIsModalOpen(true);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas arquivos de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const uploadCover = async (): Promise<string | null> => {
    if (!coverFile) return coverPreview; // Return existing URL if no new file
    
    setIsUploading(true);
    try {
      const ext = coverFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-covers")
        .upload(fileName, coverFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("event-covers")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload da imagem");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const addSession = () => {
    setFormData((prev) => ({
      ...prev,
      sessions: [...prev.sessions, { starts_at: "", ends_at: "", session_url: "" }],
    }));
  };

  const removeSession = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((_, i) => i !== index),
    }));
  };

  const updateSession = (index: number, field: keyof SessionInput, value: string) => {
    setFormData((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const addMaterial = () => {
    setFormData((prev) => ({
      ...prev,
      materials: [
        ...prev.materials,
        {
          type: "video",
          title: "",
          description: "",
          url: "",
          thumbnail_url: "",
          sort_order: prev.materials.length,
          is_free: false,
        },
      ],
    }));
  };

  const removeMaterial = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
    }));
  };

  const updateMaterial = (index: number, field: keyof MaterialFormItem, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
  };

  const handleSubmit = async (publish: boolean) => {
    if (!formData.title.trim()) return;

    const coverUrl = await uploadCover();

    const validMaterials = formData.materials.filter((m) => m.title.trim() && m.url.trim());

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      event_type: formData.event_type,
      modality: formData.modality,
      price: formData.is_free ? 0 : parseFloat(formData.price) || 0,
      is_free: formData.is_free,
      location: formData.location.trim() || null,
      max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
      checkout_url: formData.checkout_url.trim() || null,
      access_url: formData.access_url.trim() || null,
      youtube_url: formData.youtube_url.trim() || null,
      meet_url: formData.meet_url.trim() || null,
      ticto_offer_id: formData.ticto_offer_id.trim() || null,
      is_published: publish,
      cover_url: coverUrl,
      sessions: formData.sessions.filter((s) => s.starts_at && s.ends_at),
      materials: validMaterials,
    };

    if (selectedEvent) {
      await updateEvent.mutateAsync({ id: selectedEvent.id, ...payload });
    } else {
      await createEvent.mutateAsync(payload);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    await deleteEvent.mutateAsync(selectedEvent.id);
    setDeleteDialogOpen(false);
    setSelectedEvent(null);
  };

  const columns = [
    {
      key: "event",
      header: "Evento",
      render: (event: AdminEvent) => (
        <div className="flex items-center gap-3">
          {event.cover_url ? (
            <img
              src={event.cover_url}
              alt={event.title}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
              <CalendarBlank className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <p className="font-medium">{event.title}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (event: AdminEvent) => (
        <Badge variant="secondary" className="text-xs capitalize">
          {typeOptions.find((t) => t.value === event.event_type)?.label || event.event_type}
        </Badge>
      ),
    },
    {
      key: "modality",
      header: "Modalidade",
      render: (event: AdminEvent) => (
        <span className="text-sm capitalize">
          {modalityOptions.find((m) => m.value === event.modality)?.label || event.modality}
        </span>
      ),
    },
    {
      key: "price",
      header: "Preço",
      render: (event: AdminEvent) => (
        <span className="text-sm">
          {event.is_free ? "Gratuito" : `R$ ${Number(event.price).toFixed(2).replace(".", ",")}`}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (event: AdminEvent) => (
        <Badge variant={event.is_published ? "default" : "secondary"}>
          {event.is_published ? "Publicado" : "Rascunho"}
        </Badge>
      ),
    },
    {
      key: "sessions",
      header: "Sessões",
      render: (event: AdminEvent) => (
        <span className="text-sm text-muted-foreground">
          {event.sessions.length > 0
            ? event.sessions
                .slice(0, 2)
                .map((s) => format(new Date(s.starts_at), "dd/MM", { locale: ptBR }))
                .join(", ")
            : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      render: (event: AdminEvent) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => openEditModal(event)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedEvent(event);
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
            <h1 className="text-2xl font-bold">Eventos</h1>
            <p className="text-muted-foreground">Gerencie workshops, palestras e mais</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>

        <DataTable data={events || []} columns={columns} loading={isLoading} />
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? "Editar Evento" : "Novo Evento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Cover Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Imagem de capa</label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="relative cursor-pointer border-2 border-dashed border-border rounded-xl overflow-hidden transition-colors hover:border-muted-foreground/50"
              >
                {coverPreview ? (
                  <div className="relative aspect-video">
                    <img
                      src={coverPreview}
                      alt="Preview da capa"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-center text-white">
                        <UploadSimple className="w-6 h-6 mx-auto mb-1" />
                        <span className="text-sm">Trocar imagem</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCoverFile(null);
                        setCoverPreview(null);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Image className="w-10 h-10 mb-2" />
                    <p className="text-sm font-medium">Arraste uma imagem ou clique para selecionar</p>
                    <p className="text-xs mt-1">PNG, JPG ou WebP • Máx. 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Título *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="Título do evento"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Descrição do evento..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select
                  value={formData.event_type}
                  onValueChange={(v) => setFormData((p) => ({ ...p, event_type: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Modalidade</label>
                <Select
                  value={formData.modality}
                  onValueChange={(v) => setFormData((p) => ({ ...p, modality: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {modalityOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Preço (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                  disabled={formData.is_free}
                  placeholder="0,00"
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch
                  checked={formData.is_free}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, is_free: v }))}
                />
                <label className="text-sm">Gratuito</label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Localização</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                placeholder="URL da sala virtual ou endereço"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Máx. participantes</label>
                <Input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData((p) => ({ ...p, max_participants: e.target.value }))}
                  placeholder="Ilimitado"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ID oferta Ticto</label>
                <Input
                  value={formData.ticto_offer_id}
                  onChange={(e) => setFormData((p) => ({ ...p, ticto_offer_id: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">URL de checkout</label>
              <Input
                value={formData.checkout_url}
                onChange={(e) => setFormData((p) => ({ ...p, checkout_url: e.target.value }))}
                placeholder="https://checkout.ticto.app/..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">URL da área de membros</label>
              <Input
                value={formData.access_url}
                onChange={(e) => setFormData((p) => ({ ...p, access_url: e.target.value }))}
                placeholder="https://members.ticto.app/..."
              />
              <p className="text-xs text-muted-foreground">Link para quem já tem acesso ao evento</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">URL do YouTube</label>
                <Input
                  value={formData.youtube_url}
                  onChange={(e) => setFormData((p) => ({ ...p, youtube_url: e.target.value }))}
                  placeholder="https://youtube.com/..."
                />
                <p className="text-xs text-muted-foreground">Transmissão do podcast/live</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL do Google Meet</label>
                <Input
                  value={formData.meet_url}
                  onChange={(e) => setFormData((p) => ({ ...p, meet_url: e.target.value }))}
                  placeholder="https://meet.google.com/..."
                />
                <p className="text-xs text-muted-foreground">Sala para participantes</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sessões</label>
                <Button variant="outline" size="sm" onClick={addSession}>
                  <Plus className="w-3 h-3 mr-1" />
                  Adicionar sessão
                </Button>
              </div>

              {formData.sessions.map((session, idx) => (
                <div key={idx} className="p-3 bg-secondary/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Sessão {idx + 1}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSession(idx)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Início</label>
                      <Input
                        type="datetime-local"
                        value={session.starts_at}
                        onChange={(e) => updateSession(idx, "starts_at", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Fim</label>
                      <Input
                        type="datetime-local"
                        value={session.ends_at}
                        onChange={(e) => updateSession(idx, "ends_at", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">URL da sala</label>
                    <Input
                      value={session.session_url || ""}
                      onChange={(e) => updateSession(idx, "session_url", e.target.value)}
                      placeholder="Opcional"
                      className="text-sm"
                    />
                  </div>
                </div>
              ))}

              {formData.sessions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma sessão adicionada
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleSubmit(false)}
                disabled={createEvent.isPending || updateEvent.isPending || isUploading}
              >
                {isUploading ? "Enviando..." : "Salvar rascunho"}
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleSubmit(true)}
                disabled={createEvent.isPending || updateEvent.isPending || isUploading}
              >
                {isUploading ? "Enviando..." : "Publicar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O evento e todas as sessões serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
