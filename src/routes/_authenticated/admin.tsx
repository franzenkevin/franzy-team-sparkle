import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
  FileText, Sparkles, CalendarDays, Apple, Loader2, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeAnamnese, prescribeFromAnamnese, generateCoachFeedback } from "@/lib/anamnese.functions";
import { adminSaveProtocol, adminSetAnalysisStatus, adminUpdateProfile } from "@/lib/admin.functions";
import { adminGenerateBodyAnalysis, adminUpdateAnalysisContent } from "@/lib/body-analysis.functions";
import { generateBodyAnalysisPdf } from "@/lib/bodyAnalysisPdf";
import { TrainingEditor } from "@/components/admin/TrainingEditor";
import { DietEditor } from "@/components/admin/DietEditor";
import { HormonesEditor } from "@/components/admin/HormonesEditor";
import { TemplateLibrary } from "@/components/admin/TemplateLibrary";
import { ProtocolPreviewTabs } from "@/components/ProtocolPreview";
import { ResumoTab } from "@/components/admin/ResumoTab";

function safeParse(text: string, fallback: any) {
  try { return JSON.parse(text); } catch { return fallback; }
}

function ProtocolPlanEditor({
  trainingText, dietText, hormonesText,
  setTrainingText, setDietText, setHormonesText,
}: {
  trainingText: string; dietText: string; hormonesText: string;
  setTrainingText: (s: string) => void; setDietText: (s: string) => void; setHormonesText: (s: string) => void;
}) {
  const [mode, setMode] = useState<"visual" | "json">("visual");
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
          <button onClick={() => setMode("visual")} className={`px-3 py-1 rounded ${mode === "visual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Visual</button>
          <button onClick={() => setMode("json")} className={`px-3 py-1 rounded ${mode === "json" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>JSON</button>
        </div>
      </div>
      {mode === "visual" ? (
        <Tabs defaultValue="training">
          <TabsList>
            <TabsTrigger value="training"><Dumbbell size={14} className="mr-1" />Treino</TabsTrigger>
            <TabsTrigger value="diet"><Apple size={14} className="mr-1" />Dieta</TabsTrigger>
            <TabsTrigger value="hormones"><Sparkles size={14} className="mr-1" />Hormônios</TabsTrigger>
            <TabsTrigger value="preview"><FileText size={14} className="mr-1" />Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="training" className="mt-3">
            <div className="flex justify-end mb-2">
              <TemplateLibrary kind="training" currentValue={safeParse(trainingText, {})}
                onLoad={(v) => setTrainingText(JSON.stringify(v, null, 2))} />
            </div>
            <TrainingEditor
              value={safeParse(trainingText, {})}
              onChange={(v) => setTrainingText(JSON.stringify(v, null, 2))}
            />
          </TabsContent>
          <TabsContent value="diet" className="mt-3">
            <div className="flex justify-end mb-2">
              <TemplateLibrary kind="diet" currentValue={safeParse(dietText, {})}
                onLoad={(v) => setDietText(JSON.stringify(v, null, 2))} />
            </div>
            <DietEditor
              value={safeParse(dietText, {})}
              onChange={(v) => setDietText(JSON.stringify(v, null, 2))}
            />
          </TabsContent>
          <TabsContent value="hormones" className="mt-3">
            <div className="flex justify-end mb-2">
              <TemplateLibrary kind="hormones" currentValue={safeParse(hormonesText, [])}
                onLoad={(v) => setHormonesText(JSON.stringify(Array.isArray(v) ? v : [], null, 2))} />
            </div>
            <HormonesEditor
              value={safeParse(hormonesText, [])}
              onChange={(v) => setHormonesText(JSON.stringify(v, null, 2))}
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-3">
            <ProtocolPreviewTabs
              training={safeParse(trainingText, {})}
              diet={safeParse(dietText, {})}
              hormones={safeParse(hormonesText, [])}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          <div>
            <Label className="text-xs">Treino (JSON)</Label>
            <Textarea value={trainingText} onChange={(e) => setTrainingText(e.target.value)} rows={20} className="font-mono text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Dieta (JSON)</Label>
            <Textarea value={dietText} onChange={(e) => setDietText(e.target.value)} rows={20} className="font-mono text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Hormônios (JSON array)</Label>
            <Textarea value={hormonesText} onChange={(e) => setHormonesText(e.target.value)} rows={20} className="font-mono text-xs mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}

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
        <Tabs defaultValue="resumo">
          <TabsList className="w-full flex flex-wrap h-auto justify-start gap-1">
            <TabsTrigger value="resumo" className="gap-1"><BarChart3 size={14} />Resumo</TabsTrigger>
            <TabsTrigger value="overview" className="gap-1"><BarChart3 size={14} />Visão geral</TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1"><Clock size={14} />Aprovações</TabsTrigger>
            <TabsTrigger value="users" className="gap-1"><Users size={14} />Usuários</TabsTrigger>
            <TabsTrigger value="exercises" className="gap-1"><Dumbbell size={14} />Exercícios</TabsTrigger>
            <TabsTrigger value="checkins" className="gap-1"><ClipboardList size={14} />Check-ins</TabsTrigger>
            <TabsTrigger value="feedback" className="gap-1"><Heart size={14} />Feedback</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1"><Activity size={14} />Logs de Treino</TabsTrigger>
            <TabsTrigger value="ranking" className="gap-1"><Trophy size={14} />Ranking</TabsTrigger>
            <TabsTrigger value="messages" className="gap-1"><MessageSquare size={14} />Mensagens</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1"><Bell size={14} />Notificações</TabsTrigger>
            <TabsTrigger value="anamnese" className="gap-1"><FileText size={14} />Anamnese</TabsTrigger>
            <TabsTrigger value="weekly" className="gap-1"><CalendarDays size={14} />Semanal</TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1"><Activity size={14} />Mensal</TabsTrigger>
            <TabsTrigger value="diet-fb" className="gap-1"><Apple size={14} />Dieta</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="mt-4">
            <ResumoTab />
          </TabsContent>
          <TabsContent value="overview" className="mt-4">
            <OverviewTab metrics={metrics} profiles={profiles} />
          </TabsContent>
          <TabsContent value="approvals" className="mt-4">
            <ApprovalsTab profiles={profiles} />
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
          <TabsContent value="anamnese" className="mt-4">
            <AnamneseTab profiles={profiles} />
          </TabsContent>
          <TabsContent value="weekly" className="mt-4">
            <WeeklyAdminTab profiles={profiles} />
          </TabsContent>
          <TabsContent value="monthly" className="mt-4">
            <MonthlyAdminTab profiles={profiles} />
          </TabsContent>
          <TabsContent value="diet-fb" className="mt-4">
            <DietFbAdminTab profiles={profiles} />
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
  const [editingStatus, setEditingStatus] = useState<"active" | "pending_review">("active");
  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [togglingRole, setTogglingRole] = useState(false);
  const [fullProfile, setFullProfile] = useState<any | null>(null);
  const [profileDraft, setProfileDraft] = useState<Record<string, any>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [autoSaved, setAutoSaved] = useState<string | null>(null);
  const saveProtocolFn = useServerFn(adminSaveProtocol);
  const prescribeFn = useServerFn(prescribeFromAnamnese);
  const updateProfileFn = useServerFn(adminUpdateProfile);
  const skipNextAutoSaveRef = useRef(false);

  const filtered = profiles.filter((p) =>
    !filter || (p.full_name ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  const selectUser = async (u: ProfileRow) => {
    skipNextAutoSaveRef.current = true;
    setSelectedUser(u);
    setProtocol(null); setHistory([]); setFullProfile(null); setProfileDraft({});
    const [{ data: hist }, { data: roleRow }, { data: prof }] = await Promise.all([
      supabase.from("protocols").select("*").eq("user_id", u.user_id).order("created_at", { ascending: false }),
      supabase.from("user_roles").select("id").eq("user_id", u.user_id).eq("role", "admin").maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", u.user_id).maybeSingle(),
    ]);
    const list = (hist ?? []) as ProtocolRow[];
    // Prioridade: pending_review > active > mais recente
    const prot =
      list.find((p) => p.status === "pending_review") ??
      list.find((p) => p.status === "active") ??
      list[0] ?? null;
    if (prot) {
      setProtocol(prot);
      setTrainingText(JSON.stringify(prot.training ?? {}, null, 2));
      setDietText(JSON.stringify(prot.diet ?? {}, null, 2));
      setHormonesText(JSON.stringify((prot as any).hormones ?? [], null, 2));
      setEditingStatus(prot.status === "pending_review" ? "pending_review" : "active");
    } else {
      setTrainingText("{}"); setDietText("{}"); setHormonesText("[]");
      setEditingStatus("active");
    }
    setHistory(list);
    setIsUserAdmin(!!roleRow);
    setFullProfile(prof ?? null);
    setProfileDraft(prof ? { ...prof } : {});
  };

  const handleSave = async (statusOverride?: "active" | "pending_review") => {
    if (!selectedUser) return;
    const status = statusOverride ?? editingStatus;
    let training: any, diet: any, hormones: any;
    try { training = JSON.parse(trainingText); } catch { toast.error("JSON do treino inválido"); return; }
    try { diet = JSON.parse(dietText); } catch { toast.error("JSON da dieta inválido"); return; }
    try { hormones = JSON.parse(hormonesText); } catch { toast.error("JSON dos hormônios inválido"); return; }
    if (!Array.isArray(hormones)) { toast.error("Hormônios deve ser uma lista [ ]"); return; }
    setSaving(true);
    setEditingStatus(status);
    try {
      await saveProtocolFn({ data: {
        targetUserId: selectedUser.user_id,
        protocolId: protocol?.id ?? null,
        training,
        diet,
        hormones,
        status,
        notify: status === "active",
      } });
      toast.success(
        status === "active"
          ? (protocol ? "Protocolo atualizado e liberado ao aluno" : "Protocolo criado e liberado")
          : "Rascunho salvo (não liberado ao aluno)"
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar protocolo");
      setSaving(false);
      return;
    }
    setSaving(false);
    await selectUser(selectedUser);
  };

  const generateAiProtocol = async () => {
    if (!selectedUser) return;
    setGeneratingAi(true);
    try {
      await prescribeFn({ data: { targetUserId: selectedUser.user_id } });
      toast.success("Protocolo IA gerado. Revise abaixo e clique Liberar quando aprovar.");
      await selectUser(selectedUser);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar protocolo IA");
    } finally {
      setGeneratingAi(false);
    }
  };

  const saveProfile = async () => {
    if (!selectedUser) return;
    setSavingProfile(true);
    try {
      await updateProfileFn({ data: { targetUserId: selectedUser.user_id, profile: profileDraft } });
      toast.success("Perfil atualizado");
      await selectUser(selectedUser);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar perfil");
    } finally { setSavingProfile(false); }
  };

  const setPF = (k: string, v: any) => setProfileDraft((d) => ({ ...d, [k]: v }));

  // Auto-save draft (pending_review) when the editor content changes.
  useEffect(() => {
    if (!selectedUser) return;
    if (saving) return;
    // Never auto-save over an active/archived protocol — only drafts.
    if (protocol && protocol.status !== "pending_review") return;
    // Skip the auto-save fired by the initial load of editor text.
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }
    const handle = window.setTimeout(async () => {
      let training: any, diet: any, hormones: any;
      try { training = JSON.parse(trainingText); } catch { return; }
      try { diet = JSON.parse(dietText); } catch { return; }
      try { hormones = JSON.parse(hormonesText); } catch { return; }
      if (!Array.isArray(hormones)) return;
      try {
        await saveProtocolFn({ data: {
          targetUserId: selectedUser.user_id,
          protocolId: protocol?.id ?? null,
          training, diet, hormones,
          status: "pending_review",
          notify: false,
        } });
        setAutoSaved(new Date().toLocaleTimeString("pt-BR"));
      } catch { /* silent */ }
    }, 2500);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingText, dietText, hormonesText]);

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
                  <h3 className="font-heading font-semibold">Protocolo</h3>
                  <p className="text-xs text-muted-foreground">
                    {protocol
                      ? `v${protocol.version} • ${protocol.status} • ${protocol.start_date} → ${protocol.end_date}`
                      : "Sem protocolo"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                {autoSaved && <span className="text-[11px] text-muted-foreground self-center">Rascunho salvo {autoSaved}</span>}
                <Button variant="outline" onClick={generateAiProtocol} disabled={generatingAi}>
                  {generatingAi ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Sparkles size={14} className="mr-1" />}
                  Gerar IA
                </Button>
                <Button variant="outline" onClick={() => handleSave("pending_review")} disabled={saving}>
                  <Save size={14} className="mr-1" />
                  {saving && editingStatus === "pending_review" ? "Salvando…" : "Salvar rascunho"}
                </Button>
                <Button onClick={() => handleSave("active")} disabled={saving}>
                  <CheckCircle2 size={14} className="mr-1" />
                  {saving && editingStatus === "active" ? "Liberando…" : "Salvar e liberar"}
                </Button>
                </div>
              </div>
              <div className="mt-4">
                <ProtocolPlanEditor
                  trainingText={trainingText} dietText={dietText} hormonesText={hormonesText}
                  setTrainingText={setTrainingText} setDietText={setDietText} setHormonesText={setHormonesText}
                />
              </div>
            </Card>

            {fullProfile && (
              <Card className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-heading font-semibold">Perfil do aluno</h3>
                  <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
                    <Save size={14} className="mr-1" /> {savingProfile ? "Salvando…" : "Salvar perfil"}
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {([
                    ["full_name", "Nome"], ["age", "Idade"], ["sex", "Sexo (M/F)"],
                    ["weight", "Peso (kg)"], ["height", "Altura (cm)"],
                    ["goal", "Objetivo"], ["activity_level", "Nível atividade"],
                    ["neat", "NEAT"], ["experience", "Experiência"],
                    ["gym_type", "Academia"], ["training_days", "Dias treino/sem"],
                    ["training_time", "Horário treino"], ["meal_count", "Refeições/dia"],
                    ["sleep_hours", "Sono (h)"], ["stress_level", "Estresse"],
                    ["sweet_preference", "Pref. doce"], ["free_meals", "Refeições livres"],
                  ] as const).map(([k, label]) => (
                    <div key={k}>
                      <Label className="text-xs">{label}</Label>
                      <Input className="mt-1" value={profileDraft[k] ?? ""}
                        onChange={(e) => setPF(k, e.target.value)} />
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 mt-3">
                  {([
                    ["injuries", "Lesões"], ["disliked_foods", "Não gosta"],
                    ["allergies", "Alergias"],
                  ] as const).map(([k, label]) => (
                    <div key={k}>
                      <Label className="text-xs">{label}</Label>
                      <Textarea className="mt-1" rows={2} value={profileDraft[k] ?? ""}
                        onChange={(e) => setPF(k, e.target.value)} />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {history.length > 0 && (
              <Card className="p-5">
                <h3 className="font-heading font-semibold flex items-center gap-2"><HistoryIcon size={16} /> Histórico ({history.length})</h3>
                <div className="mt-3 space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="flex justify-between items-center text-sm border-b border-border py-1.5 gap-2">
                      <span className="min-w-0 truncate">v{h.version} <span className={`ml-2 text-xs px-2 py-0.5 rounded ${h.status === "active" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{h.status}</span></span>
                      <span className="text-xs text-muted-foreground shrink-0">{new Date(h.created_at).toLocaleDateString("pt-BR")}</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
                        onClick={() => {
                          setTrainingText(JSON.stringify(h.training ?? {}, null, 2));
                          setDietText(JSON.stringify(h.diet ?? {}, null, 2));
                          setHormonesText(JSON.stringify((h as any).hormones ?? [], null, 2));
                          toast.success(`v${h.version} carregada no editor — revise e salve para reverter`);
                        }}>
                        Reverter
                      </Button>
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
/* ============ ANAMNESE TAB ============ */
function AnamneseTab({ profiles }: { profiles: ProfileRow[] }) {
  const [filter, setFilter] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"analyze" | "prescribe" | "body" | null>(null);
  const analyzeFn = useServerFn(analyzeAnamnese);
  const prescribeFn = useServerFn(prescribeFromAnamnese);
  const bodyFn = useServerFn(adminGenerateBodyAnalysis);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("*")
        .not("anamnese_completed_at", "is", null).order("anamnese_completed_at", { ascending: false });
      setList(data ?? []);
      setLoading(false);
    })();
  }, []);

  const select = async (p: any) => {
    setSelected(p);
    const { data: an } = await supabase.from("ai_analyses").select("*")
      .eq("user_id", p.user_id).order("created_at", { ascending: false });
    setAnalyses(an ?? []);
    const urls: Record<string, string> = {};
    for (const k of ["photo_front_url", "photo_side_url", "photo_back_url"]) {
      const path = p[k];
      if (!path) continue;
      if (/^https?:/.test(path)) { urls[path] = path; continue; }
      const { data: u } = await supabase.storage.from("photos").createSignedUrl(path, 3600);
      if (u?.signedUrl) urls[path] = u.signedUrl;
    }
    setSigned(urls);
  };

  const runAnalyze = async () => {
    if (!selected) return;
    setBusy("analyze");
    try {
      await analyzeFn({ data: { targetUserId: selected.user_id } });
      toast.success("Análise IA gerada");
      await select(selected);
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setBusy(null); }
  };
  const runPrescribe = async () => {
    if (!selected) return;
    setBusy("prescribe");
    try {
      await prescribeFn({ data: { targetUserId: selected.user_id } });
      toast.success("Protocolo prescrito (edite na aba Usuários)");
      await select(selected);
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setBusy(null); }
  };
  const runBodyAnalysis = async () => {
    if (!selected) return;
    setBusy("body");
    try {
      await bodyFn({ data: { targetUserId: selected.user_id } });
      toast.success("Análise corporal IA gerada — revise abaixo e libere.");
      await select(selected);
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setBusy(null); }
  };

  const filtered = list.filter((p) => !filter || (p.full_name ?? "").toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        <Input placeholder="Buscar…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
          <div className="space-y-1 max-h-[75vh] overflow-y-auto">
            {filtered.map((p) => (
              <button key={p.user_id} onClick={() => select(p)}
                className={`w-full text-left rounded-md border p-3 transition ${selected?.user_id === p.user_id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                <div className="text-sm font-medium truncate">{p.full_name ?? "(sem nome)"}</div>
                <div className="text-xs text-muted-foreground">{new Date(p.anamnese_completed_at).toLocaleDateString("pt-BR")}</div>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma anamnese concluída.</p>}
          </div>
        )}
      </div>

      {!selected ? (
        <Card className="p-10 text-center text-muted-foreground">Selecione um aluno.</Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-heading font-bold">{selected.full_name ?? "(sem nome)"}</h2>
                <p className="text-xs text-muted-foreground mt-1">{selected.sex ?? "—"} · {selected.age ?? "—"}a · {selected.weight ?? "—"}kg · {selected.height ?? "—"}cm · {selected.goal ?? "—"}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={runAnalyze} disabled={busy !== null}>
                  {busy === "analyze" ? <Loader2 className="animate-spin mr-1" size={14}/> : <Sparkles size={14} className="mr-1"/>}
                  Análise IA
                </Button>
                <Button size="sm" variant="default" onClick={runPrescribe} disabled={busy !== null}>
                  {busy === "prescribe" ? <Loader2 className="animate-spin mr-1" size={14}/> : <Sparkles size={14} className="mr-1"/>}
                  Prescrição IA
                </Button>
                <Button size="sm" variant="secondary" onClick={runBodyAnalysis} disabled={busy !== null}>
                  {busy === "body" ? <Loader2 className="animate-spin mr-1" size={14}/> : <Sparkles size={14} className="mr-1"/>}
                  Análise corporal IA
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {["photo_front_url", "photo_side_url", "photo_back_url"].map((k) => {
                const path = selected[k];
                const url = path ? signed[path] : null;
                return (
                  <div key={k} className="aspect-[3/4] rounded-lg bg-muted overflow-hidden">
                    {url ? <img src={url} alt={k} className="w-full h-full object-cover"/> : <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">{k.replace("photo_", "").replace("_url", "")}</div>}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-heading font-semibold mb-3">Anamnese completa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {Object.entries(selected).filter(([k, v]) => v != null && v !== "" && !k.startsWith("photo_") && !["id", "user_id", "avatar_url", "created_at", "updated_at"].includes(k)).map(([k, v]) => (
                <div key={k} className="flex gap-2 border-b border-border py-1">
                  <span className="text-muted-foreground min-w-[140px]">{k}:</span>
                  <span className="break-words flex-1">{Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          </Card>

          {analyses.length > 0 && (
            <Card className="p-5">
              <h3 className="font-heading font-semibold mb-3 flex items-center gap-2"><Sparkles size={14} className="text-primary"/> Histórico IA</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {analyses.map((a) => (
                  <AdminAnalysisRow key={a.id} a={a} fullName={selected.full_name ?? "Aluno"} onChanged={() => select(selected)} />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function AdminAnalysisRow({ a, fullName, onChanged }: { a: any; fullName: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState<string>(() => {
    try { return JSON.stringify(JSON.parse(a.content), null, 2); } catch { return a.content ?? ""; }
  });
  const [saving, setSaving] = useState(false);
  const updateFn = useServerFn(adminUpdateAnalysisContent);
  const statusFn = useServerFn(adminSetAnalysisStatus);

  const save = async () => {
    setSaving(true);
    try {
      await updateFn({ data: { analysisId: a.id, content } });
      toast.success("Conteúdo atualizado");
      setEditing(false);
      onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setSaving(false); }
  };
  const setStatus = async (status: "approved" | "rejected" | "pending") => {
    try {
      await statusFn({ data: { analysisId: a.id, status } });
      toast.success(status === "approved" ? "Liberada para o aluno" : status === "rejected" ? "Rejeitada" : "Voltou para pendente");
      onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };
  const downloadPdf = () => {
    let parsed: any = {};
    try { parsed = JSON.parse(a.content); } catch {}
    generateBodyAnalysisPdf({ fullName, createdAt: a.created_at, analysis: parsed, meta: a.meta ?? {} });
  };

  return (
    <div className="border-l-2 border-primary pl-3 py-2">
      <div className="flex justify-between text-xs text-muted-foreground items-center gap-2">
        <span className="font-semibold capitalize">{a.kind} · {a.status}</span>
        <span>{new Date(a.created_at).toLocaleString("pt-BR")}</span>
      </div>
      {editing ? (
        <Textarea className="mt-2 font-mono text-xs" rows={14} value={content} onChange={(e) => setContent(e.target.value)} />
      ) : (
        <pre className="text-xs whitespace-pre-wrap mt-1 max-h-40 overflow-y-auto">{(() => { try { return JSON.stringify(JSON.parse(a.content), null, 2); } catch { return a.content; } })()}</pre>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        {editing ? (
          <>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil size={12} className="mr-1"/>Editar</Button>
        )}
        {a.kind === "body_analysis" && (
          <Button size="sm" variant="outline" onClick={downloadPdf}><FileText size={12} className="mr-1"/>PDF</Button>
        )}
        {a.status !== "approved" && (
          <Button size="sm" onClick={() => setStatus("approved")}><CheckCircle2 size={12} className="mr-1"/>Liberar</Button>
        )}
        {a.status === "approved" && (
          <Button size="sm" variant="ghost" onClick={() => setStatus("pending")}><Clock size={12} className="mr-1"/>Voltar p/ pendente</Button>
        )}
        {a.status !== "rejected" && (
          <Button size="sm" variant="ghost" onClick={() => setStatus("rejected")}><XCircle size={12} className="mr-1"/>Rejeitar</Button>
        )}
      </div>
    </div>
  );
}

/* ============ WEEKLY FEEDBACK ADMIN ============ */
function WeeklyAdminTab({ profiles }: { profiles: ProfileRow[] }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("weekly_feedbacks").select("*").order("week_start", { ascending: false }).limit(100);
      setItems(data ?? []); setLoading(false);
    })();
  }, []);
  const nameOf = (uid: string) => profiles.find((p) => p.user_id === uid)?.full_name ?? uid.slice(0, 8);
  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!items.length) return <p className="text-sm text-muted-foreground">Sem feedbacks semanais.</p>;
  return (
    <div className="space-y-2">
      {items.map((f) => (
        <Card key={f.id} className="p-3">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{nameOf(f.user_id)}</span>
            <span className="text-muted-foreground text-xs">{f.week_start}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {f.weight ?? "—"}kg · Treino {f.adherence_training ?? "—"}% · Dieta {f.adherence_diet ?? "—"}% · Energia {f.energy ?? "—"}/5 · Sono {f.sleep_quality ?? "—"}/5
          </div>
          {f.notes && <p className="text-sm mt-2 whitespace-pre-wrap">{f.notes}</p>}
          <CoachReplyBlock kind="weekly" refId={f.id} />
        </Card>
      ))}
    </div>
  );
}

/* ============ MONTHLY ADMIN ============ */
function MonthlyAdminTab({ profiles }: { profiles: ProfileRow[] }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const generateFn = useServerFn(generateCoachFeedback);

  const load = async () => {
    const { data } = await supabase.from("monthly_analyses").select("*").order("analysis_date", { ascending: false }).limit(100);
    setItems(data ?? []); setLoading(false);
    const paths = (data ?? []).flatMap((r: any) => ["photo_front", "photo_side", "photo_back"].map((k) => r[k]).filter(Boolean));
    const out: Record<string, string> = {};
    for (const p of paths) {
      const { data: u } = await supabase.storage.from("photos").createSignedUrl(p, 3600);
      if (u?.signedUrl) out[p] = u.signedUrl;
    }
    setSigned(out);
  };
  useEffect(() => { load(); }, []);
  const nameOf = (uid: string) => profiles.find((p) => p.user_id === uid)?.full_name ?? uid.slice(0, 8);

  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!items.length) return <p className="text-sm text-muted-foreground">Sem análises mensais.</p>;
  return (
    <div className="space-y-3">
      {items.map((m) => (
        <MonthlyRow key={m.id} m={m} signed={signed} nameOf={nameOf} generateFn={generateFn} reload={load} />
      ))}
    </div>
  );
}

function MonthlyRow({ m, signed, nameOf, generateFn, reload }: any) {
  const [aiText, setAiText] = useState(m.ai_summary ?? "");
  const [coachText, setCoachText] = useState(m.coach_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const { text } = await generateFn({ data: { kind: "monthly", refId: m.id } });
      setAiText(text);
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setBusy(false); }
  };
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("monthly_analyses").update({
      ai_summary: aiText || null, coach_notes: coachText || null,
    }).eq("id", m.id);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Salvo"); reload(); }
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between text-sm">
        <span className="font-semibold">{nameOf(m.user_id)}</span>
        <span className="text-muted-foreground text-xs">{m.analysis_date} · {m.weight ?? "—"}kg</span>
      </div>
      {(m.photo_front || m.photo_side || m.photo_back) && (
        <div className="grid grid-cols-3 gap-2 mt-3 max-w-md">
          {["photo_front", "photo_side", "photo_back"].map((k) => {
            const path = m[k]; const url = path ? signed[path] : null;
            return (
              <div key={k} className="aspect-[3/4] rounded-md bg-muted overflow-hidden">
                {url ? <img src={url} alt={k} className="w-full h-full object-cover"/> : null}
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Análise IA</Label>
          <Button size="sm" variant="outline" onClick={generate} disabled={busy}>
            {busy ? <Loader2 size={12} className="animate-spin mr-1"/> : <Sparkles size={12} className="mr-1"/>} Gerar
          </Button>
        </div>
        <Textarea rows={4} value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="Resumo IA editável…" />
        <Label className="text-xs">Feedback do coach (visível ao aluno)</Label>
        <Textarea rows={3} value={coachText} onChange={(e) => setCoachText(e.target.value)} />
        <Button size="sm" onClick={save} disabled={saving}><Save size={12} className="mr-1"/>{saving ? "Salvando…" : "Salvar"}</Button>
      </div>
    </Card>
  );
}

/* ============ DIET FEEDBACK ADMIN ============ */
function DietFbAdminTab({ profiles }: { profiles: ProfileRow[] }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("diet_feedback").select("*").order("session_date", { ascending: false }).limit(150);
      setItems(data ?? []); setLoading(false);
    })();
  }, []);
  const nameOf = (uid: string) => profiles.find((p) => p.user_id === uid)?.full_name ?? uid.slice(0, 8);
  if (loading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!items.length) return <p className="text-sm text-muted-foreground">Sem feedbacks de dieta.</p>;
  return (
    <div className="space-y-2">
      {items.map((f) => (
        <Card key={f.id} className="p-3">
          <div className="flex justify-between text-sm">
            <span className="font-semibold">{nameOf(f.user_id)}</span>
            <span className="text-muted-foreground text-xs">{f.session_date}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Refeição {f.meal_index ?? "—"} · Avaliação {f.rating}/5 · Fome {f.hunger ?? "—"}/5
          </div>
          {f.notes && <p className="text-sm mt-2 whitespace-pre-wrap">{f.notes}</p>}
          <CoachReplyBlock kind="diet" refId={f.id} />
        </Card>
      ))}
    </div>
  );
}

/* ============ Coach reply (AI-assisted) used in weekly/diet ============ */
function CoachReplyBlock({ kind, refId }: { kind: "weekly" | "diet"; refId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const generateFn = useServerFn(generateCoachFeedback);

  const generate = async () => {
    setBusy(true);
    try {
      const { text: t } = await generateFn({ data: { kind, refId } });
      setText(t);
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setBusy(false); }
  };
  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: row } = await (supabase.from(kind === "weekly" ? "weekly_feedbacks" : "diet_feedback") as any)
      .select("user_id").eq("id", refId).maybeSingle();
    if (!user || !row) { setSending(false); return; }
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id, recipient_id: (row as any).user_id, body: text.trim(),
    });
    setSending(false);
    if (error) toast.error(error.message);
    else { toast.success("Mensagem enviada ao aluno"); setText(""); setOpen(false); }
  };

  if (!open) {
    return (
      <div className="mt-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)} className="h-7 text-xs">
          <MessageSquare size={12} className="mr-1"/> Responder
        </Button>
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <div className="flex justify-between">
        <Label className="text-xs">Resposta ao aluno</Label>
        <Button size="sm" variant="outline" onClick={generate} disabled={busy} className="h-7 text-xs">
          {busy ? <Loader2 size={12} className="animate-spin mr-1"/> : <Sparkles size={12} className="mr-1"/>} Sugestão IA
        </Button>
      </div>
      <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva ou clique em Sugestão IA…" />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button size="sm" onClick={send} disabled={sending || !text.trim()}>
          <Send size={12} className="mr-1"/> {sending ? "Enviando…" : "Enviar"}
        </Button>
      </div>
    </div>
  );
}

/* ============ APPROVALS TAB (protocolos e análises pendentes) ============ */
function ApprovalsTab({ profiles }: { profiles: ProfileRow[] }) {
  const [pendingProts, setPendingProts] = useState<ProtocolRow[]>([]);
  const [pendingAns, setPendingAns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProtocolRow | null>(null);
  const [trainingText, setTrainingText] = useState("{}");
  const [dietText, setDietText] = useState("{}");
  const [hormonesText, setHormonesText] = useState("[]");
  const [busy, setBusy] = useState(false);
  const saveProtocolFn = useServerFn(adminSaveProtocol);
  const setAnalysisFn = useServerFn(adminSetAnalysisStatus);

  const nameOf = (uid: string) => profiles.find((p) => p.user_id === uid)?.full_name ?? uid.slice(0, 8);

  const load = async () => {
    setLoading(true);
    const [{ data: prots }, { data: ans }] = await Promise.all([
      supabase.from("protocols").select("*").eq("status", "pending_review").order("created_at", { ascending: false }),
      supabase.from("ai_analyses").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(50),
    ]);
    setPendingProts((prots ?? []) as ProtocolRow[]);
    setPendingAns(ans ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const pick = (p: ProtocolRow) => {
    setSelected(p);
    setTrainingText(JSON.stringify(p.training ?? {}, null, 2));
    setDietText(JSON.stringify(p.diet ?? {}, null, 2));
    setHormonesText(JSON.stringify((p as any).hormones ?? [], null, 2));
  };

  const approveProtocol = async () => {
    if (!selected) return;
    let training: any, diet: any, hormones: any;
    try { training = JSON.parse(trainingText); } catch { toast.error("JSON do treino inválido"); return; }
    try { diet = JSON.parse(dietText); } catch { toast.error("JSON da dieta inválido"); return; }
    try { hormones = JSON.parse(hormonesText); } catch { toast.error("JSON dos hormônios inválido"); return; }
    if (!Array.isArray(hormones)) { toast.error("Hormônios deve ser uma lista"); return; }
    setBusy(true);
    try {
      await saveProtocolFn({ data: {
        targetUserId: selected.user_id,
        protocolId: selected.id,
        training,
        diet,
        hormones,
        status: "active",
        notify: true,
      } });
      toast.success("Protocolo aprovado e ativado");
      setSelected(null);
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setBusy(false); }
  };

  const rejectProtocol = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await saveProtocolFn({ data: {
        targetUserId: selected.user_id,
        protocolId: selected.id,
        training: selected.training ?? {},
        diet: selected.diet ?? {},
        hormones: (selected as any).hormones ?? [],
        status: "rejected",
      } });
      toast.success("Protocolo rejeitado");
      setSelected(null);
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setBusy(false); }
  };

  const approveAnalysis = async (a: any) => {
    await setAnalysisFn({ data: { analysisId: a.id, status: "approved", content: a.content } });
    toast.success("Análise aprovada");
    load();
  };

  const rejectAnalysis = async (a: any) => {
    await setAnalysisFn({ data: { analysisId: a.id, status: "rejected", content: a.content } });
    toast.success("Análise rejeitada");
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando fila…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
          <Clock size={16} className="text-warning" /> Protocolos aguardando revisão ({pendingProts.length})
        </h3>
        {pendingProts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum protocolo na fila.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {pendingProts.map((p) => (
                <button key={p.id} onClick={() => pick(p)}
                  className={`w-full text-left rounded-md border p-3 transition ${selected?.id === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                  <div className="text-sm font-medium truncate">{nameOf(p.user_id)}</div>
                  <div className="text-xs text-muted-foreground">v{p.version} · {new Date(p.created_at).toLocaleString("pt-BR")}</div>
                </button>
              ))}
            </div>
            {selected ? (
              <Card className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">{nameOf(selected.user_id)} — v{selected.version}</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={rejectProtocol} disabled={busy}>
                      <XCircle size={14} className="mr-1"/> Rejeitar
                    </Button>
                    <Button size="sm" onClick={approveProtocol} disabled={busy}>
                      {busy ? <Loader2 size={14} className="animate-spin mr-1"/> : <CheckCircle2 size={14} className="mr-1"/>}
                      Aprovar e ativar
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Edite o JSON se precisar ajustar antes de liberar. Aprovar arquiva o protocolo ativo atual e ativa este.
                </p>
                <ProtocolPlanEditor
                  trainingText={trainingText} dietText={dietText} hormonesText={hormonesText}
                  setTrainingText={setTrainingText} setDietText={setDietText} setHormonesText={setHormonesText}
                />
              </Card>
            ) : (
              <Card className="p-10 text-center text-muted-foreground text-sm">Selecione um protocolo para revisar.</Card>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2">
          <Sparkles size={16} className="text-primary" /> Análises IA pendentes ({pendingAns.length})
        </h3>
        {pendingAns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma análise pendente.</p>
        ) : (
          <div className="space-y-2">
            {pendingAns.map((a) => (
              <Card key={a.id} className="p-3">
                <div className="flex justify-between text-sm flex-wrap gap-2">
                  <div>
                    <span className="font-semibold">{nameOf(a.user_id)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{a.kind}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => rejectAnalysis(a)}><XCircle size={14} className="mr-1"/>Rejeitar</Button>
                    <Button size="sm" onClick={() => approveAnalysis(a)}><CheckCircle2 size={14} className="mr-1"/>Aprovar</Button>
                  </div>
                </div>
                <pre className="text-xs whitespace-pre-wrap mt-2 max-h-48 overflow-y-auto bg-muted/30 rounded p-2">{a.content}</pre>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
