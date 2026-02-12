import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Buildings, Globe, MapPin, InstagramLogo, LinkedinLogo, CheckCircle, UserPlus, Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/AppLayout";
import { useCompanyBySlug } from "@/hooks/useCompany";
import { useCompanyMembers, useMyMembership, useRequestMembership } from "@/hooks/useCompanyMembers";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function CompanyProfile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: company, isLoading } = useCompanyBySlug(slug);
  const { data: members = [] } = useCompanyMembers(company?.id);
  const { data: myMembership } = useMyMembership(company?.id);
  const requestMembership = useRequestMembership();

  const approvedMembers = members.filter((m) => m.status === "approved");
  const isOwner = user?.id === company?.owner_id;

  const handleRequestLink = async () => {
    if (!company) return;
    try {
      await requestMembership.mutateAsync({ companyId: company.id });
      toast.success("Solicitação enviada!");
    } catch {
      toast.error("Erro ao solicitar vínculo");
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-4">
          <Skeleton className="h-10 w-40 mb-6" />
          <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
          <Skeleton className="h-6 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-4 text-center">
          <p className="text-muted-foreground mt-20">Empresa não encontrada</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Empresa</h1>
        </motion.div>

        {/* Company Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center mb-6">
          <Avatar className="h-24 w-24 mb-3">
            <AvatarImage src={company.logo_url || undefined} />
            <AvatarFallback className="text-2xl bg-secondary"><Buildings className="w-10 h-10" /></AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{company.name}</h2>
            {company.is_verified && <CheckCircle className="w-5 h-5 text-primary" weight="fill" />}
          </div>
          {company.industry && <Badge variant="secondary" className="mt-2">{company.industry}</Badge>}
          {company.description && <p className="text-sm text-muted-foreground text-center mt-3 max-w-sm">{company.description}</p>}
        </motion.div>

        {/* Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-2 mb-6">
          {(company.city || company.state) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{[company.city, company.state].filter(Boolean).join(", ")}</span>
            </div>
          )}
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Globe className="w-4 h-4" /><span>{company.website}</span>
            </a>
          )}
          <div className="flex gap-3 mt-2">
            {company.instagram_url && (
              <a href={company.instagram_url} target="_blank" rel="noopener noreferrer"><InstagramLogo className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /></a>
            )}
            {company.linkedin_url && (
              <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer"><LinkedinLogo className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /></a>
            )}
          </div>
        </motion.div>

        {/* Action Button */}
        {user && !isOwner && !myMembership && (
          <Button className="w-full mb-6" onClick={handleRequestLink} disabled={requestMembership.isPending}>
            {requestMembership.isPending ? <Spinner className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Solicitar vínculo
          </Button>
        )}
        {myMembership?.status === "pending" && (
          <Badge variant="secondary" className="w-full justify-center py-2 mb-6">Solicitação pendente</Badge>
        )}
        {myMembership?.status === "approved" && (
          <Badge className="w-full justify-center py-2 mb-6 bg-green-500/10 text-green-500 border-green-500/20">Você é membro desta empresa</Badge>
        )}
        {isOwner && (
          <div className="flex gap-2 mb-6">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/profile/company")}>Editar</Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate("/profile/company/members")}>Membros</Button>
          </div>
        )}

        {/* Members */}
        {approvedMembers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h3 className="text-lg font-semibold mb-3">Colaboradores ({approvedMembers.length})</h3>
            <div className="space-y-2">
              {approvedMembers.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={m.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-sm">{m.profiles?.full_name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{m.profiles?.full_name || "Usuário"}</p>
                      {m.job_title && <p className="text-xs text-muted-foreground">{m.job_title}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
