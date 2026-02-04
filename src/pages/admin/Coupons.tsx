import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  DotsThree,
  Copy,
  Power,
  Trash,
  Ticket,
  Export,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  useCoupons,
  useCreateCoupons,
  useToggleCouponStatus,
  useDeleteCoupon,
  PromoCoupon,
} from "@/hooks/useCoupons";

export default function Coupons() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [daysGranted, setDaysGranted] = useState(30);
  const [expiresAt, setExpiresAt] = useState("");

  const { data: coupons, isLoading } = useCoupons();
  const createCoupons = useCreateCoupons();
  const toggleStatus = useToggleCouponStatus();
  const deleteCoupon = useDeleteCoupon();

  const handleCreate = async () => {
    if (quantity < 1 || quantity > 100) {
      toast.error("Quantidade deve ser entre 1 e 100");
      return;
    }

    if (daysGranted < 1 || daysGranted > 365) {
      toast.error("Dias deve ser entre 1 e 365");
      return;
    }

    await createCoupons.mutateAsync({
      prefix: prefix || undefined,
      quantity,
      daysGranted,
      expiresAt: expiresAt || undefined,
    });

    setIsCreateOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setPrefix("");
    setQuantity(1);
    setDaysGranted(30);
    setExpiresAt("");
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  const exportUnusedCoupons = () => {
    const unused = coupons?.filter((c) => c.current_uses === 0 && c.is_active) || [];
    const csv = unused.map((c) => c.code).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cupons-nao-usados-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${unused.length} cupons exportados`);
  };

  const getCouponStatus = (coupon: PromoCoupon) => {
    if (!coupon.is_active) return { label: "Inativo", variant: "secondary" as const };
    if (coupon.current_uses >= coupon.max_uses) return { label: "Esgotado", variant: "destructive" as const };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { label: "Expirado", variant: "destructive" as const };
    return { label: "Ativo", variant: "default" as const };
  };

  const stats = {
    total: coupons?.length || 0,
    active: coupons?.filter((c) => c.is_active && c.current_uses < c.max_uses).length || 0,
    used: coupons?.filter((c) => c.current_uses > 0).length || 0,
    unused: coupons?.filter((c) => c.current_uses === 0).length || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cupons Promocionais</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie cupons de acesso gratuito à plataforma
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportUnusedCoupons} disabled={!coupons?.length}>
              <Export className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Cupons
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Cupons</DialogTitle>
                  <DialogDescription>
                    Gere novos cupons promocionais de uso único
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="prefix">Prefixo (opcional)</Label>
                    <Input
                      id="prefix"
                      placeholder="Ex: BLACKFRIDAY, PROMO"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                      maxLength={12}
                    />
                    <p className="text-xs text-muted-foreground">
                      O código será: {prefix || "SUB"}-XXXX-YYYY-ZZZZ
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Quantidade</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      max={100}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="days">Dias de acesso</Label>
                    <Input
                      id="days"
                      type="number"
                      min={1}
                      max={365}
                      value={daysGranted}
                      onChange={(e) => setDaysGranted(parseInt(e.target.value) || 30)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expires">Data de expiração (opcional)</Label>
                    <Input
                      id="expires"
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Deixe vazio para não expirar
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={createCoupons.isPending}>
                    {createCoupons.isPending ? "Criando..." : `Criar ${quantity} cupom(ns)`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <Power className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Copy className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Utilizados</p>
                <p className="text-2xl font-bold">{stats.used}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <Ticket className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Não usados</p>
                <p className="text-2xl font-bold">{stats.unused}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : coupons?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Nenhum cupom criado ainda
                  </TableCell>
                </TableRow>
              ) : (
                coupons?.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="font-mono text-sm hover:text-primary transition-colors flex items-center gap-2"
                          title="Clique para copiar"
                        >
                          {coupon.code}
                          <Copy className="w-3 h-3 opacity-50" />
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>{coupon.days_granted}</TableCell>
                      <TableCell>
                        {coupon.current_uses}/{coupon.max_uses}
                      </TableCell>
                      <TableCell>
                        {coupon.expires_at
                          ? format(new Date(coupon.expires_at), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(coupon.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <DotsThree className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyCode(coupon.code)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Copiar código
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toggleStatus.mutate({
                                  id: coupon.id,
                                  is_active: !coupon.is_active,
                                })
                              }
                            >
                              <Power className="w-4 h-4 mr-2" />
                              {coupon.is_active ? "Desativar" : "Ativar"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteCoupon.mutate(coupon.id)}
                            >
                              <Trash className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
