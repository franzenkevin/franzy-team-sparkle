import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, ImageIcon, CheckCircle2, Download, Activity } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listMyBodyAnalyses } from "@/lib/body-analysis.functions";
import { generateBodyAnalysisPdf } from "@/lib/bodyAnalysisPdf";

export const Route = createFileRoute("/_authenticated/body-analysis")({
  head: () => ({ meta: [{ title: "Análise do coach — Franzen Team" }] }),
  component: BodyAnalysisPage,
});

function BodyAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<any[]>([]);
  const listFn = useServerFn(listMyBodyAnalyses);

  useEffect(() => {
    (async () => {
      try {
        const r = await listFn();
        // Aluno só vê análises liberadas pelo coach.
        setList((r.items ?? []).filter((a: any) => a.status === "approved"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <Link to="/feedback" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <ArrowLeft size={14} /> Voltar
      </Link>
      <div className="flex items-center gap-2 mb-1">
        <Activity className="text-primary" size={22} />
        <h1 className="text-2xl font-heading font-bold">Análise do coach</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Avaliações visuais feitas pelo seu coach a partir das fotos da sua anamnese e dos seus feedbacks.
      </p>

      {loading ? (
        <div className="grid place-items-center py-12"><Loader2 className="animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma análise liberada ainda. Quando o coach concluir sua avaliação, ela aparece aqui.
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((a) => <AnalysisCard key={a.id} item={a} />)}
        </div>
      )}
    </div>
  );
}

function AnalysisCard({ item }: { item: any }) {
  const [open, setOpen] = useState(false);
  let parsed: any = null;
  try { parsed = JSON.parse(item.content); } catch { parsed = null; }
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
        <Badge variant="default" className="gap-1"><CheckCircle2 size={12} /> Liberada</Badge>
      </div>
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
    </Card>
  );
}
