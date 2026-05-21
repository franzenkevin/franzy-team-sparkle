import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, ChevronRight, Camera, Dumbbell, Apple, FileText, Heart, UserPlus, Copy, CheckCircle2, Clock } from "lucide-react";
import { adminCreateStudent } from "@/lib/adminStudents.functions";

export const Route = createFileRoute("/_authenticated/admin/clients/")({
  component: ClientsList,
});

type Row = {
  user_id: string; full_name: string | null; goal: string | null;
  age: number | null; sex: string | null; weight: number | null; height: number | null;
  anamnese_completed_at: string | null;
  photo_front_url: string | null; photo_back_url: string | null;
  plan: string | null; plan_start: string | null; plan_end: string | null;
  account_status: string | null; first_access_at: string | null;
  anamnese_extra: any | null;
};

type ProtocolCount = { count: number; hasTraining: boolean; hasDiet: boolean; endDate: string | null };

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}

function daysRemaining(endDate: string | null) {
  if (!endDate) return null;
  const ms = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 86400_000));
}

function anamneseStatus(r: Row): "completa" | "parcial" | "nao" {
  if (r.anamnese_completed_at) return "completa";
  const fields = [r.age, r.sex, r.weight, r.height, r.goal, (r as any).activity_level];
  const filled = fields.filter((v) => v != null && v !== "").length;
  if (filled > 0) return "parcial";
  return "nao";
}

function ClientsList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [prots, setProts] = useState<Record<string, ProtocolCount>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "anamnese" | "no_anamnese" | "no_training" | "no_diet">("all");
  const [openCreate, setOpenCreate] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: protocols }] = await Promise.all([
      supabase.from("profiles")
        .select("user_id, full_name, goal, age, sex, weight, height, anamnese_completed_at, photo_front_url, photo_back_url, plan, plan_start, plan_end, account_status, first_access_at")
        .order("created_at", { ascending: false }),
      supabase.from("protocols").select("user_id, status, end_date, training, diet"),
    ]);
    setRows((profiles ?? []) as Row[]);
    const map: Record<string, ProtocolCount> = {};
    for (const p of (protocols ?? []) as any[]) {
      const m = map[p.user_id] ?? { count: 0, hasTraining: false, hasDiet: false, endDate: null };
      m.count += 1;
      if (p.status === "active") {
        m.hasTraining = !!p.training && Object.keys(p.training ?? {}).length > 0;
        m.hasDiet = !!p.diet && Object.keys(p.diet ?? {}).length > 0;
        m.endDate = p.end_date ?? null;
      }
      map[p.user_id] = m;
    }
    setProts(map);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await reload();
    })();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (q && !(r.full_name ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      const prot = prots[r.user_id];
      if (filterStatus === "anamnese" && !r.anamnese_completed_at) return false;
      if (filterStatus === "no_anamnese" && r.anamnese_completed_at) return false;
      if (filterStatus === "no_training" && prot?.hasTraining) return false;
      if (filterStatus === "no_diet" && prot?.hasDiet) return false;
      return true;
    });
  }, [rows, q, filterStatus, prots]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-heading font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">{rows.length} clientes cadastrados</p>
        </div>
        <Button onClick={() => setOpenCreate(true)} className="gap-2">
          <UserPlus size={16} /> Cadastrar aluno
        </Button>
      </div>

      <CreateStudentDialog open={openCreate} onOpenChange={setOpenCreate} onCreated={reload} />

      <Card className="p-4 space-y-3">
        <div className="grid sm:grid-cols-[1fr_240px] gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome…" className="pl-9" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="all">Todos os status</option>
            <option value="anamnese">Com anamnese</option>
            <option value="no_anamnese">Sem anamnese</option>
            <option value="no_training">Sem treino ativo</option>
            <option value="no_diet">Sem dieta ativa</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} resultado(s)</p>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const prot = prots[r.user_id];
            const dr = daysRemaining(prot?.endDate ?? r.plan_end ?? null);
            const hasTraining = !!prot?.hasTraining;
            const hasDiet = !!prot?.hasDiet;
            const protocolCount = prot?.count ?? 0;
            const isPending = r.account_status === "pending" || !r.first_access_at;
            const anStatus = anamneseStatus(r);
            return (
              <Link key={r.user_id} to="/admin/clients/$id" params={{ id: r.user_id }}>
                <Card className="p-4 hover:border-primary/60 transition flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/15 text-primary font-bold">{initials(r.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{r.full_name ?? "(sem nome)"}</p>
                      <Badge variant={isPending ? "outline" : "default"} className="text-[10px]">
                        {isPending ? <><Clock size={10} className="mr-1" />Pendente</> : <><CheckCircle2 size={10} className="mr-1" />Ativo</>}
                      </Badge>
                      {r.plan && <Badge variant="secondary" className="text-[10px]">{r.plan}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.sex ?? "—"} · {r.age ?? "—"}a · {r.weight ?? "—"}kg · {r.goal ?? "sem objetivo"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={anStatus === "completa" ? "default" : anStatus === "parcial" ? "secondary" : "outline"} className="text-[10px]">
                        <FileText size={10} className="mr-1" />
                        {anStatus === "completa" ? "Anamnese completa" : anStatus === "parcial" ? "Anamnese parcial" : "Sem anamnese"}
                      </Badge>
                      <Badge variant={r.photo_front_url ? "default" : "outline"} className="text-[10px]">
                        <Camera size={10} className="mr-1" />Fotos
                      </Badge>
                      <Badge variant={hasTraining ? "default" : "outline"} className="text-[10px]">
                        <Dumbbell size={10} className="mr-1" />Treino
                      </Badge>
                      <Badge variant={hasDiet ? "default" : "outline"} className="text-[10px]">
                        <Apple size={10} className="mr-1" />Dieta
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {protocolCount} prescriç{protocolCount === 1 ? "ão" : "ões"}
                      </Badge>
                      {dr != null && (
                        <Badge variant="outline" className="text-[10px]">
                          <Heart size={10} className="mr-1" />{dr}d restantes
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="text-muted-foreground shrink-0" size={18} />
                </Card>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <Card className="p-10 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</Card>
          )}
        </div>
      )}
    </div>
  );
}

function CreateStudentDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const create = useServerFn(adminCreateStudent);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("");
  const [planStart, setPlanStart] = useState<string>(new Date().toISOString().slice(0, 10));
  const [planEnd, setPlanEnd] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 60); return d.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const reset = () => {
    setFullName(""); setEmail(""); setPassword(""); setPlan("");
    setPlanStart(new Date().toISOString().slice(0, 10));
    const d = new Date(); d.setDate(d.getDate() + 60);
    setPlanEnd(d.toISOString().slice(0, 10));
    setCreated(null);
  };

  const submit = async () => {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      toast.error("Preencha nome, e-mail e senha (mín. 6 caracteres).");
      return;
    }
    setSaving(true);
    try {
      const res: any = await create({ data: {
        fullName, email, password,
        plan: plan || null, planStart: planStart || null, planEnd: planEnd || null,
      }});
      setCreated(res.credentials);
      toast.success("Aluno cadastrado!");
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao cadastrar");
    } finally {
      setSaving(false);
    }
  };

  const welcomeText = created
    ? `Olá ${fullName}! 🎉\n\nSeu acesso à Franzen Team está liberado:\n\nE-mail: ${created.email}\nSenha: ${created.password}\n\nPlano: ${plan || "—"}\nVigência: ${planStart} até ${planEnd}\n\nAcesse https://franzy-team-sparkle.lovable.app e complete sua anamnese para liberar seu protocolo.`
    : "";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{created ? "Aluno cadastrado" : "Cadastrar novo aluno"}</DialogTitle>
        </DialogHeader>

        {!created ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Senha (mín. 6)</Label>
              <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Defina uma senha inicial" />
            </div>
            <div className="space-y-1.5">
              <Label>Plano contratado</Label>
              <Input value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Ex: Premium 60 dias" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input type="date" value={planStart} onChange={(e) => setPlanStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fim</Label>
                <Input type="date" value={planEnd} onChange={(e) => setPlanEnd(e.target.value)} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">Copie e envie esta mensagem de boas-vindas para o aluno (WhatsApp/e-mail):</p>
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/50 p-3 text-xs">{welcomeText}</pre>
            <Button variant="outline" className="w-full gap-2" onClick={() => { navigator.clipboard.writeText(welcomeText); toast.success("Mensagem copiada!"); }}>
              <Copy size={14} /> Copiar mensagem
            </Button>
          </div>
        )}

        <DialogFooter>
          {!created ? (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={saving}>{saving ? "Cadastrando…" : "Cadastrar"}</Button>
            </>
          ) : (
            <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
