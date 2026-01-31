import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Camera, 
  User as UserIcon, 
  Spinner, 
  MapPin, 
  Briefcase,
  GraduationCap,
  Sparkle,
  Robot
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/AppLayout";
import { ProfileFormSection } from "@/components/profile/ProfileFormSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  BRAZILIAN_STATES,
  OCCUPATION_TYPES,
  INDUSTRIES,
  EDUCATION_LEVELS,
  AI_EXPERIENCE_LEVELS,
  AI_GOALS,
} from "@/lib/constants/profile";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  occupation_type: string | null;
  company_name: string | null;
  job_title: string | null;
  industry: string | null;
  education: string | null;
  skills: string[] | null;
  hobbies: string | null;
  bio: string | null;
  ai_experience_level: string | null;
  goals: string | null;
}

export default function PersonalData() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    city: "",
    state: "",
    occupation_type: "",
    company_name: "",
    job_title: "",
    industry: "",
    education: "",
    skills: "",
    hobbies: "",
    bio: "",
    ai_experience_level: "",
    goals: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      fetchProfile();
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        full_name: data?.full_name || "",
        city: data?.city || "",
        state: data?.state || "",
        occupation_type: data?.occupation_type || "",
        company_name: data?.company_name || "",
        job_title: data?.job_title || "",
        industry: data?.industry || "",
        education: data?.education || "",
        skills: data?.skills?.join(", ") || "",
        hobbies: data?.hobbies || "",
        bio: data?.bio || "",
        ai_experience_level: data?.ai_experience_level || "",
        goals: data?.goals || "",
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
      toast.success("Foto atualizada com sucesso!");
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error("Erro ao atualizar foto");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const skillsArray = formData.skills
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          city: formData.city || null,
          state: formData.state || null,
          occupation_type: formData.occupation_type || null,
          company_name: formData.company_name || null,
          job_title: formData.job_title || null,
          industry: formData.industry || null,
          education: formData.education || null,
          skills: skillsArray.length > 0 ? skillsArray : null,
          hobbies: formData.hobbies || null,
          bio: formData.bio || null,
          ai_experience_level: formData.ai_experience_level || null,
          goals: formData.goals || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Dados atualizados com sucesso!");
      setProfile(prev => prev ? {
        ...prev,
        ...formData,
        skills: skillsArray.length > 0 ? skillsArray : null,
      } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Erro ao atualizar dados");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const hasChanges = () => {
    if (!profile) return false;
    const skillsString = profile.skills?.join(", ") || "";
    return (
      formData.full_name !== (profile.full_name || "") ||
      formData.city !== (profile.city || "") ||
      formData.state !== (profile.state || "") ||
      formData.occupation_type !== (profile.occupation_type || "") ||
      formData.company_name !== (profile.company_name || "") ||
      formData.job_title !== (profile.job_title || "") ||
      formData.industry !== (profile.industry || "") ||
      formData.education !== (profile.education || "") ||
      formData.skills !== skillsString ||
      formData.hobbies !== (profile.hobbies || "") ||
      formData.bio !== (profile.bio || "") ||
      formData.ai_experience_level !== (profile.ai_experience_level || "") ||
      formData.goals !== (profile.goals || "")
    );
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-4">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Dados pessoais</h1>
        </motion.div>

        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-secondary">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <Spinner className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {uploadingAvatar ? "Enviando..." : "Toque para alterar a foto"}
          </p>
        </motion.div>

        {/* Form Sections */}
        <div className="space-y-4">
          {/* Seção 1 - Informações Básicas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ProfileFormSection icon={<UserIcon className="h-5 w-5" />} title="Informações básicas">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange("full_name", e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>

              <div className="space-y-2">
                <Label>Membro desde</Label>
                <Input
                  value={user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  }) : '-'}
                  disabled
                  className="bg-muted"
                />
              </div>
            </ProfileFormSection>
          </motion.div>

          {/* Seção 2 - Localização */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <ProfileFormSection icon={<MapPin className="h-5 w-5" />} title="Localização">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="Sua cidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => handleInputChange("state", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ProfileFormSection>
          </motion.div>

          {/* Seção 3 - Dados Profissionais */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ProfileFormSection icon={<Briefcase className="h-5 w-5" />} title="Dados profissionais">
              <div className="space-y-2">
                <Label htmlFor="occupation_type">Ocupação</Label>
                <Select
                  value={formData.occupation_type}
                  onValueChange={(value) => handleInputChange("occupation_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione sua ocupação" />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCUPATION_TYPES.map((occ) => (
                      <SelectItem key={occ.value} value={occ.value}>
                        {occ.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Área de atuação</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(value) => handleInputChange("industry", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione sua área" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>
                        {ind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Empresa</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange("company_name", e.target.value)}
                  placeholder="Nome da empresa atual ou anterior"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_title">Cargo / Profissão</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => handleInputChange("job_title", e.target.value)}
                  placeholder="Ex: Desenvolvedor, Designer, Gerente"
                />
              </div>
            </ProfileFormSection>
          </motion.div>

          {/* Seção 4 - Formação */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <ProfileFormSection icon={<GraduationCap className="h-5 w-5" />} title="Formação">
              <div className="space-y-2">
                <Label htmlFor="education">Escolaridade</Label>
                <Select
                  value={formData.education}
                  onValueChange={(value) => handleInputChange("education", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu nível" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((edu) => (
                      <SelectItem key={edu.value} value={edu.value}>
                        {edu.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Habilidades</Label>
                <Input
                  id="skills"
                  value={formData.skills}
                  onChange={(e) => handleInputChange("skills", e.target.value)}
                  placeholder="Ex: Python, Marketing Digital, Gestão"
                />
                <p className="text-xs text-muted-foreground">
                  Separe as habilidades por vírgula
                </p>
              </div>
            </ProfileFormSection>
          </motion.div>

          {/* Seção 5 - Sobre Você */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ProfileFormSection icon={<Sparkle className="h-5 w-5" />} title="Sobre você">
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value.slice(0, 280))}
                  placeholder="Conte um pouco sobre você..."
                  className="resize-none"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.bio.length}/280
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hobbies">Hobbies e interesses</Label>
                <Input
                  id="hobbies"
                  value={formData.hobbies}
                  onChange={(e) => handleInputChange("hobbies", e.target.value)}
                  placeholder="Ex: Leitura, Games, Música"
                />
              </div>
            </ProfileFormSection>
          </motion.div>

          {/* Seção 6 - Experiência com IA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <ProfileFormSection icon={<Robot className="h-5 w-5" />} title="Experiência com IA">
              <div className="space-y-2">
                <Label htmlFor="ai_experience_level">Seu nível</Label>
                <Select
                  value={formData.ai_experience_level}
                  onValueChange={(value) => handleInputChange("ai_experience_level", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu nível" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">Objetivo principal</Label>
                <Select
                  value={formData.goals}
                  onValueChange={(value) => handleInputChange("goals", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="O que você busca com IA?" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_GOALS.map((goal) => (
                      <SelectItem key={goal.value} value={goal.value}>
                        {goal.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ProfileFormSection>
          </motion.div>
        </div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={saving || !hasChanges()}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
