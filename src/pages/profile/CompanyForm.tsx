import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Camera, Spinner, Buildings, Globe, MapPin, ShareNetwork
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/AppLayout";
import { ProfileFormSection } from "@/components/profile/ProfileFormSection";
import { useAuth } from "@/hooks/useAuth";
import { useMyCompany, useCreateCompany, useUpdateCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BRAZILIAN_STATES, INDUSTRIES } from "@/lib/constants/profile";

export default function CompanyForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: company, isLoading } = useMyCompany();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    website: "",
    industry: "",
    city: "",
    state: "",
    cnpj: "",
    instagram_url: "",
    linkedin_url: "",
  });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || "",
        description: company.description || "",
        website: company.website || "",
        industry: company.industry || "",
        city: company.city || "",
        state: company.state || "",
        cnpj: company.cnpj || "",
        instagram_url: company.instagram_url || "",
        linkedin_url: company.linkedin_url || "",
      });
      setLogoUrl(company.logo_url);
    }
  }, [company]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB"); return; }

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `companies/${user.id}/logo.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setLogoUrl(`${urlData.publicUrl}?t=${Date.now()}`);
      toast.success("Logo atualizado!");
    } catch {
      toast.error("Erro ao enviar logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome da empresa é obrigatório"); return; }

    const payload = {
      name: form.name,
      description: form.description || null,
      logo_url: logoUrl,
      website: form.website || null,
      industry: form.industry || null,
      city: form.city || null,
      state: form.state || null,
      cnpj: form.cnpj || null,
      instagram_url: form.instagram_url || null,
      linkedin_url: form.linkedin_url || null,
    };

    try {
      if (company) {
        await updateCompany.mutateAsync({ id: company.id, ...payload });
      } else {
        await createCompany.mutateAsync(payload);
      }
      toast.success(company ? "Empresa atualizada!" : "Empresa cadastrada!");
      navigate("/profile");
    } catch {
      toast.error("Erro ao salvar empresa");
    }
  };

  const saving = createCompany.isPending || updateCompany.isPending;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-4 flex items-center justify-center h-64">
          <Spinner className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{company ? "Editar empresa" : "Cadastrar empresa"}</h1>
        </motion.div>

        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center mb-8">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={logoUrl || undefined} />
              <AvatarFallback className="text-2xl bg-secondary">
                <Buildings className="w-10 h-10" />
              </AvatarFallback>
            </Avatar>
            <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 h-8 w-8 rounded-full" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}>
              {uploadingLogo ? <Spinner className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{uploadingLogo ? "Enviando..." : "Logo da empresa"}</p>
        </motion.div>

        <div className="space-y-4">
          <ProfileFormSection icon={<Buildings className="h-5 w-5" />} title="Dados da empresa">
            <div className="space-y-2">
              <Label>Nome da empresa *</Label>
              <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Nome da empresa" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => handleChange("description", e.target.value.slice(0, 500))} placeholder="Sobre a empresa..." className="resize-none" rows={3} />
              <p className="text-xs text-muted-foreground text-right">{form.description.length}/500</p>
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => handleChange("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label>Área de atuação</Label>
              <Select value={form.industry} onValueChange={(v) => handleChange("industry", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </ProfileFormSection>

          <ProfileFormSection icon={<MapPin className="h-5 w-5" />} title="Localização">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => handleChange("city", e.target.value)} placeholder="Cidade" />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.state} onValueChange={(v) => handleChange("state", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </ProfileFormSection>

          <ProfileFormSection icon={<Globe className="h-5 w-5" />} title="Web">
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => handleChange("website", e.target.value)} placeholder="https://suaempresa.com" />
            </div>
          </ProfileFormSection>

          <ProfileFormSection icon={<ShareNetwork className="h-5 w-5" />} title="Redes sociais">
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input value={form.instagram_url} onChange={(e) => handleChange("instagram_url", e.target.value)} placeholder="https://instagram.com/empresa" />
            </div>
            <div className="space-y-2">
              <Label>LinkedIn</Label>
              <Input value={form.linkedin_url} onChange={(e) => handleChange("linkedin_url", e.target.value)} placeholder="https://linkedin.com/company/empresa" />
            </div>
          </ProfileFormSection>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6">
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : company ? "Salvar alterações" : "Cadastrar empresa"}
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
