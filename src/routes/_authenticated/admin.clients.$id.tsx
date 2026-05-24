import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Save, Sparkles, CheckCircle2, XCircle, Clock, Loader2, Pencil,
  Dumbbell, Apple, Pill, Heart, FileText, Camera, MessageSquare, BarChart3, Send,
} from "lucide-react";
import { TrainingEditor } from "@/components/admin/TrainingEditor";
import { DietEditor } from "@/components/admin/DietEditor";
import { HormonesEditor } from "@/components/admin/HormonesEditor";
import { CoachChat } from "@/components/admin/CoachChat";
import { EditStudentDialog } from "@/components/admin/EditStudentDialog";
import { adminSaveProtocol, adminSetAnalysisStatus } from "@/lib/admin.functions";
import { adminGenerateBodyAnalysis, adminUpdateAnalysisContent } from "@/lib/body-analysis.functions";
import { prescribeFromAnamnese, analyzeAnamnese } from "@/lib/anamnese.functions";

export const Route = createFileRoute("/_authenticated/admin/clients/$id")({
  component: ClientDetail,
});

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}

function ClientDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
  const [protocol, setProtocol] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any[]>([]);
  const [dietFb, setDietFb] = useState<any[]>([]);
  const [workoutFb, setWorkoutFb] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [signedPhotos, setSignedPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const sinceIso = new Date(Date.now() - 120 * 86400_000).toISOString();
    const [
      { data: prof },
      { data: prots },
      { data: ans },
      { data: wk },
      { data: df },
      { data: wf },
      { data: ma },
      { data: ck },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", id).maybeSingle(),
      supabase.from("protocols").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(25),
      supabase.from("ai_analyses").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
      supabase.from("weekly_feedbacks").select("*").eq("user_id", id).gte("created_at", sinceIso).order("week_start", { ascending: false }).limit(12),
      supabase.from("diet_feedback").select("*").eq("user_id", id).gte("created_at", sinceIso).order("session_date", { ascending: false }).limit(30),
      supabase.from("workout_feedback").select("*").eq("user_id", id).gte("created_at", sinceIso).order("session_date", { ascending: false }).limit(30),
      supabase.from("monthly_analyses").select("*").eq("user_id", id).order("analysis_date", { ascending: false }).limit(6),
      supabase.from("checkins").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    ]);
    setProfile(prof ?? null);
    const list = (prots ?? []) as any[];
    setHistory(list);
    const prot = list.find((p) => p.status === "pending_review") ?? list.find((p) => p.status === "active") ?? list[0] ?? null;
    setProtocol(prot);
    setAnalyses(ans ?? []);
    setWeekly(wk ?? []);
    setDietFb(df ?? []);
    setWorkoutFb(wf ?? []);
    setMonthly(ma ?? []);
    setCheckins(ck ?? []);

    // sign photos
    const urls: Record<string, string> = {};
    for (const k of ["photo_front_url", "photo_side_url", "photo_side_left_url", "photo_back_url"]) {
      const path = (prof as any)?.[k];
      if (!path || /^https?:/.test(path)) { if (path) urls[path] = path; continue; }
      const { data: u } = await supabase.storage.from("photos").createSignedUrl(path, 3600);
      if (u?.signedUrl) urls[path] = u.signedUrl;
    }
    setSignedPhotos(urls);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (loading) return <p className="text-sm text-muted-foreground">Carregando aluno…</p>;
  if (!profile) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">Aluno não encontrado.</p>
        <Button className="mt-4" onClick={() => nav({ to: "/admin/clients" })}>Voltar</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/admin/clients" className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft size={12} /> Voltar para clientes
      </Link>

      {/* Header */}
      <Card className="p-5 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">{initials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-2xl font-heading font-bold">{profile.full_name ?? "(sem nome)"}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.age && <Badge variant="secondary">{profile.age} anos</Badge>}
              {profile.height && <Badge variant="secondary">{profile.height} cm</Badge>}
              {profile.weight && <Badge variant="secondary">{profile.weight} kg</Badge>}
              {profile.goal && <Badge variant="outline">{profile.goal}</Badge>}
              {profile.plan && <Badge variant="secondary">{profile.plan}</Badge>}
              {profile.plan_end && (
                <Badge variant="outline">
                  Plano até {new Date(profile.plan_end).toLocaleDateString("pt-BR")}
                </Badge>
              )}
              {protocol?.end_date && (
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                  {Math.max(0, Math.round((new Date(protocol.end_date).getTime() - Date.now()) / 86400_000))} dias restantes
                </Badge>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1">
            <Pencil size={12} /> Editar dados
          </Button>
        </div>
      </Card>

      <EditStudentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        userId={id}
        onSaved={load}
        onDeleted={() => nav({ to: "/admin/clients" })}
      />

      <Tabs defaultValue={protocol ? "training" : "anamnese"} className="w-full">
        <TabsList className="w-full flex-wrap h-auto justify-start gap-1">
          <TabsTrigger value="progress" className="gap-1"><BarChart3 size={12}/>Progresso</TabsTrigger>
          <TabsTrigger value="anamnese" className="gap-1"><FileText size={12}/>Anamnese</TabsTrigger>
          <TabsTrigger value="photos" className="gap-1"><Camera size={12}/>Fotos</TabsTrigger>
          <TabsTrigger value="training" className="gap-1"><Dumbbell size={12}/>Treino</TabsTrigger>
          <TabsTrigger value="diet" className="gap-1"><Apple size={12}/>Dieta</TabsTrigger>
          <TabsTrigger value="hormones" className="gap-1"><Pill size={12}/>Hormônios</TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1"><Heart size={12}/>Feedbacks</TabsTrigger>
          <TabsTrigger value="analyses" className="gap-1"><Sparkles size={12}/>Análises IA</TabsTrigger>
          <TabsTrigger value="coach" className="gap-1"><MessageSquare size={12}/>IA Coach</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="mt-4">
          <ProgressTab checkins={checkins} weekly={weekly} workoutFb={workoutFb} dietFb={dietFb} monthly={monthly} />
        </TabsContent>
        <TabsContent value="anamnese" className="mt-4">
          <AnamneseView profile={profile} userId={id} onReload={load} />
        </TabsContent>
        <TabsContent value="photos" className="mt-4">
          <PhotosTab profile={profile} signed={signedPhotos} />
        </TabsContent>
        <TabsContent value="training" className="mt-4">
          <ProtocolEditorBlock protocol={protocol} userId={id} kind="training" onSaved={load} history={history} />
        </TabsContent>
        <TabsContent value="diet" className="mt-4">
          <ProtocolEditorBlock protocol={protocol} userId={id} kind="diet" onSaved={load} history={history} />
        </TabsContent>
        <TabsContent value="hormones" className="mt-4">
          <ProtocolEditorBlock protocol={protocol} userId={id} kind="hormones" onSaved={load} history={history} />
        </TabsContent>
        <TabsContent value="feedback" className="mt-4">
          <FeedbacksTab weekly={weekly} dietFb={dietFb} workoutFb={workoutFb} monthly={monthly} />
        </TabsContent>
        <TabsContent value="analyses" className="mt-4">
          <AnalysesTab analyses={analyses} fullName={profile.full_name ?? "Aluno"} onChanged={load} />
        </TabsContent>
        <TabsContent value="coach" className="mt-4">
          <CoachChat profiles={[{ user_id: id, full_name: profile.full_name }]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Sub-components ---------------- */

function ProgressTab({ checkins, weekly, workoutFb, dietFb, monthly }: any) {
  const lastCk = checkins[0];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">Último peso</p>
        <p className="text-2xl font-bold font-heading text-primary">{lastCk?.weight ?? "—"} kg</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">Feedbacks semanais</p>
        <p className="text-2xl font-bold font-heading text-primary">{weekly.length}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">Treinos avaliados (120d)</p>
        <p className="text-2xl font-bold font-heading text-primary">{workoutFb.length}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">Análises mensais</p>
        <p className="text-2xl font-bold font-heading text-primary">{monthly.length}</p>
      </Card>
      <Card className="p-4 sm:col-span-2 lg:col-span-4">
        <h3 className="font-heading font-semibold mb-2">Check-ins recentes</h3>
        {checkins.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem check-ins.</p>
        ) : (
          <div className="space-y-1.5">
            {checkins.slice(0, 5).map((c: any) => (
              <div key={c.id} className="flex justify-between text-sm border-b border-border py-1.5">
                <span>{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                <span className="text-muted-foreground">{c.weight ?? "—"}kg · adesão {c.adherence ?? "—"}%</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AnamneseView({ profile, userId, onReload }: { profile: any; userId: string; onReload: () => void }) {
  const analyzeFn = useServerFn(analyzeAnamnese);
  const prescribeFn = useServerFn(prescribeFromAnamnese);
  const [busy, setBusy] = useState<string | null>(null);
  const skipKeys = new Set(["id", "user_id", "avatar_url", "created_at", "updated_at"]);
  const entries = Object.entries(profile).filter(([k, v]) => v != null && v !== "" && !k.startsWith("photo_") && !skipKeys.has(k));

  const run = async (kind: "analyze" | "prescribe") => {
    setBusy(kind);
    try {
      if (kind === "analyze") await analyzeFn({ data: { targetUserId: userId } });
      else await prescribeFn({ data: { targetUserId: userId } });
      toast.success(kind === "analyze" ? "Análise IA gerada" : "Protocolo gerado (revise na aba Treino/Dieta)");
      onReload();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => run("analyze")} disabled={!!busy}>
          {busy === "analyze" ? <Loader2 className="animate-spin mr-1" size={14}/> : <Sparkles size={14} className="mr-1"/>}
          Gerar análise IA
        </Button>
        <Button size="sm" onClick={() => run("prescribe")} disabled={!!busy}>
          {busy === "prescribe" ? <Loader2 className="animate-spin mr-1" size={14}/> : <Sparkles size={14} className="mr-1"/>}
          Prescrever protocolo IA
        </Button>
      </div>
      <Card className="p-5">
        <h3 className="font-heading font-semibold mb-3">Anamnese completa</h3>
        {!profile.anamnese_completed_at && (
          <p className="text-sm text-muted-foreground">Aluno ainda não finalizou a anamnese.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
          {entries.map(([k, v]) => (
            <div key={k} className="flex gap-2 border-b border-border py-1">
              <span className="text-muted-foreground min-w-[140px]">{k}:</span>
              <span className="break-words flex-1">
                {Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PhotosTab({ profile, signed }: { profile: any; signed: Record<string, string> }) {
  const slots: Array<[string, string]> = [
    ["photo_front_url", "Frente"],
    ["photo_side_url", "Lateral direita"],
    ["photo_side_left_url", "Lateral esquerda"],
    ["photo_back_url", "Costas"],
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {slots.map(([k, label]) => {
        const path = profile[k];
        const url = path ? signed[path] : null;
        return (
          <div key={k}>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <div className="aspect-[3/4] rounded-lg bg-muted overflow-hidden">
              {url ? <img src={url} alt={label} className="w-full h-full object-cover" />
                : <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">sem foto</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProtocolEditorBlock({ protocol, userId, kind, onSaved, history }: {
  protocol: any | null; userId: string; kind: "training" | "diet" | "hormones"; onSaved: () => void; history: any[];
}) {
  const saveFn = useServerFn(adminSaveProtocol);
  const [value, setValue] = useState<any>(() =>
    protocol ? (kind === "hormones" ? (protocol.hormones ?? []) : (protocol[kind] ?? {})) : (kind === "hormones" ? [] : {}),
  );
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const lastSavedJsonRef = useRef<string>("");

  useEffect(() => {
    const v = protocol ? (kind === "hormones" ? (protocol.hormones ?? []) : (protocol[kind] ?? {})) : (kind === "hormones" ? [] : {});
    setValue(v);
    lastSavedJsonRef.current = JSON.stringify(v);
    setDirty(false);
  }, [protocol, kind]);

  // Marca alterações
  useEffect(() => {
    const current = JSON.stringify(value);
    setDirty(current !== lastSavedJsonRef.current);
  }, [value]);

  const persist = async (status: "active" | "pending_review", opts?: { silent?: boolean }) => {
    try {
      const payload: any = {
        targetUserId: userId,
        protocolId: protocol?.id ?? null,
        training: kind === "training" ? value : (protocol?.training ?? {}),
        diet: kind === "diet" ? value : (protocol?.diet ?? {}),
        hormones: kind === "hormones" ? (Array.isArray(value) ? value : []) : (protocol?.hormones ?? []),
        status,
        notify: status === "active",
      };
      await saveFn({ data: payload });
      lastSavedJsonRef.current = JSON.stringify(value);
      setDirty(false);
      setAutoSavedAt(new Date());
      if (!opts?.silent) {
        toast.success(status === "active" ? "Publicado para o aluno" : "Rascunho salvo");
      }
      // Recarrega só ao publicar (para evitar conflito com edição em andamento)
      if (status === "active") onSaved();
    } catch (e: any) {
      if (!opts?.silent) toast.error(e?.message ?? "Erro ao salvar");
      throw e;
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try { await persist("pending_review"); } catch { /* toast já mostrado */ }
    finally { setSaving(false); }
  };
  const handlePublish = async () => {
    if (!confirm("Publicar este protocolo para o aluno? Ele será notificado.")) return;
    setPublishing(true);
    try { await persist("active"); } catch { /* toast já mostrado */ }
    finally { setPublishing(false); }
  };

  // Auto-save a cada 20s quando houver alterações não salvas
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!dirty || saving || publishing) return;
      persist("pending_review", { silent: true }).catch(() => { /* silencioso */ });
    }, 20_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, saving, publishing, value, protocol?.id]);

  // Auto-save ao sair da página / mudar de aba
  useEffect(() => {
    const onLeave = () => {
      if (dirty) persist("pending_review", { silent: true }).catch(() => {});
    };
    window.addEventListener("beforeunload", onLeave);
    return () => { window.removeEventListener("beforeunload", onLeave); onLeave(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <div>
            <h3 className="font-heading font-semibold capitalize">
              {kind === "training" ? "Treino" : kind === "diet" ? "Dieta" : "Hormônios"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {protocol ? `v${protocol.version} · ${protocol.status}` : "Nenhum protocolo ainda"}
              {autoSavedAt && (
                <span className="ml-2">· auto-salvo {autoSavedAt.toLocaleTimeString("pt-BR")}</span>
              )}
              {dirty && <span className="ml-2 text-amber-600">· alterações não salvas</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleSaveDraft} disabled={saving || publishing}>
              {saving ? <Loader2 size={14} className="mr-1 animate-spin"/> : <Save size={14} className="mr-1"/>}
              Salvar
            </Button>
            <Button size="sm" onClick={handlePublish} disabled={saving || publishing}>
              {publishing ? <Loader2 size={14} className="mr-1 animate-spin"/> : <Send size={14} className="mr-1"/>}
              Publicar para aluno
            </Button>
          </div>
        </div>
        {kind === "training" && <TrainingEditor value={value} onChange={setValue} />}
        {kind === "diet" && <DietEditor value={value} onChange={setValue} />}
        {kind === "hormones" && <HormonesEditor value={value} onChange={setValue} />}
      </Card>

      {history.length > 1 && (
        <Card className="p-4">
          <h4 className="font-heading font-semibold text-sm mb-2">Histórico de versões</h4>
          <div className="space-y-1">
            {history.map((h: any) => (
              <div key={h.id} className="flex justify-between text-xs border-b border-border py-1.5">
                <span>v{h.version} · <span className={h.status === "active" ? "text-primary" : "text-muted-foreground"}>{h.status}</span></span>
                <span className="text-muted-foreground">{new Date(h.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function FeedbacksTab({ weekly, dietFb, workoutFb, monthly }: any) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2"><Heart size={14}/>Feedbacks semanais ({weekly.length})</h3>
        {weekly.length === 0 ? <p className="text-sm text-muted-foreground">Sem feedbacks.</p> : (
          <div className="space-y-2">
            {weekly.map((f: any) => (
              <div key={f.id} className="border-b border-border py-2 text-sm">
                <div className="flex justify-between"><span className="font-medium">{f.week_start}</span><span className="text-xs text-muted-foreground">{f.weight ?? "—"}kg</span></div>
                <div className="text-xs text-muted-foreground">Treino {f.adherence_training ?? "—"}% · Dieta {f.adherence_diet ?? "—"}% · Energia {f.energy ?? "—"}/5 · Sono {f.sleep_quality ?? "—"}/5</div>
                {f.notes && <p className="text-xs mt-1 whitespace-pre-wrap">{f.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="p-4">
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2"><Apple size={14}/>Feedbacks de dieta ({dietFb.length})</h3>
        {dietFb.length === 0 ? <p className="text-sm text-muted-foreground">Sem feedbacks.</p> : (
          <div className="space-y-1.5">
            {dietFb.slice(0, 15).map((f: any) => (
              <div key={f.id} className="border-b border-border py-1.5 text-sm">
                <div className="flex justify-between"><span>Refeição {f.meal_index ?? "—"}</span><span className="text-xs text-muted-foreground">{f.session_date}</span></div>
                <div className="text-xs text-muted-foreground">{f.rating}/5 · fome {f.hunger ?? "—"}/5</div>
                {f.notes && <p className="text-xs mt-0.5">{f.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="p-4">
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2"><Dumbbell size={14}/>Feedbacks de treino ({workoutFb.length})</h3>
        {workoutFb.length === 0 ? <p className="text-sm text-muted-foreground">Sem feedbacks.</p> : (
          <div className="space-y-1.5">
            {workoutFb.slice(0, 15).map((f: any) => (
              <div key={f.id} className="border-b border-border py-1.5 text-sm">
                <div className="flex justify-between"><span>Treino {f.day_index + 1}</span><span className="text-xs text-muted-foreground">{f.session_date}</span></div>
                <div className="text-xs text-muted-foreground">{f.rating}/5</div>
                {f.notes && <p className="text-xs mt-0.5">{f.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="p-4">
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2"><BarChart3 size={14}/>Análises mensais ({monthly.length})</h3>
        {monthly.length === 0 ? <p className="text-sm text-muted-foreground">Sem análises.</p> : (
          <div className="space-y-2">
            {monthly.map((m: any) => (
              <div key={m.id} className="border-b border-border py-2 text-sm">
                <div className="flex justify-between"><span className="font-medium">{m.analysis_date}</span><span className="text-xs text-muted-foreground">{m.weight ?? "—"}kg</span></div>
                {m.coach_notes && <p className="text-xs mt-1 whitespace-pre-wrap"><span className="text-muted-foreground">Coach:</span> {m.coach_notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AnalysesTab({ analyses, fullName, onChanged }: { analyses: any[]; fullName: string; onChanged: () => void }) {
  const bodyFn = useServerFn(adminGenerateBodyAnalysis);
  const [busy, setBusy] = useState(false);
  // We need targetUserId for generation — derive from any analysis or pass via route — use first one
  const uid = analyses[0]?.user_id;
  const run = async () => {
    if (!uid) { toast.error("Sem aluno associado"); return; }
    setBusy(true);
    try {
      await bodyFn({ data: { targetUserId: uid } });
      toast.success("Análise corporal IA gerada — revise e libere");
      onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={run} disabled={busy || !uid}>
          {busy ? <Loader2 size={14} className="mr-1 animate-spin"/> : <Sparkles size={14} className="mr-1"/>}
          Gerar análise corporal IA
        </Button>
      </div>
      {analyses.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Nenhuma análise IA ainda.</Card>
      ) : (
        <div className="space-y-2">
          {analyses.map((a) => (
            <AdminAnalysisRow key={a.id} a={a} fullName={fullName} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminAnalysisRow({ a, onChanged }: { a: any; fullName: string; onChanged: () => void }) {
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
      toast.success(status === "approved" ? "Liberada ao aluno" : status === "rejected" ? "Rejeitada" : "Pendente");
      onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  return (
    <Card className="p-3">
      <div className="flex justify-between text-xs text-muted-foreground items-center gap-2 flex-wrap">
        <span className="font-semibold capitalize">{a.kind} · {a.status}</span>
        <span>{new Date(a.created_at).toLocaleString("pt-BR")}</span>
      </div>
      {editing ? (
        <Textarea className="mt-2 font-mono text-xs" rows={14} value={content} onChange={(e) => setContent(e.target.value)} />
      ) : (
        <pre className="text-xs whitespace-pre-wrap mt-1 max-h-48 overflow-y-auto">{(() => { try { return JSON.stringify(JSON.parse(a.content), null, 2); } catch { return a.content; } })()}</pre>
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
    </Card>
  );
}
