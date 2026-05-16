import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Save, Shield, Users, ClipboardList, MessageSquare, History as HistoryIcon,
  ShieldCheck, ShieldOff, BarChart3, AlertTriangle, Dumbbell, Plus, Pencil, Trash2,
  Search, Trophy, Bell, Send, Heart, Activity,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel do Criador — Franzen Team" }] }),
  component: AdminPage,
});

type ProfileRow = {
  user_id: string; full_name: string | null; goal: string | null;
  age: number | null; sex: string | null; weight: number | null; height: number | null;
};
type ProtocolRow = { id: string; user_id: string; status: string; version: number; training: any; diet: any; start_date: string; end_date: string; created_at: string };
type CheckinRow = { id: string; user_id: string; created_at: string; weight: number | null; adherence: number | null; notes: string | null; photo_front: string | null; photo_side: string | null; photo_back: string | null };
type FeedbackRow = { id: string; user_id: string; session_date: string; day_index: number; rating: number; notes: string | null };
type ExerciseRow = { id: string; name: string; category: string; equipment: string | null; video_url: string | null; instructions: string | null };
type LogRow = { id: string; user_id: string; session_date: string; exercise_name: string; sets: any; notes: string | null; created_at: string };

type Metrics = {
  totalUsers: number;
  activeProtocols: number;
  checkinsLast7: number;
  workoutsLast7: number;
  avgAdherence: number | null;
  atRisk: { user_id: string; full_name: string | null; lastCheckin: string | null }[];
};

function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Parent _authenticated layout already guarantees a session.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { if (!cancelled) setChecking(false); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (cancelled) return;
      if (!roles) { setChecking(false); return; }
      setIsAdmin(true);
      setChecking(false);

      // Load profiles and metrics in background — do NOT block access gate.
      const { data: rows } = await supabase
        .from("profiles").select("user_id, full_name, goal, age, sex, weight, height")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setProfiles(rows ?? []);

      const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [
        { count: totalUsers },
        { count: activeProtocols },
        { count: checkinsLast7 },
        { count: workoutsLast7 },
        { data: adherence },
        { data: lastCheckins },
      ] = await Promise.all([
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("protocols").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("checkins").select("id", { count: "exact", head: true }).gte("created_at", sevenAgo),
        supabase.from("workout_logs").select("id", { count: "exact", head: true }).gte("created_at", sevenAgo),
        supabase.from("checkins").select("adherence").not("adherence", "is", null).gte("created_at", sevenAgo),
        supabase.from("checkins").select("user_id, created_at").order("created_at", { ascending: false }).limit(1000),
      ]);
      if (cancelled) return;
      const adherenceVals = (adherence ?? []).map((r: any) => Number(r.adherence)).filter((n: number) => !isNaN(n));
      const avgAdherence = adherenceVals.length
        ? Math.round(adherenceVals.reduce((a: number, b: number) => a + b, 0) / adherenceVals.length)
        : null;
      const lastByUser = new Map<string, string>();
      for (const r of (lastCheckins ?? []) as { user_id: string; created_at: string }[]) {
        if (!lastByUser.has(r.user_id)) lastByUser.set(r.user_id, r.created_at);
      }
      const tenAgo = Date.now() - 10 * 86400_000;
      const atRisk = (rows ?? [])
        .map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          lastCheckin: lastByUser.get(p.user_id) ?? null,
        }))
        .filter((p) => !p.lastCheckin || new Date(p.lastCheckin).getTime() < tenAgo)
        .slice(0, 20);
      setMetrics({
        totalUsers: totalUsers ?? 0,
        activeProtocols: activeProtocols ?? 0,
        checkinsLast7: checkinsLast7 ?? 0,
        workoutsLast7: workoutsLast7 ?? 0,
        avgAdherence,
        atRisk,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  if (checking) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Verificando acesso…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center max-w-md">
          <Shield className="mx-auto text-muted-foreground" size={48} />
          <h1 className="mt-4 text-2xl font-heading font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta área é apenas para administradores.</p>
          <Link to="/dashboard"><Button className="mt-6">Voltar ao dashboard</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <ShieldCheck className="text-primary" /> Painel do Criador
          </h1>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="w-full flex flex-wrap h-auto justify-start gap-1">
            <TabsTrigger value="overview" className="gap-1"><BarChart3 size={14} />Visão geral</TabsTrigger>
            <TabsTrigger value="users" className="gap-1"><Users size={14} />Usuários</TabsTrigger>
            <TabsTrigger value="exercises" className="gap-1"><Dumbbell size={14} />Exercícios</TabsTrigger>
            <TabsTrigger value="checkins" className="gap-1"><ClipboardList size={14} />Check-ins</TabsTrigger>
            <TabsTrigger value="feedback" className="gap-1"><Heart size={14} />Feedback</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1"><Activity size={14} />Logs de Treino</TabsTrigger>
            <TabsTrigger value="ranking" className="gap-1"><Trophy size={14} />Ranking</TabsTrigger>
            <TabsTrigger value="messages" className="gap-1"><MessageSquare size={14} />Mensagens</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1"><Bell size={14} />Notificações</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <OverviewTab metrics={metrics} profiles={profiles} />
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <UsersTab profiles={profiles} />
          </TabsContent>
          <TabsContent value="exercises" className="mt-4">
            <ExercisesTab />
          </TabsContent>
          <TabsContent value="checkins" className="mt-4">
            <CheckinsTab profiles={profiles} />
          </TabsContent>
          <TabsContent value="feedback" className="mt-4">
            <FeedbackTab profiles={profiles} />
          </TabsContent>
          <TabsContent value="logs" className="mt-4">
            <LogsTab profiles={profiles} />
          </TabsContent>
          <TabsContent value="ranking" className="mt-4">
            <RankingTab profiles={profiles} />
          </TabsContent>
          <TabsContent value="messages" className="mt-4">
            <MessagesTab profiles={profiles} />
          </TabsContent>
          <TabsContent value="notifications" className="mt-4">
            <NotificationsTab profiles={profiles} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-3 text-center">
      <p className="text-2xl font-bold font-heading text-primary">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </Card>
  );
}

/* ============ OVERVIEW ============ */
function OverviewTab({ metrics, profiles }: { metrics: Metrics | null; profiles: ProfileRow[] }) {
  if (!metrics) return <p className="text-sm text-muted-foreground">Carregando métricas…</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric label="Alunos" value={metrics.totalUsers} />
        <Metric label="Protocolos ativos" value={metrics.activeProtocols} />
        <Metric label="Check-ins (7d)" value={metrics.checkinsLast7} />
        <Metric label="Treinos (7d)" value={metrics.workoutsLast7} />
        <Metric label="Aderência média" value={metrics.avgAdherence != null ? `${metrics.avgAdherence}%` : "—"} />
      </div>
      {metrics.atRisk.length > 0 && (
        <Card className="p-4">
          <h3 className="font-heading font-semibold flex items-center gap-2 text-warning">
            <AlertTriangle size={16} /> Alunos em risco ({metrics.atRisk.length})
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Sem check-in há mais de 10 dias</p>
          <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
            {metrics.atRisk.map((r) => {
              const p = profiles.find((x) => x.user_id === r.user_id);
              return (
                <div key={r.user_id} className="text-sm flex justify-between border-b border-border py-1.5">
                  <span>{p?.full_name ?? "(sem nome)"}</span>
                  <span className="text-muted-foreground text-xs">
                    {r.lastCheckin ? `${Math.floor((Date.now() - new Date(r.lastCheckin).getTime()) / 86400_000)}d atrás` : "nunca"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============ USERS (com editor de protocolo + roles) ============ */
function UsersTab({ profiles }: { profiles: ProfileRow[] }) {
  const [filter, setFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [protocol, setProtocol] = useState<ProtocolRow | null>(null);
  const [history, setHistory] = useState<ProtocolRow[]>([]);
  const [trainingText, setTrainingText] = useState("{}");
  const [dietText, setDietText] = useState("{}");
  const [hormonesText, setHormonesText] = useState("[]");
  const [saving, setSaving] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [togglingRole, setTogglingRole] = useState(false);

  const filtered = profiles.filter((p) =>
    !filter || (p.full_name ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  const selectUser = async (u: ProfileRow) => {
    setSelectedUser(u);
    const [{ data: prot }, { data: hist }, { data: roleRow }] = await Promise.all([
      supabase.from("protocols").select("*").eq("user_id", u.user_id).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("protocols").select("*").eq("user_id", u.user_id).order("created_at", { ascending: false }),
      supabase.from("user_roles").select("id").eq("user_id", u.user_id).eq("role", "admin").maybeSingle(),
    ]);
    if (prot) {
      setProtocol(prot as ProtocolRow);
      setTrainingText(JSON.stringify(prot.training ?? {}, null, 2));
      setDietText(JSON.stringify(prot.diet ?? {}, null, 2));
      setHormonesText(JSON.stringify((prot as any).hormones ?? [], null, 2));
    } else {
      setProtocol(null); setTrainingText("{}"); setDietText("{}"); setHormonesText("[]");
    }
    setHistory((hist ?? []) as ProtocolRow[]);
    setIsUserAdmin(!!roleRow);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    let training: any, diet: any, hormones: any;
    try { training = JSON.parse(trainingText); } catch { toast.error("JSON do treino inválido"); return; }
    try { diet = JSON.parse(dietText); } catch { toast.error("JSON da dieta inválido"); return; }
    try { hormones = JSON.parse(hormonesText); } catch { toast.error("JSON dos hormônios inválido"); return; }
    if (!Array.isArray(hormones)) { toast.error("Hormônios deve ser uma lista [ ]"); return; }
    setSaving(true);
    if (protocol) {
      const { error } = await supabase.from("protocols")
        .update({ training, diet, hormones, version: protocol.version + 1 }).eq("id", protocol.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Protocolo atualizado");
    } else {
      const { error } = await supabase.from("protocols")
        .insert({ user_id: selectedUser.user_id, training, diet, hormones, status: "active" });
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Protocolo criado");
    }
    await selectUser(selectedUser);
  };

  const toggleAdminRole = async () => {
    if (!selectedUser) return;
    setTogglingRole(true);
    try {
      if (isUserAdmin) {
        const { error } = await supabase.from("user_roles").delete()
          .eq("user_id", selectedUser.user_id).eq("role", "admin");
        if (error) throw error;
        toast.success("Permissão de admin removida");
        setIsUserAdmin(false);
      } else {
        const { error } = await supabase.from("user_roles")
          .insert({ user_id: selectedUser.user_id, role: "admin" });
        if (error) throw error;
        toast.success("Usuário promovido a admin");
        setIsUserAdmin(true);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao alterar permissão");
    } finally { setTogglingRole(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        <Input placeholder="Buscar…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="space-y-1 max-h-[70vh] overflow-y-auto">
          {filtered.map((p) => (
            <button key={p.user_id} onClick={() => selectUser(p)}
              className={`w-full text-left rounded-md border p-3 transition ${
                selectedUser?.user_id === p.user_id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}>
              <div className="text-sm font-medium truncate">{p.full_name ?? "(sem nome)"}</div>
              <div className="text-xs text-muted-foreground truncate">{p.goal ?? "—"}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        {!selectedUser ? (
          <Card className="p-10 text-center text-muted-foreground">Selecione um usuário.</Card>
        ) : (
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="text-xl font-heading font-bold">{selectedUser.full_name ?? "(sem nome)"}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedUser.sex ?? "—"} • {selectedUser.age ?? "—"} anos • {selectedUser.weight ?? "—"}kg • {selectedUser.height ?? "—"}cm
              </p>
              <p className="text-xs text-muted-foreground">Objetivo: {selectedUser.goal ?? "—"}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm">{isUserAdmin ? "Administrador" : "Usuário comum"}</span>
                <Button size="sm" variant={isUserAdmin ? "outline" : "default"}
                  onClick={toggleAdminRole} disabled={togglingRole}>
                  {isUserAdmin ? (<><ShieldOff size={14} className="mr-1" /> Remover admin</>) : (<><ShieldCheck size={14} className="mr-1" /> Promover</>)}
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="font-heading font-semibold">Protocolo ativo</h3>
                  <p className="text-xs text-muted-foreground">
                    {protocol ? `v${protocol.version} • ${protocol.start_date} → ${protocol.end_date}` : "Sem protocolo ativo"}
                  </p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                  <Save size={14} className="mr-1" />
                  {saving ? "Salvando…" : protocol ? "Nova versão" : "Criar"}
                </Button>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <Label className="text-sm">Treino (JSON)</Label>
                  <Textarea value={trainingText} onChange={(e) => setTrainingText(e.target.value)} rows={14} className="font-mono text-xs mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Dieta (JSON)</Label>
                  <Textarea value={dietText} onChange={(e) => setDietText(e.target.value)} rows={14} className="font-mono text-xs mt-1" />
                </div>
              </div>
            </Card>

            {history.length > 0 && (
              <Card className="p-5">
                <h3 className="font-heading font-semibold flex items-center gap-2"><HistoryIcon size={16} /> Histórico ({history.length})</h3>
                <div className="mt-3 space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="flex justify-between text-sm border-b border-border py-1.5">
                      <span>v{h.version} <span className={`ml-2 text-xs px-2 py-0.5 rounded ${h.status === "active" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{h.status}</span></span>
                      <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ EXERCISES ============ */
const emptyEx: Partial<ExerciseRow> = { name: "", category: "", equipment: "", video_url: "", instructions: "" };

function ExercisesTab() {
  const [items, setItems] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ExerciseRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Partial<ExerciseRow>>(emptyEx);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("exercises").select("*").order("name");
    setItems((data ?? []) as ExerciseRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || (e.equipment ?? "").toLowerCase().includes(q);
  });

  const close = () => { setEditing(null); setCreating(false); setDraft(emptyEx); };

  const handleSave = async () => {
    if (!draft.name?.trim() || !draft.category?.trim()) {
      toast.error("Preencha nome e categoria"); return;
    }
    const payload = {
      name: draft.name.trim(),
      category: draft.category.trim(),
      equipment: draft.equipment?.trim() || null,
      video_url: draft.video_url?.trim() || null,
      instructions: draft.instructions?.trim() || null,
    };
    try {
      if (editing) {
        const { error } = await supabase.from("exercises").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Exercício atualizado");
      } else {
        const { error } = await supabase.from("exercises").insert(payload);
        if (error) throw error;
        toast.success("Exercício adicionado");
      }
      close();
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("exercises").delete().eq("id", deletingId);
    if (error) toast.error(error.message);
    else { toast.success("Exercício removido"); load(); }
    setDeletingId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="pl-9" />
        </div>
        <Button size="sm" onClick={() => { setCreating(true); setDraft(emptyEx); }}>
          <Plus size={14} className="mr-1" /> Adicionar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} de {items.length} exercícios</p>

      {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
        <div className="space-y-2">
          {filtered.slice(0, 200).map((ex) => (
            <Card key={ex.id} className="p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{ex.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {ex.category}{ex.equipment ? ` • ${ex.equipment}` : ""}{ex.video_url ? " • 🎥" : ""}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(ex); setDraft({ ...ex }); }}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingId(ex.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum exercício.</p>}
        </div>
      )}

      <Dialog open={!!editing || creating} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar exercício" : "Novo exercício"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria *</Label>
                <Input value={draft.category || ""} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Peito, Costas…" className="mt-1" />
              </div>
              <div>
                <Label>Equipamento</Label>
                <Input value={draft.equipment || ""} onChange={(e) => setDraft({ ...draft, equipment: e.target.value })} placeholder="Barra, halteres…" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>URL do vídeo</Label>
              <Input value={draft.video_url || ""} onChange={(e) => setDraft({ ...draft, video_url: e.target.value })} placeholder="https://youtube.com/…" className="mt-1" />
            </div>
            <div>
              <Label>Instruções</Label>
              <Textarea value={draft.instructions || ""} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} className="mt-1 h-24 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar exercício?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============ CHECKINS ============ */
function CheckinsTab({ profiles }: { profiles: ProfileRow[] }) {
  const [items, setItems] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("checkins").select("*").order("created_at", { ascending: false }).limit(200);
      setItems((data ?? []) as CheckinRow[]);
      setLoading(false);
    })();
  }, []);
  const nameOf = (uid: string) => profiles.find((p) => p.user_id === uid)?.full_name ?? uid.slice(0, 8);
  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!items.length) return <p className="text-sm text-muted-foreground">Nenhum check-in.</p>;
  return (
    <div className="space-y-2">
      {items.map((c) => (
        <Card key={c.id} className="p-3">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{nameOf(c.user_id)}</span>
            <span className="text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">{c.weight ?? "—"} kg • adesão {c.adherence ?? "—"}%</div>
          {c.notes && <p className="text-sm mt-2 whitespace-pre-wrap">{c.notes}</p>}
        </Card>
      ))}
    </div>
  );
}

/* ============ FEEDBACK ============ */
function FeedbackTab({ profiles }: { profiles: ProfileRow[] }) {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("workout_feedback").select("*").order("session_date", { ascending: false }).limit(200);
      setItems((data ?? []) as FeedbackRow[]);
      setLoading(false);
    })();
  }, []);
  const nameOf = (uid: string) => profiles.find((p) => p.user_id === uid)?.full_name ?? uid.slice(0, 8);
  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!items.length) return <p className="text-sm text-muted-foreground">Nenhum feedback.</p>;
  return (
    <div className="space-y-2">
      {items.map((f) => (
        <Card key={f.id} className="p-3">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{nameOf(f.user_id)} — Treino #{f.day_index + 1}</span>
            <span className="text-muted-foreground text-xs">{f.session_date}</span>
          </div>
          <div className="text-sm mt-1">Avaliação: <span className="text-primary font-bold">{f.rating}/5</span></div>
          {f.notes && <p className="text-sm mt-2 text-muted-foreground whitespace-pre-wrap">{f.notes}</p>}
        </Card>
      ))}
    </div>
  );
}

/* ============ LOGS ============ */
function LogsTab({ profiles }: { profiles: ProfileRow[] }) {
  const [items, setItems] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("workout_logs").select("*").order("created_at", { ascending: false }).limit(200);
      setItems((data ?? []) as LogRow[]);
      setLoading(false);
    })();
  }, []);
  const nameOf = (uid: string) => profiles.find((p) => p.user_id === uid)?.full_name ?? uid.slice(0, 8);
  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!items.length) return <p className="text-sm text-muted-foreground">Nenhum log.</p>;
  return (
    <div className="space-y-2">
      {items.map((l) => {
        const sets = Array.isArray(l.sets) ? l.sets : [];
        return (
          <Card key={l.id} className="p-3">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">{nameOf(l.user_id)} — {l.exercise_name}</span>
              <span className="text-muted-foreground text-xs">{l.session_date}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{sets.length} séries</div>
            {l.notes && <p className="text-sm mt-2 whitespace-pre-wrap">{l.notes}</p>}
          </Card>
        );
      })}
    </div>
  );
}

/* ============ RANKING ============ */
function RankingTab({ profiles }: { profiles: ProfileRow[] }) {
  const [ranking, setRanking] = useState<{ user_id: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const sevenAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data } = await supabase.from("workout_logs").select("user_id").gte("created_at", sevenAgo).limit(5000);
      const counts = new Map<string, number>();
      for (const r of (data ?? []) as { user_id: string }[]) {
        counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
      }
      const sorted = Array.from(counts.entries())
        .map(([user_id, count]) => ({ user_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);
      setRanking(sorted);
      setLoading(false);
    })();
  }, []);
  const nameOf = (uid: string) => profiles.find((p) => p.user_id === uid)?.full_name ?? uid.slice(0, 8);
  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!ranking.length) return <p className="text-sm text-muted-foreground">Sem dados nos últimos 30 dias.</p>;
  return (
    <Card className="p-4">
      <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><Trophy size={16} className="text-primary" /> Ranking — Treinos nos últimos 30 dias</h3>
      <div className="space-y-1">
        {ranking.map((r, i) => (
          <div key={r.user_id} className="flex justify-between items-center text-sm border-b border-border py-2">
            <span><span className="text-primary font-bold mr-2">#{i + 1}</span>{nameOf(r.user_id)}</span>
            <span className="text-muted-foreground">{r.count} treinos</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ============ MESSAGES (envia direto ao usuário) ============ */
function MessagesTab({ profiles }: { profiles: ProfileRow[] }) {
  const [recipient, setRecipient] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!recipient || !body.trim()) { toast.error("Selecione destinatário e escreva uma mensagem"); return; }
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Não autenticado"); setSending(false); return; }
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id, recipient_id: recipient, body: body.trim(),
    });
    setSending(false);
    if (error) toast.error(error.message);
    else { toast.success("Mensagem enviada"); setBody(""); }
  };

  return (
    <Card className="p-5 space-y-3 max-w-2xl">
      <h3 className="font-heading font-semibold flex items-center gap-2"><MessageSquare size={16} /> Enviar mensagem</h3>
      <div>
        <Label>Destinatário</Label>
        <select value={recipient} onChange={(e) => setRecipient(e.target.value)}
          className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="">Selecione…</option>
          {profiles.map((p) => (
            <option key={p.user_id} value={p.user_id}>{p.full_name ?? p.user_id.slice(0, 8)}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>Mensagem</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="mt-1" />
      </div>
      <Button onClick={send} disabled={sending}>
        <Send size={14} className="mr-1" /> {sending ? "Enviando…" : "Enviar"}
      </Button>
    </Card>
  );
}

/* ============ NOTIFICATIONS (push in-app) ============ */
function NotificationsTab({ profiles }: { profiles: ProfileRow[] }) {
  const [target, setTarget] = useState<"all" | "user">("all");
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim()) { toast.error("Título obrigatório"); return; }
    if (target === "user" && !userId) { toast.error("Selecione um usuário"); return; }
    setSending(true);
    const targets = target === "all" ? profiles.map((p) => p.user_id) : [userId];
    const rows = targets.map((uid) => ({
      user_id: uid, type: "admin", title: title.trim(),
      body: body.trim() || null, link: link.trim() || null,
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    setSending(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`Enviada para ${targets.length} usuário(s)`);
      setTitle(""); setBody(""); setLink("");
    }
  };

  return (
    <Card className="p-5 space-y-3 max-w-2xl">
      <h3 className="font-heading font-semibold flex items-center gap-2"><Bell size={16} /> Enviar notificação</h3>
      <div className="flex gap-2">
        <Button size="sm" variant={target === "all" ? "default" : "outline"} onClick={() => setTarget("all")}>Todos</Button>
        <Button size="sm" variant={target === "user" ? "default" : "outline"} onClick={() => setTarget("user")}>Um usuário</Button>
      </div>
      {target === "user" && (
        <div>
          <Label>Usuário</Label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}
            className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">Selecione…</option>
            {profiles.map((p) => (
              <option key={p.user_id} value={p.user_id}>{p.full_name ?? p.user_id.slice(0, 8)}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <Label>Título *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label>Corpo</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="mt-1" />
      </div>
      <div>
        <Label>Link (opcional)</Label>
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/training" className="mt-1" />
      </div>
      <Button onClick={send} disabled={sending}>
        <Send size={14} className="mr-1" /> {sending ? "Enviando…" : "Enviar"}
      </Button>
    </Card>
  );
}