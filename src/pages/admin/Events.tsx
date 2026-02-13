import { useState } from "react";
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
} from "@/hooks/useAdminEvents";
import { Plus, Pencil, Trash, CalendarBlank, X } from "@phosphor-icons/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeOptions = [
  { value: "workshop", label: "Workshop" },
  { value: "palestra", label: "Palestra" },
  { value: "live", label: "Live" },
  { value: "aula_ao_vivo", label: "Aula ao Vivo" },
  { value: "mentoria", label: "Mentoria" },
  { value: "curso", label: "Curso" },
];

const modalityOptions = [
  { value: "online", label: "Online" },
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Híbrido" },
];

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
  ticto_offer_id: string;
  sessions: SessionInput[];
}

const emptyForm: FormData = {
  title: "",
  description: "",
  event_type: "workshop",
  modality: "online",
  price: "0",
  is_free: false,
  location: "",
  max_participants: "",
  checkout_url: "",
  ticto_offer_id: "",
  sessions: [],
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

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedEvent(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (event: AdminEvent) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      event_type: event.event_type,
      modality: event.modality,
      price: String(event.price ?? 0),
      is_free: event.is_free,
      location: event.location || "",
      max_participants: event.max_participants ? String(event.max_participants) : "",
      checkout_url: event.checkout_url || "",
      ticto_offer_id: event.ticto_offer_id || "",
      sessions: event.sessions.map((s) => ({
        starts_at: s.starts_at.slice(0, 16),
        ends_at: s.ends_at.slice(0, 16),
        session_url: s.session_url || "",
      })),
    });
    setIsModalOpen(true);
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

  const handleSubmit = async (publish: boolean) => {
    if (!formData.title.trim()) return;

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
      ticto_offer_id: formData.ticto_offer_id.trim() || null,
      is_published: publish,
      sessions: formData.sessions.filter((s) => s.starts_at && s.ends_at),
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
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <CalendarBlank className="w-5 h-5 text-muted-foreground" />
          </div>
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

            {/* Sessions */}
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
                disabled={createEvent.isPending || updateEvent.isPending}
              >
                Salvar rascunho
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleSubmit(true)}
                disabled={createEvent.isPending || updateEvent.isPending}
              >
                Publicar
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
