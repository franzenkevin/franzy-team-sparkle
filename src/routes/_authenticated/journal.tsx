import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, BookHeart, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useDraftAutoSave } from "@/hooks/useDraftAutoSave";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({ meta: [{ title: "Diário — Franzen Team" }] }),
  component: JournalPage,
});

type Entry = { id: string; entry_date: string; mood: number | null; sleep_hours: number | null; energy: number | null; notes: string | null };

const today = () => new Date().toISOString().slice(0, 10);
const MOODS = ["😞", "😕", "😐", "🙂", "😄"];
const ENERGY = ["💤", "🔋", "⚡", "🔥", "🚀"];

function JournalPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [todayE, setTodayE] = useState<Entry | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleep, setSleep] = useState("");
  const [notes, setNotes] = useState("");

  const { savedAt, clearDraft } = useDraftAutoSave(
    "journal-today",
    { mood, energy, sleep, notes },
    (s) => {
      if (typeof s.mood === "number" || s.mood === null) setMood(s.mood as number | null);
      if (typeof s.energy === "number" || s.energy === null) setEnergy(s.energy as number | null);
      if (typeof s.sleep === "string") setSleep(s.sleep);
      if (typeof s.notes === "string") setNotes(s.notes);
    },
    { ready: !loading && !todayE },
  );

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMe(user.id);
    const { data } = await supabase.from("journal_entries").select("*").eq("user_id", user.id).order("entry_date", { ascending: false }).limit(60);
    const list = (data ?? []) as Entry[];
    setEntries(list);
    const t = list.find((e) => e.entry_date === today()) ?? null;
    setTodayE(t);
    if (t) {
      setMood(t.mood); setEnergy(t.energy);
      setSleep(t.sleep_hours?.toString() ?? "");
      setNotes(t.notes ?? "");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!me) return;
    setSaving(true);
    const payload = {
      user_id: me, entry_date: today(),
      mood, energy,
      sleep_hours: sleep ? Number(sleep) : null,
      notes: notes || null,
    };
    const { error } = await supabase.from("journal_entries").upsert(payload, { onConflict: "user_id,entry_date" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Diário salvo");
    clearDraft();
    load();
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-5 border-b border-border">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
          <BookHeart className="text-primary" /> Diário
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Como você está hoje?</p>

        <div className="mt-6 rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Humor</Label>
            <div className="flex gap-2">
              {MOODS.map((m, i) => (
                <button key={i} onClick={() => setMood(i + 1)} className={`text-2xl p-2 rounded-lg border ${mood === i + 1 ? "border-primary bg-primary/10" : "border-border"}`}>{m}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Energia</Label>
            <div className="flex gap-2">
              {ENERGY.map((m, i) => (
                <button key={i} onClick={() => setEnergy(i + 1)} className={`text-2xl p-2 rounded-lg border ${energy === i + 1 ? "border-primary bg-primary/10" : "border-border"}`}>{m}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Horas de sono</Label>
            <Input type="number" step="0.5" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="8" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Notas</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Como foi o dia, sensações no treino, dieta..." />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            <Save size={16} className="mr-2" />{todayE ? "Atualizar de hoje" : "Salvar de hoje"}
          </Button>
          {savedAt && !todayE && <p className="text-[11px] text-muted-foreground text-center">Rascunho salvo {savedAt}</p>}
        </div>

        <h2 className="mt-8 font-heading font-semibold text-lg">Histórico</h2>
        <div className="mt-3 space-y-2">
          {entries.filter((e) => e.entry_date !== today()).length === 0 && (
            <p className="text-sm text-muted-foreground">Sem entradas anteriores.</p>
          )}
          {entries.filter((e) => e.entry_date !== today()).map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{new Date(e.entry_date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</p>
                <div className="flex gap-2 text-lg">
                  {e.mood && <span>{MOODS[e.mood - 1]}</span>}
                  {e.energy && <span>{ENERGY[e.energy - 1]}</span>}
                  {e.sleep_hours && <span className="text-xs text-muted-foreground self-center">{e.sleep_hours}h</span>}
                </div>
              </div>
              {e.notes && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{e.notes}</p>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}