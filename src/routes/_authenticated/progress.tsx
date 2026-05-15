import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, TrendingUp, Loader2, Plus, Camera, Share2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { ShareProgressDialog } from "@/components/ShareProgressDialog";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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