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

export const Route = createFileRoute("/_authenticated/feedback/diet")({
  head: () => ({ meta: [{ title: "Feedback de dieta — Franzen Team" }] }),
  component: DietFbPage,
});

function DietFbPage() {
  const [list, setList] = useState<any[]>([]);
  const [meal, setMeal] = useState("");
  const [rating, setRating] = useState("");
  const [hunger, setHunger] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("diet_feedback").select("*")
      .eq("user_id", user.id).order("session_date", { ascending: false }).limit(30);
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!rating) { toast.error("Avaliação obrigatória"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("diet_feedback").insert({
      user_id: user.id,
      meal_index: meal ? Number(meal) : null,
      rating: Number(rating),
      hunger: hunger ? Number(hunger) : null,
      notes: notes || null,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Feedback enviado"); setMeal(""); setRating(""); setHunger(""); setNotes(""); load(); }
  };

  return (
    <div className="min-h-screen container mx-auto px-4 py-6 max-w-2xl">
      <Link to="/diet" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4"><ArrowLeft size={14}/> Voltar</Link>
      <h1 className="text-2xl font-heading font-bold mb-1">Feedback da Dieta</h1>
      <p className="text-sm text-muted-foreground mb-6">Avalie como foi a refeição/dia alimentar.</p>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Refeição # (opcional)</Label><Input type="number" min={1} value={meal} onChange={(e) => setMeal(e.target.value)} placeholder="1, 2, 3..." /></div>
          <div><Label>Avaliação (1-5)*</Label><Input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} /></div>
          <div><Label>Fome (1-5)</Label><Input type="number" min={1} max={5} value={hunger} onChange={(e) => setHunger(e.target.value)} /></div>
        </div>
        <div>
          <Label>Observações</Label>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Saciedade, digestão, sabor, sugestões…" />
        </div>
        <Button onClick={save} disabled={saving} className="w-full"><Save size={14} className="mr-2" />{saving ? "Salvando…" : "Enviar"}</Button>
      </Card>

      <h2 className="font-heading font-semibold mt-8 mb-3">Histórico</h2>
      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Sem feedbacks ainda.</p>}
        {list.map((f) => (
          <Card key={f.id} className="p-3 text-sm">
            <div className="flex justify-between"><strong>{f.session_date}</strong><span className="text-primary font-bold">{f.rating}/5</span></div>
            <div className="text-xs text-muted-foreground">Refeição {f.meal_index ?? "—"} · Fome {f.hunger ?? "—"}/5</div>
            {f.notes && <p className="mt-2 whitespace-pre-wrap">{f.notes}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
