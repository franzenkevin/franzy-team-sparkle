import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/feedback/weekly")({
  head: () => ({ meta: [{ title: "Feedback semanal — Franzen Team" }] }),
  component: WeeklyPage,
});

function WeeklyPage() {
  const [list, setList] = useState<any[]>([]);
  const [weight, setWeight] = useState("");
  const [aTrain, setATrain] = useState("");
  const [aDiet, setADiet] = useState("");
  const [energy, setEnergy] = useState("");
  const [sleep, setSleep] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("weekly_feedbacks").select("*")
      .eq("user_id", user.id).order("week_start", { ascending: false }).limit(20);
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload: any = {
      user_id: user.id,
      week_start: new Date().toISOString().slice(0, 10),
      weight: weight ? Number(weight) : null,
      adherence_training: aTrain ? Number(aTrain) : null,
      adherence_diet: aDiet ? Number(aDiet) : null,
      energy: energy ? Number(energy) : null,
      sleep_quality: sleep ? Number(sleep) : null,
      notes: notes || null,
    };
    const { error } = await supabase.from("weekly_feedbacks").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Feedback enviado!");
      setWeight(""); setATrain(""); setADiet(""); setEnergy(""); setSleep(""); setNotes("");
      load();
    }
  };

  return (
    <div className="min-h-screen container mx-auto px-4 py-6 max-w-2xl">
      <Link to="/progress" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4"><ArrowLeft size={14}/> Voltar</Link>
      <h1 className="text-2xl font-heading font-bold mb-1">Feedback Semanal</h1>
      <p className="text-sm text-muted-foreground mb-6">Como foi sua semana? Suas respostas vão para o coach.</p>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Peso (kg)</Label><Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
          <div><Label>Aderência treino (%)</Label><Input type="number" value={aTrain} onChange={(e) => setATrain(e.target.value)} /></div>
          <div><Label>Aderência dieta (%)</Label><Input type="number" value={aDiet} onChange={(e) => setADiet(e.target.value)} /></div>
          <div><Label>Energia (1-5)</Label><Input type="number" min={1} max={5} value={energy} onChange={(e) => setEnergy(e.target.value)} /></div>
          <div><Label>Qualidade do sono (1-5)</Label><Input type="number" min={1} max={5} value={sleep} onChange={(e) => setSleep(e.target.value)} /></div>
        </div>
        <div>
          <Label>Observações</Label>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dificuldades, vitórias, dores, fome…" />
        </div>
        <Button onClick={save} disabled={saving} className="w-full"><Save size={14} className="mr-2" />{saving ? "Salvando…" : "Enviar feedback"}</Button>
      </Card>

      <h2 className="font-heading font-semibold mt-8 mb-3">Histórico</h2>
      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Sem feedbacks ainda.</p>}
        {list.map((f) => (
          <Card key={f.id} className="p-3 text-sm">
            <div className="flex justify-between"><strong>{f.week_start}</strong><span className="text-muted-foreground">{f.weight ?? "—"}kg</span></div>
            <div className="text-xs text-muted-foreground">Treino {f.adherence_training ?? "—"}% · Dieta {f.adherence_diet ?? "—"}% · Energia {f.energy ?? "—"}/5</div>
            {f.notes && <p className="mt-2 whitespace-pre-wrap">{f.notes}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
