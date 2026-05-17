import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Camera, Sparkles, Loader2, ImageIcon, CheckCircle2, Clock, Download } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { requestBodyAnalysis, listMyBodyAnalyses } from "@/lib/body-analysis.functions";
import { generateBodyAnalysisPdf } from "@/lib/bodyAnalysisPdf";

export const Route = createFileRoute("/_authenticated/body-analysis")({
  head: () => ({ meta: [{ title: "Análise corporal IA — Franzen Team" }] }),
  component: BodyAnalysisPage,
});

type Slot = "front" | "side" | "back";

function BodyAnalysisPage() {
  const [photos, setPhotos] = useState<Record<Slot, { path: string; url: string } | null>>({
    front: null, side: null, back: null,
  });
  const [uploading, setUploading] = useState<Slot | null>(null);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [notes, setNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const reqFn = useServerFn(requestBodyAnalysis);
  const listFn = useServerFn(listMyBodyAnalyses);

  const refresh = async () => {
    const r = await listFn();
    setList(r.items ?? []);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles")
        .select("weight, height").eq("user_id", user.id).maybeSingle();
      if (p?.weight) setWeight(String(p.weight));
      if (p?.height) setHeight(String(p.height));
      await refresh();
    })();
  }, []);

  const upload = async (slot: Slot, file: File) => {
    setUploading(slot);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/body-analysis/${slot}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("photos").createSignedUrl(path, 3600);
      setPhotos((p) => ({ ...p, [slot]: { path, url: signed?.signedUrl || "" } }));
      toast.success(`Foto ${slot} enviada`);
    } catch (e: any) {
      toast.error(e.message || "Falha no upload");
    } finally {
      setUploading(null);
    }
  };

  const analyze = async () => {
    if (!photos.front || !photos.side || !photos.back) {
      toast.error("Envie as 3 fotos antes de analisar.");
      return;
    }
    setAnalyzing(true);
    try {
      await reqFn({
        data: {
          photoFront: photos.front.path,
          photoSide: photos.side.path,
          photoBack: photos.back.path,
          weight: weight ? Number(weight) : null,
          height: height ? Number(height) : null,
          notes: notes || null,
        },
      });
      toast.success("Análise enviada para revisão do coach.");
      setPhotos({ front: null, side: null, back: null });
      setNotes("");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Falha na análise");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <ArrowLeft size={14} /> Voltar
      </Link>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="text-primary" size={22} />
        <h1 className="text-2xl font-heading font-bold">Análise corporal IA</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Envie 3 fotos (frente, lado e costas) com boa iluminação e roupa justa. A IA estimará % de gordura,
        simetria, pontos fortes/fracos, postura e recomendações. O coach revisa antes de liberar.
      </p>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {(["front", "side", "back"] as Slot[]).map((slot) => (
            <PhotoSlot
              key={slot}
              label={slot === "front" ? "Frente" : slot === "side" ? "Lado" : "Costas"}
              photo={photos[slot]}
              uploading={uploading === slot}
              onFile={(f) => upload(slot, f)}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Peso atual (kg)</Label>
            <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
          <div>
            <Label>Altura (cm)</Label>
            <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Observações (opcional)</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: foco em ombros, posso ter retenção hoje, etc." />
        </div>

        <Button onClick={analyze} disabled={analyzing} className="w-full">
          {analyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando…</> : <><Sparkles className="mr-2 h-4 w-4" /> Analisar com IA</>}
        </Button>
      </Card>

      <h2 className="font-heading font-semibold mt-8 mb-3">Minhas análises</h2>
      <div className="space-y-3">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma análise ainda.</p>}
        {list.map((a) => (
          <AnalysisCard key={a.id} item={a} />
        ))}
      </div>
    </div>
  );
}

function PhotoSlot({ label, photo, uploading, onFile }: {
  label: string;
  photo: { path: string; url: string } | null;
  uploading: boolean;
  onFile: (f: File) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium mb-1 block">{label}</span>
      <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-border bg-muted/30 overflow-hidden grid place-items-center cursor-pointer hover:border-primary transition-colors relative">
        {photo?.url ? (
          <img src={photo.url} alt={label} className="w-full h-full object-cover" />
        ) : uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <div className="text-center text-muted-foreground">
            <Camera className="mx-auto h-6 w-6" />
            <span className="text-[10px] mt-1 block">Toque para enviar</span>
          </div>
        )}
        <input
          type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          disabled={uploading}
        />
      </div>
    </label>
  );
}

function AnalysisCard({ item }: { item: any }) {
  const [open, setOpen] = useState(false);
  let parsed: any = null;
  try { parsed = JSON.parse(item.content); } catch { parsed = null; }
  const status = item.status as string;
  const date = new Date(item.created_at).toLocaleDateString("pt-BR");

  const downloadPdf = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: p } = user ? await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle() : { data: null } as any;
    generateBodyAnalysisPdf({
      fullName: p?.full_name ?? "Aluno",
      createdAt: item.created_at,
      analysis: parsed ?? {},
      meta: item.meta ?? {},
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">{date}</span>
        </div>
        {status === "approved" ? (
          <Badge variant="default" className="gap-1"><CheckCircle2 size={12} /> Liberada</Badge>
        ) : (
          <Badge variant="secondary" className="gap-1"><Clock size={12} /> Em revisão</Badge>
        )}
      </div>

      {status !== "approved" ? (
        <p className="text-xs text-muted-foreground">Aguardando aprovação do coach.</p>
      ) : (
        <>
          {parsed?.overall_summary && (
            <p className="text-sm whitespace-pre-wrap">{parsed.overall_summary}</p>
          )}
          <div className="flex gap-2 mt-2 -ml-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
              {open ? "Ocultar detalhes" : "Ver detalhes"}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPdf}>
              <Download size={14} className="mr-1" /> PDF
            </Button>
          </div>
          {open && parsed && (
            <div className="mt-2 space-y-2 text-sm">
              {parsed.body_fat_estimate && <div><strong>% gordura:</strong> {parsed.body_fat_estimate}</div>}
              {parsed.lean_mass_estimate && <div><strong>Massa magra:</strong> {parsed.lean_mass_estimate}</div>}
              {Array.isArray(parsed.strong_points) && parsed.strong_points.length > 0 && (
                <div><strong>Pontos fortes:</strong>
                  <ul className="list-disc pl-5">{parsed.strong_points.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {Array.isArray(parsed.weak_points) && parsed.weak_points.length > 0 && (
                <div><strong>Pontos a melhorar:</strong>
                  <ul className="list-disc pl-5">{parsed.weak_points.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {Array.isArray(parsed.posture_deviations) && parsed.posture_deviations.length > 0 && (
                <div><strong>Postura:</strong>
                  <ul className="list-disc pl-5">{parsed.posture_deviations.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0 && (
                <div><strong>Recomendações:</strong>
                  <ul className="list-disc pl-5">{parsed.recommendations.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
