import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, X, Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { useMyCompany } from "@/hooks/useCompany";
import { useCompanyMembers, useRespondMembership } from "@/hooks/useCompanyMembers";
import { toast } from "sonner";

export default function CompanyMembers() {
  const navigate = useNavigate();
  const { data: company, isLoading: companyLoading } = useMyCompany();
  const { data: members = [], isLoading: membersLoading } = useCompanyMembers(company?.id);
  const respond = useRespondMembership();

  const pending = members.filter((m) => m.status === "pending");
  const approved = members.filter((m) => m.status === "approved");

  const handleRespond = async (memberId: string, status: "approved" | "rejected") => {
    try {
      await respond.mutateAsync({ memberId, status });
      toast.success(status === "approved" ? "Membro aprovado!" : "Solicitação recusada");
    } catch {
      toast.error("Erro ao processar solicitação");
    }
  };

  if (companyLoading || membersLoading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-4 flex items-center justify-center h-64">
          <Spinner className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-4 text-center">
          <p className="text-muted-foreground mt-20">Você não possui uma empresa cadastrada</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/profile")}>Voltar</Button>
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
          <h1 className="text-xl font-bold">Membros - {company.name}</h1>
        </motion.div>

        {/* Pending */}
        {pending.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Pendentes ({pending.length})</h3>
            <div className="space-y-2">
              {pending.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={m.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-sm">{m.profiles?.full_name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.profiles?.full_name || "Usuário"}</p>
                      {m.job_title && <p className="text-xs text-muted-foreground">{m.job_title}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => handleRespond(m.id, "approved")} disabled={respond.isPending}>
                        <Check className="w-5 h-5" weight="bold" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRespond(m.id, "rejected")} disabled={respond.isPending}>
                        <X className="w-5 h-5" weight="bold" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Approved */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Aprovados ({approved.length})</h3>
          {approved.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum membro aprovado ainda</p>
          ) : (
            <div className="space-y-2">
              {approved.map((m) => (
                <Card key={m.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={m.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-sm">{m.profiles?.full_name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.profiles?.full_name || "Usuário"}</p>
                      {m.job_title && <p className="text-xs text-muted-foreground">{m.job_title}</p>}
                    </div>
                    <Badge variant="secondary" className="text-xs">{m.role}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
