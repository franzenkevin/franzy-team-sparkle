import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Shield, Users, ClipboardList, MessageSquare, History as HistoryIcon } from "lucide-react";

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

type Tab = "protocol" | "history" | "checkins" | "feedback";

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [tab, setTab] = useState<Tab>("protocol");

  // protocol active
  const [protocol, setProtocol] = useState<ProtocolRow | null>(null);
  const [trainingText, setTrainingText] = useState("{}");
  const [dietText, setDietText] = useState("{}");
  const [saving, setSaving] = useState(false);

  // history / checkins / feedback
  const [history, setHistory] = useState<ProtocolRow[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);

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
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function CheckinCard({ c, signedUrl }: { c: CheckinRow; signedUrl: (p: string | null) => Promise<string | null> }) {
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
