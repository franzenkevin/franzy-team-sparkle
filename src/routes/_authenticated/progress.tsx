import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, TrendingUp, Loader2, Plus, Camera, Share2, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { ShareProgressDialog } from "@/components/ShareProgressDialog";
import { evaluateCheckinAchievements } from "@/lib/achievements";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Scatter,
  ComposedChart,
  Bar,
} from "recharts";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Progresso — Franzen Team" }] }),
  component: ProgressPage,
});

type Checkin = {
  id: string;
  weight: number | null;
  photo_front: string | null;
  photo_side: string | null;
  photo_back: string | null;
  notes: string | null;
  adherence: number | null;
  created_at: string;
};

const ANGLES: Array<{ key: "photo_front" | "photo_side" | "photo_back"; label: string }> = [
  { key: "photo_front", label: "Frente" },
  { key: "photo_side", label: "Lateral" },
  { key: "photo_back", label: "Costas" },
];

function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [weight, setWeight] = useState("");
  const [adherence, setAdherence] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [shareOpen, setShareOpen] = useState(false);
  const [loadHistory, setLoadHistory] = useState<Record<string, { date: string; max: number; volume: number }[]>>({});
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [periodWeeks, setPeriodWeeks] = useState<4 | 8 | 0>(0); // 0 = tudo
  const [compareMode, setCompareMode] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("checkins")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Checkin[];
    setCheckins(list);

    // Sign all photo paths in one go
    const paths = list.flatMap((c) =>
      [c.photo_front, c.photo_side, c.photo_back].filter(Boolean) as string[]
    );
    const urls: Record<string, string> = {};
    await Promise.all(
      paths.map(async (p) => {
        const { data: s } = await supabase.storage.from("photos").createSignedUrl(p, 3600);
        if (s?.signedUrl) urls[p] = s.signedUrl;
      })
    );
    setSignedUrls(urls);

    // Load workout logs to build per-exercise load progression
    const { data: logs } = await supabase
      .from("workout_logs")
      .select("exercise_name, session_date, sets")
      .eq("user_id", user.id)
      .order("session_date", { ascending: true });
    const grouped: Record<string, { date: string; max: number; volume: number }[]> = {};
    for (const l of logs ?? []) {
      const name = (l.exercise_name as string) || "—";
      const sets = (l.sets ?? []) as Array<{ type?: string; weight?: number; reps?: number; completed?: boolean }>;
      let maxW = 0, vol = 0;
      for (const s of sets) {
        if (s.type !== "valid" || !s.completed) continue;
        const w = Number(s.weight) || 0;
        const r = Number(s.reps) || 0;
        if (w > maxW) maxW = w;
        vol += w * r;
      }
      if (maxW === 0 && vol === 0) continue;
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push({ date: l.session_date as string, max: maxW, volume: Math.round(vol) });
    }
    setLoadHistory(grouped);
    const names = Object.keys(grouped);
    if (names.length > 0 && !names.includes(selectedExercise)) {
      // pick exercise with most sessions
      const top = names.sort((a, b) => grouped[b].length - grouped[a].length)[0];
      setSelectedExercise(top);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const uploadOne = async (userId: string, file: File, angle: string) => {
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}_${angle}.${ext}`;
    const { error } = await supabase.storage.from("photos").upload(path, file);
    if (error) throw error;
    return path;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not signed in");

      const uploaded: Record<string, string | null> = {
        photo_front: null,
        photo_side: null,
        photo_back: null,
      };
      for (const a of ANGLES) {
        const f = files[a.key];
        if (f) uploaded[a.key] = await uploadOne(user.id, f, a.key);
      }

      const { error } = await supabase.from("checkins").insert({
        user_id: user.id,
        weight: weight ? Number(weight) : null,
        adherence: adherence ? Number(adherence) : null,
        notes: notes || null,
        ...uploaded,
      });
      if (error) throw error;

      toast.success("Check-in salvo!");
      evaluateCheckinAchievements(user.id).catch(() => {});
      setShowForm(false);
      setWeight("");
      setAdherence("");
      setNotes("");
      setFiles({});
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar check-in");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const first = checkins[checkins.length - 1];
  const last = checkins[0];
  const weightDelta =
    first?.weight != null && last?.weight != null && first.id !== last.id
      ? Number(last.weight) - Number(first.weight)
      : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-5 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Franzen Team" className="w-8 h-8" />
          <span className="font-heading font-bold tracking-wide text-sm">FRANZEN TEAM</span>
        </Link>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl md:text-4xl font-heading font-bold flex items-center gap-3">
            <TrendingUp className="text-primary" /> Progresso
          </h1>
          <div className="flex gap-2">
            {checkins.length > 0 && (
              <Button variant="outline" onClick={() => setShareOpen(true)}>
                <Share2 size={16} className="mr-1" /> Compartilhar
              </Button>
            )}
            <Button onClick={() => setShowForm((v) => !v)}>
              <Plus size={16} className="mr-1" /> Novo check-in
            </Button>
          </div>
        </div>

        <ShareProgressDialog open={shareOpen} onOpenChange={setShareOpen} />

        {checkins.length > 0 && (
          <div className="mt-6 grid gap-4 grid-cols-3">
            <Stat label="Check-ins" value={checkins.length} />
            <Stat label="Peso atual" value={last?.weight != null ? `${last.weight} kg` : "—"} />
            <Stat
              label="Variação"
              value={
                weightDelta != null
                  ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg`
                  : "—"
              }
              accent={
                weightDelta != null
                  ? weightDelta < 0
                    ? "text-primary"
                    : "text-destructive"
                  : undefined
              }
            />
          </div>
        )}

        {checkins.filter((c) => c.weight != null).length >= 2 && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h3 className="font-heading font-semibold mb-4">Evolução do peso</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[...checkins]
                    .filter((c) => c.weight != null)
                    .reverse()
                    .map((c) => ({
                      date: new Date(c.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      }),
                      peso: Number(c.weight),
                    }))}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="peso"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {Object.keys(loadHistory).length > 0 && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h3 className="font-heading font-semibold flex items-center gap-2">
                <Dumbbell size={16} className="text-primary" /> Progresso de cargas
              </h3>
              <select
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs"
              >
                {Object.keys(loadHistory).sort().map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            {selectedExercise && loadHistory[selectedExercise] && (() => {
              const allSessions = loadHistory[selectedExercise];
              // tag PRs (running max)
              let runningMax = 0;
              const tagged = allSessions.map((d) => {
                const isPR = d.max > runningMax;
                if (isPR) runningMax = d.max;
                return { ...d, isPR };
              });
              const cutoffDays = periodWeeks === 0 ? null : periodWeeks * 7;
              const filtered = cutoffDays
                ? tagged.filter((d) => (Date.now() - new Date(d.date).getTime()) / 86400000 <= cutoffDays)
                : tagged;
              const data = filtered.map((d) => ({
                date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                carga: d.max,
                volume: d.volume,
                pr: d.isPR ? d.max : null,
              }));
              // comparison: split last 8w into two 4w halves
              let compareData: { date: string; recente: number | null; anterior: number | null }[] = [];
              if (compareMode) {
                const now = Date.now();
                const recent = tagged.filter((d) => (now - new Date(d.date).getTime()) / 86400000 <= 28);
                const previous = tagged.filter((d) => {
                  const age = (now - new Date(d.date).getTime()) / 86400000;
                  return age > 28 && age <= 56;
                });
                const N = Math.max(recent.length, previous.length);
                compareData = Array.from({ length: N }).map((_, i) => ({
                  date: `Sessão ${i + 1}`,
                  recente: recent[i]?.max ?? null,
                  anterior: previous[i]?.max ?? null,
                }));
              }
              const first = filtered[0]?.max ?? 0;
              const lastV = filtered[filtered.length - 1]?.max ?? 0;
              const delta = lastV - first;
              const prCount = tagged.filter((d) => d.isPR).length;
              const allTimePR = Math.max(0, ...tagged.map((d) => d.max));
              const totalVolume = filtered.reduce((acc, d) => acc + d.volume, 0);
              const avgVolume = filtered.length ? Math.round(totalVolume / filtered.length) : 0;
              return (
                <>
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
                      {([
                        { v: 4, label: "4 sem" },
                        { v: 8, label: "8 sem" },
                        { v: 0, label: "Tudo" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.v}
                          onClick={() => { setPeriodWeeks(opt.v); setCompareMode(false); }}
                          className={`px-3 py-1.5 ${!compareMode && periodWeeks === opt.v ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCompareMode((v) => !v)}
                      className={`px-3 py-1.5 rounded-md border border-border text-xs ${compareMode ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                    >
                      Comparar 4 vs 8 sem
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <Stat label="Sessões" value={filtered.length} />
                    <Stat label="Carga atual" value={`${lastV} kg`} />
                    <Stat
                      label="Evolução"
                      value={`${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`}
                      accent={delta > 0 ? "text-primary" : delta < 0 ? "text-destructive" : undefined}
                    />
                    <Stat label="PRs" value={prCount} accent="text-primary" />
                    <Stat label="Volume médio" value={`${avgVolume.toLocaleString("pt-BR")} kg`} />
                  </div>
                  <div className="mb-3 text-xs text-muted-foreground">
                    Recorde absoluto: <span className="text-primary font-semibold">{allTimePR} kg</span> · Volume total do período: <span className="text-foreground font-semibold">{totalVolume.toLocaleString("pt-BR")} kg</span>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {compareMode ? (
                        <LineChart data={compareData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={["auto", "auto"]} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="recente" name="Últimas 4 sem" stroke="hsl(var(--primary))" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="anterior" name="4 sem anteriores" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="4 4" connectNulls dot={{ r: 3 }} />
                        </LineChart>
                      ) : (
                        <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} domain={["auto", "auto"]} />
                          <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar yAxisId="right" dataKey="volume" name="Volume (kg)" fill="hsl(var(--muted))" opacity={0.6} />
                          <Line yAxisId="left" type="monotone" dataKey="carga" name="Carga máx (kg)" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
                          <Scatter yAxisId="left" dataKey="pr" name="PR 🏆" fill="#f5a623" shape="star" />
                        </ComposedChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {showForm && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-heading font-semibold">Novo check-in</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="w">Peso (kg)</Label>
                <Input id="w" type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="a">Aderência (0-100%)</Label>
                <Input id="a" type="number" inputMode="numeric" value={adherence} onChange={(e) => setAdherence(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="n">Notas</Label>
              <Textarea id="n" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Como foi a semana?" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {ANGLES.map((a) => (
                <div key={a.key} className="space-y-1">
                  <Label className="text-xs">{a.label}</Label>
                  <label className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background p-3 cursor-pointer hover:border-primary text-xs text-muted-foreground">
                    <Camera size={16} />
                    {files[a.key]?.name?.slice(0, 14) ?? "Selecionar"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setFiles((p) => ({ ...p, [a.key]: e.target.files?.[0] ?? null }))}
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="animate-spin mr-2" size={14} />}
                Salvar
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {checkins.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">
                Nenhum check-in ainda. Registre o primeiro pra começar a acompanhar sua evolução.
              </p>
            </div>
          )}
          {checkins.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-heading font-semibold">
                    {new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.weight != null ? `${c.weight} kg` : "sem peso"}
                    {c.adherence != null ? ` · aderência ${c.adherence}%` : ""}
                  </p>
                </div>
              </div>
              {c.notes && <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{c.notes}</p>}
              {(c.photo_front || c.photo_side || c.photo_back) && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {ANGLES.map((a) => {
                    const path = c[a.key];
                    const url = path ? signedUrls[path] : undefined;
                    return (
                      <div key={a.key} className="aspect-[3/4] rounded-lg bg-muted overflow-hidden">
                        {url ? (
                          <img src={url} alt={a.label} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            {a.label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <p className={`text-2xl font-bold font-heading ${accent ?? "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}