import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Shield, Users, ClipboardList, MessageSquare, History as HistoryIcon, ShieldCheck, ShieldOff, BarChart3, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Franzen Team" }] }),
  component: AdminPage,
});

type ProfileRow = {
  user_id: string; full_name: string | null; goal: string | null;
  age: number | null; sex: string | null; weight: number | null; height: number | null;
};
type ProtocolRow = { id: string; user_id: string; status: string; version: number; training: any; diet: any; start_date: string; end_date: string; created_at: string };
type CheckinRow = { id: string; created_at: string; weight: number | null; adherence: number | null; notes: string | null; photo_front: string | null; photo_side: string | null; photo_back: string | null };
type FeedbackRow = { id: string; session_date: string; day_index: number; rating: number; notes: string | null };

type Tab = "protocol" | "history" | "checkins" | "feedback" | "roles";

type Metrics = {
  totalUsers: number;
  activeProtocols: number;
  checkinsLast7: number;
  workoutsLast7: number;
  avgAdherence: number | null;
  atRisk: { user_id: string; full_name: string | null; lastCheckin: string | null }[];
};

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [tab, setTab] = useState<Tab>("protocol");
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  // protocol active
  const [protocol, setProtocol] = useState<ProtocolRow | null>(null);
  const [trainingText, setTrainingText] = useState("{}");
  const [dietText, setDietText] = useState("{}");
  const [saving, setSaving] = useState(false);

  // history / checkins / feedback
  const [history, setHistory] = useState<ProtocolRow[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [togglingRole, setTogglingRole] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/login" }); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roles) { setChecking(false); return; }
      setIsAdmin(true);
      const { data: rows } = await supabase
        .from("profiles").select("user_id, full_name, goal, age, sex, weight, height")
        .order("created_at", { ascending: false });
      setProfiles(rows ?? []);
      setChecking(false);
      // Load global metrics
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
  }, [navigate]);

  const selectUser = async (u: ProfileRow) => {
    setSelectedUser(u);
    setTab("protocol");
    const [{ data: prot }, { data: hist }, { data: chk }, { data: fb }] = await Promise.all([
      supabase.from("protocols").select("*").eq("user_id", u.user_id).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("protocols").select("*").eq("user_id", u.user_id).order("created_at", { ascending: false }),
      supabase.from("checkins").select("*").eq("user_id", u.user_id).order("created_at", { ascending: false }).limit(50),
      supabase.from("workout_feedback").select("*").eq("user_id", u.user_id).order("session_date", { ascending: false }).limit(50),
    ]);
    if (prot) {
      setProtocol(prot as ProtocolRow);
      setTrainingText(JSON.stringify(prot.training ?? {}, null, 2));
      setDietText(JSON.stringify(prot.diet ?? {}, null, 2));
    } else {
      setProtocol(null); setTrainingText("{}"); setDietText("{}");
    }
    setHistory((hist ?? []) as ProtocolRow[]);
    setCheckins((chk ?? []) as CheckinRow[]);
    setFeedback((fb ?? []) as FeedbackRow[]);
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", u.user_id)
      .eq("role", "admin")
      .maybeSingle();
    setIsUserAdmin(!!roleRow);
  };

  const toggleAdminRole = async () => {
    if (!selectedUser) return;
    setTogglingRole(true);
    try {
      if (isUserAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", selectedUser.user_id)
          .eq("role", "admin");
        if (error) throw error;
        toast.success("Permissão de admin removida");
        setIsUserAdmin(false);
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: selectedUser.user_id, role: "admin" });
        if (error) throw error;
        toast.success("Usuário promovido a admin");
        setIsUserAdmin(true);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao alterar permissão");
    } finally {
      setTogglingRole(false);
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    let training: any, diet: any;
    try { training = JSON.parse(trainingText); } catch { toast.error("JSON do treino inválido"); return; }
    try { diet = JSON.parse(dietText); } catch { toast.error("JSON da dieta inválido"); return; }
    setSaving(true);
    if (protocol) {
      const { error } = await supabase
        .from("protocols")
        .update({ training, diet, version: protocol.version + 1 })
        .eq("id", protocol.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Protocolo atualizado");
    } else {
      const { error } = await supabase
        .from("protocols")
        .insert({ user_id: selectedUser.user_id, training, diet, status: "active" });
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Protocolo criado");
    }
    await selectUser(selectedUser);
  };

  const signedUrl = async (path: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage.from("photos").createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  };

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

  const filtered = profiles.filter((p) =>
    !filter || (p.full_name ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div>
      <main className="container mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-3">
          {metrics && (
            <div className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-heading font-semibold">
                <BarChart3 size={16} className="text-primary" /> Métricas (7d)
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <Metric label="Alunos" value={metrics.totalUsers} />
                <Metric label="Protocolos" value={metrics.activeProtocols} />
                <Metric label="Check-ins" value={metrics.checkinsLast7} />
                <Metric label="Treinos" value={metrics.workoutsLast7} />
                <div className="col-span-2 rounded-md bg-background/50 p-2">
                  <p className="text-lg font-bold font-heading text-primary">
                    {metrics.avgAdherence != null ? `${metrics.avgAdherence}%` : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Aderência média</p>
                </div>
              </div>
              {metrics.atRisk.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-1 text-xs text-warning mb-1">
                    <AlertTriangle size={12} /> Em risco ({metrics.atRisk.length})
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {metrics.atRisk.map((r) => (
                      <button
                        key={r.user_id}
                        onClick={() => {
                          const p = profiles.find((x) => x.user_id === r.user_id);
                          if (p) selectUser(p);
                        }}
                        className="w-full text-left text-[11px] hover:text-foreground text-muted-foreground truncate"
                      >
                        • {r.full_name ?? "(sem nome)"} — {r.lastCheckin ? `${Math.floor((Date.now() - new Date(r.lastCheckin).getTime()) / 86400_000)}d` : "nunca"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm font-heading font-semibold">
            <Users size={16} /> Usuários ({profiles.length})
          </div>
          <Input placeholder="Buscar por nome…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="space-y-1 max-h-[60vh] lg:max-h-[70vh] overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p.user_id}
                onClick={() => selectUser(p)}
                className={`w-full text-left rounded-md border p-3 transition ${
                  selectedUser?.user_id === p.user_id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="text-sm font-medium truncate">{p.full_name ?? "(sem nome)"}</div>
                <div className="text-xs text-muted-foreground truncate">{p.goal ?? "—"}</div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground p-3">Nenhum usuário encontrado.</p>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          {!selectedUser ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
              Selecione um usuário para ver detalhes.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-card p-5 mb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-heading font-bold">{selectedUser.full_name ?? "(sem nome)"}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedUser.sex ?? "—"} • {selectedUser.age ?? "—"} anos • {selectedUser.weight ?? "—"}kg • {selectedUser.height ?? "—"}cm
                    </p>
                    <p className="text-xs text-muted-foreground">Objetivo: {selectedUser.goal ?? "—"}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                  {([
                    ["protocol", "Protocolo ativo", ClipboardList],
                    ["history", `Histórico (${history.length})`, HistoryIcon],
                    ["checkins", `Check-ins (${checkins.length})`, ClipboardList],
                    ["feedback", `Feedback (${feedback.length})`, MessageSquare],
                    ["roles", "Permissões", ShieldCheck],
                  ] as const).map(([key, label, Icon]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={tab === key ? "default" : "outline"}
                      onClick={() => setTab(key as Tab)}
                    >
                      <Icon size={14} className="mr-2" /> {label}
                    </Button>
                  ))}
                </div>
              </div>

              {tab === "protocol" && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      {protocol ? `v${protocol.version} • ${protocol.start_date} → ${protocol.end_date}` : "Sem protocolo ativo"}
                    </p>
                    <Button onClick={handleSave} disabled={saving} className="glow">
                      <Save size={16} className="mr-2" />
                      {saving ? "Salvando…" : protocol ? "Salvar nova versão" : "Criar protocolo"}
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm">Treino (JSON)</Label>
                      <Textarea value={trainingText} onChange={(e) => setTrainingText(e.target.value)} rows={18} className="font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Dieta (JSON)</Label>
                      <Textarea value={dietText} onChange={(e) => setDietText(e.target.value)} rows={18} className="font-mono text-xs" />
                    </div>
                  </div>
                </div>
              )}

              {tab === "history" && (
                <div className="space-y-3">
                  {history.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma versão.</p>}
                  {history.map((h) => (
                    <div key={h.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-heading font-semibold text-sm">
                          v{h.version}
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${h.status === "active" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {h.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(h.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "checkins" && (
                <div className="space-y-3">
                  {checkins.length === 0 && <p className="text-sm text-muted-foreground">Nenhum check-in.</p>}
                  {checkins.map((c) => (
                    <CheckinCard key={c.id} c={c} signedUrl={signedUrl} />
                  ))}
                </div>
              )}

              {tab === "feedback" && (
                <div className="space-y-3">
                  {feedback.length === 0 && <p className="text-sm text-muted-foreground">Nenhum feedback.</p>}
                  {feedback.map((f) => (
                    <div key={f.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Treino #{f.day_index + 1}</div>
                        <div className="text-xs text-muted-foreground">{f.session_date}</div>
                      </div>
                      <div className="mt-2 text-sm">Avaliação: <span className="text-primary font-bold">{f.rating}/5</span></div>
                      {f.notes && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{f.notes}</p>}
                    </div>
                  ))}
                </div>
              )}

              {tab === "roles" && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-heading font-semibold flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary" /> Permissões do usuário
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Status atual: {isUserAdmin ? (
                      <span className="text-primary font-semibold">Administrador</span>
                    ) : (
                      <span>Usuário comum</span>
                    )}
                  </p>
                  <Button
                    onClick={toggleAdminRole}
                    disabled={togglingRole}
                    variant={isUserAdmin ? "outline" : "default"}
                    className="mt-4"
                  >
                    {isUserAdmin ? (
                      <><ShieldOff size={14} className="mr-2" /> Remover acesso admin</>
                    ) : (
                      <><ShieldCheck size={14} className="mr-2" /> Promover a admin</>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function CheckinCard({ c, signedUrl }: { c: CheckinRow; signedUrl: (p: string | null) => Promise<string | null> }) {
  // see below
  return <CheckinCardImpl c={c} signedUrl={signedUrl} />;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-background/50 p-2">
      <p className="text-lg font-bold font-heading">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function CheckinCardImpl({ c, signedUrl }: { c: CheckinRow; signedUrl: (p: string | null) => Promise<string | null> }) {
  const [urls, setUrls] = useState<{ front?: string; side?: string; back?: string }>({});
  useEffect(() => {
    (async () => {
      const [f, s, b] = await Promise.all([signedUrl(c.photo_front), signedUrl(c.photo_side), signedUrl(c.photo_back)]);
      setUrls({ front: f ?? undefined, side: s ?? undefined, back: b ?? undefined });
    })();
  }, [c.id]);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <div className="font-semibold">{new Date(c.created_at).toLocaleDateString("pt-BR")}</div>
        <div className="text-muted-foreground">{c.weight ?? "—"} kg • adesão {c.adherence ?? "—"}%</div>
      </div>
      {c.notes && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{c.notes}</p>}
      {(urls.front || urls.side || urls.back) && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {urls.front && <img src={urls.front} alt="frente" className="rounded-md w-full h-32 object-cover" />}
          {urls.side && <img src={urls.side} alt="lado" className="rounded-md w-full h-32 object-cover" />}
          {urls.back && <img src={urls.back} alt="costas" className="rounded-md w-full h-32 object-cover" />}
        </div>
      )}
    </div>
  );
}
