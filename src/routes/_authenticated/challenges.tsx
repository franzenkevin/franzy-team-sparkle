import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Flame, Loader2, Plus, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/challenges")({
  head: () => ({ meta: [{ title: "Desafios — Franzen Team" }] }),
  component: ChallengesPage,
});

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  target_metric: string;
  target_value: number;
  reward_points: number;
  reward_badge: string | null;
};
type Part = { id: string; challenge_id: string; progress: number; completed_at: string | null };

function ChallengesPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [items, setItems] = useState<Challenge[]>([]);
  const [parts, setParts] = useState<Record<string, Part>>({});
  const [counts, setCounts] = useState({ workouts: 0, checkins: 0, streak: 0 });
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", ends_at: "", target_metric: "workouts", target_value: 10, reward_points: 50, reward_badge: "" });

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMe(user.id);
    const [{ data: role }, { data: ch }, { data: mp }, wkRes, ckRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
      supabase.from("challenges").select("*").order("ends_at", { ascending: true }),
      supabase.from("challenge_participations").select("*").eq("user_id", user.id),
      supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("checkins").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    setIsAdmin(!!role);
    setItems((ch ?? []) as Challenge[]);
    const map: Record<string, Part> = {};
    for (const p of (mp ?? []) as Part[]) map[p.challenge_id] = p;
    setParts(map);
    setCounts({ workouts: wkRes.count ?? 0, checkins: ckRes.count ?? 0, streak: 0 });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const progressFor = (c: Challenge): number => {
    if (c.target_metric === "workouts") return Math.min(counts.workouts, c.target_value);
    if (c.target_metric === "checkins") return Math.min(counts.checkins, c.target_value);
    return parts[c.id]?.progress ?? 0;
  };

  const join = async (c: Challenge) => {
    if (!me) return;
    const { error } = await supabase.from("challenge_participations").insert({ challenge_id: c.id, user_id: me, progress: 0 });
    if (error) return toast.error(error.message);
    toast.success("Você entrou no desafio");
    load();
  };

  const claim = async (c: Challenge) => {
    if (!me) return;
    const { error } = await supabase.from("challenge_participations").update({ progress: c.target_value, completed_at: new Date().toISOString() }).eq("challenge_id", c.id).eq("user_id", me);
    if (error) return toast.error(error.message);
    toast.success("Desafio concluído! 🏆");
    load();
  };

  const createChallenge = async () => {
    if (!form.title || !form.ends_at) return toast.error("Título e data final obrigatórios");
    const { error } = await supabase.from("challenges").insert({
      title: form.title, description: form.description || null, ends_at: form.ends_at,
      target_metric: form.target_metric, target_value: Number(form.target_value),
      reward_points: Number(form.reward_points), reward_badge: form.reward_badge || null,
      created_by: me,
    });
    if (error) return toast.error(error.message);
    toast.success("Desafio criado");
    setShowNew(false);
    setForm({ title: "", description: "", ends_at: "", target_metric: "workouts", target_value: 10, reward_points: 50, reward_badge: "" });
    load();
  };

  const removeChallenge = async (id: string) => {
    if (!confirm("Apagar desafio?")) return;
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-5 border-b border-border">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowNew((v) => !v)}><Plus size={16} className="mr-1" /> Novo desafio</Button>
        )}
      </header>
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
          <Flame className="text-primary" /> Desafios
        </h1>

        {showNew && isAdmin && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-heading font-semibold">Criar desafio</h3>
            <div className="space-y-1"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1"><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Data final</Label><Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Métrica</Label>
                <Select value={form.target_metric} onValueChange={(v) => setForm({ ...form, target_metric: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workouts">Treinos</SelectItem>
                    <SelectItem value="checkins">Check-ins</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Meta</Label><Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>Pontos</Label><Input type="number" value={form.reward_points} onChange={(e) => setForm({ ...form, reward_points: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-1"><Label>Badge (emoji)</Label><Input value={form.reward_badge} onChange={(e) => setForm({ ...form, reward_badge: e.target.value })} placeholder="🔥" /></div>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Button><Button onClick={createChallenge}>Salvar</Button></div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum desafio ativo.</p>}
          {items.map((c) => {
            const part = parts[c.id];
            const prog = progressFor(c);
            const pct = Math.min(100, Math.round((prog / c.target_value) * 100));
            const done = !!part?.completed_at || prog >= c.target_value;
            return (
              <div key={c.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-heading font-semibold flex items-center gap-2">{c.reward_badge && <span>{c.reward_badge}</span>}{c.title}</p>
                    {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      Até {new Date(c.ends_at).toLocaleDateString("pt-BR")} · Meta: {c.target_value} {c.target_metric} · +{c.reward_points} pts
                    </p>
                  </div>
                  {isAdmin && (
                    <Button size="icon" variant="ghost" onClick={() => removeChallenge(c.id)}><Trash2 size={14} /></Button>
                  )}
                </div>
                {part && (
                  <div className="mt-3">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{prog} / {c.target_value} ({pct}%)</p>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  {!part && <Button size="sm" onClick={() => join(c)}>Participar</Button>}
                  {part && !done && prog >= c.target_value && <Button size="sm" onClick={() => claim(c)}><Check size={14} className="mr-1" /> Concluir</Button>}
                  {done && <span className="text-xs text-primary font-medium">✓ Concluído</span>}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}