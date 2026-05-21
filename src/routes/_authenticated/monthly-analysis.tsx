import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Camera, Save, Loader2 } from "lucide-react";
import { useDraftAutoSave } from "@/hooks/useDraftAutoSave";

export const Route = createFileRoute("/_authenticated/monthly-analysis")({
  head: () => ({ meta: [{ title: "Análise mensal — Franzen Team" }] }),
  component: MonthlyPage,
});

const ANGLES = [
  { key: "photo_front", label: "Frente" },
  { key: "photo_side", label: "Lado" },
  { key: "photo_back", label: "Costas" },
] as const;

function MonthlyPage() {
  const [list, setList] = useState<any[]>([]);
  const [daysUntilUnlock, setDaysUntilUnlock] = useState<number | null>(null);
  const [weight, setWeight] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [arm, setArm] = useState("");
  const [thigh, setThigh] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState(false);
  const [signed, setSigned] = useState<Record<string, string>>({});

  const { savedAt, clearDraft } = useDraftAutoSave(
    "monthly-analysis",
    { weight, chest, waist, hip, arm, thigh, notes },
    (s) => {
      if (typeof s.weight === "string") setWeight(s.weight);
      if (typeof s.chest === "string") setChest(s.chest);
      if (typeof s.waist === "string") setWaist(s.waist);
      if (typeof s.hip === "string") setHip(s.hip);
      if (typeof s.arm === "string") setArm(s.arm);
      if (typeof s.thigh === "string") setThigh(s.thigh);
      if (typeof s.notes === "string") setNotes(s.notes);
    },
  );

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Gate: feedback mensal só libera 30 dias após o início do protocolo ativo.
    const { data: proto } = await supabase
      .from("protocols").select("start_date")
      .eq("user_id", user.id).eq("status", "active")
      .order("start_date", { ascending: false }).limit(1).maybeSingle();
    if (proto?.start_date) {
      const start = new Date(proto.start_date as string).getTime();
      const days = Math.floor((Date.now() - start) / 86400000);
      setDaysUntilUnlock(days >= 30 ? 0 : 30 - days);
    } else {
      setDaysUntilUnlock(null);
    }
    const { data } = await supabase.from("monthly_analyses").select("*")
      .eq("user_id", user.id).order("analysis_date", { ascending: false }).limit(12);
    setList(data ?? []);
    const paths = (data ?? []).flatMap((r: any) => ["photo_front", "photo_side", "photo_back"].map((k) => r[k]).filter(Boolean));
    const out: Record<string, string> = {};
    for (const p of paths) {
      const { data: u } = await supabase.storage.from("photos").createSignedUrl(p, 3600);
      if (u?.signedUrl) out[p] = u.signedUrl;
    }
    setSigned(out);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const uploads: Record<string, string | null> = {};
    for (const a of ANGLES) {
      const f = files[a.key];
      if (!f) { uploads[a.key] = null; continue; }
      const path = `${user.id}/monthly/${Date.now()}_${a.key}.jpg`;
      const { error: upErr } = await supabase.storage.from("photos").upload(path, f, { upsert: true });
      if (upErr) { toast.error(upErr.message); setSaving(false); return; }
      uploads[a.key] = path;
    }
    const measurements = {
      chest: chest || null, waist: waist || null, hip: hip || null, arm: arm || null, thigh: thigh || null,
    };
    const { error } = await supabase.from("monthly_analyses").insert({
      user_id: user.id,
      weight: weight ? Number(weight) : null,
      measurements,
      coach_notes: notes || null,
      photo_front: uploads.photo_front,
      photo_side: uploads.photo_side,
      photo_back: uploads.photo_back,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Análise enviada! O coach vai revisar.");
      setWeight(""); setChest(""); setWaist(""); setHip(""); setArm(""); setThigh(""); setNotes(""); setFiles({});
      clearDraft();
      load();
    }
  };

  return (
    <div className="min-h-screen container mx-auto px-4 py-6 max-w-2xl">
      <Link to="/progress" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4"><ArrowLeft size={14}/> Voltar</Link>
      <h1 className="text-2xl font-heading font-bold mb-1">Análise Mensal</h1>
      <p className="text-sm text-muted-foreground mb-6">A cada 4 semanas envie peso, medidas e fotos. O coach gerará um feedback escrito.</p>

      {daysUntilUnlock && daysUntilUnlock > 0 ? (
        <Card className="p-5 text-center space-y-2 border-dashed">
          <h2 className="font-heading font-semibold">Disponível em {daysUntilUnlock} {daysUntilUnlock === 1 ? "dia" : "dias"}</h2>
          <p className="text-sm text-muted-foreground">O feedback mensal libera 30 dias após o início do seu protocolo atual.</p>
        </Card>
      ) : (
      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Peso (kg)</Label><Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
          <div><Label>Peito (cm)</Label><Input type="number" value={chest} onChange={(e) => setChest(e.target.value)} /></div>
          <div><Label>Cintura (cm)</Label><Input type="number" value={waist} onChange={(e) => setWaist(e.target.value)} /></div>
          <div><Label>Quadril (cm)</Label><Input type="number" value={hip} onChange={(e) => setHip(e.target.value)} /></div>
          <div><Label>Braço (cm)</Label><Input type="number" value={arm} onChange={(e) => setArm(e.target.value)} /></div>
          <div><Label>Coxa (cm)</Label><Input type="number" value={thigh} onChange={(e) => setThigh(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ANGLES.map((a) => (
            <div key={a.key} className="space-y-1">
              <Label className="text-xs">{a.label}</Label>
              <label className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-3 cursor-pointer hover:border-primary text-xs text-muted-foreground">
                <Camera size={16} />
                {files[a.key]?.name?.slice(0, 14) ?? "Selecionar"}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => setFiles((p) => ({ ...p, [a.key]: e.target.files?.[0] ?? null }))} />
              </label>
            </div>
          ))}
        </div>
        <div>
          <Label>Observações suas</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="animate-spin mr-2" size={14}/> : <Save size={14} className="mr-2" />}
          {saving ? "Salvando…" : "Enviar análise"}
        </Button>
        {savedAt && <p className="text-[11px] text-muted-foreground text-center">Rascunho salvo {savedAt} (textos; fotos não)</p>}
      </Card>
      )}

      <h2 className="font-heading font-semibold mt-8 mb-3">Última avaliação postural</h2>
      <div className="space-y-3">
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground">Ainda não há avaliação registrada.</p>
        )}
        {list.slice(0, 1).map((m) => (
          <Card key={m.id} className="p-4">
            <div className="flex justify-between text-sm"><strong>{m.analysis_date}</strong><span className="text-muted-foreground">{m.weight ?? "—"}kg</span></div>
            {(m.photo_front || m.photo_side || m.photo_back) && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {ANGLES.map((a) => {
                  const path = (m as any)[a.key];
                  const url = path ? signed[path] : null;
                  return (
                    <div key={a.key} className="aspect-[3/4] rounded-lg bg-muted overflow-hidden">
                      {url ? <img src={url} alt={a.label} className="w-full h-full object-cover" /> :
                        <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">{a.label}</div>}
                    </div>
                  );
                })}
              </div>
            )}
            {m.ai_summary && (
              <div className="mt-3 p-3 rounded-md bg-primary/5 border border-primary/20 text-sm">
                <strong className="text-xs text-primary">Análise IA</strong>
                <p className="mt-1 whitespace-pre-wrap">{m.ai_summary}</p>
              </div>
            )}
            {m.coach_notes && (
              <div className="mt-3 p-3 rounded-md bg-accent/30 text-sm">
                <strong className="text-xs">Feedback do coach</strong>
                <p className="mt-1 whitespace-pre-wrap">{m.coach_notes}</p>
              </div>
            )}
          </Card>
        ))}
        {list.length > 1 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            Apenas a última avaliação fica visível aqui. O histórico completo está no seu Progresso.
          </p>
        )}
      </div>
    </div>
  );
}
