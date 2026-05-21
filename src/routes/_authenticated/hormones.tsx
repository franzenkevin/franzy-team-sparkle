import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProtocolRealtime } from "@/hooks/useProtocolRealtime";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pill, Loader2, AlertTriangle, MessageSquare, FlaskConical } from "lucide-react";
import { CoachContactDialog } from "@/components/CoachContactDialog";

export const Route = createFileRoute("/_authenticated/hormones")({
  head: () => ({ meta: [{ title: "Hormônios — Franzen Team" }] }),
  component: HormonesPage,
});

type HormoneItem = {
  substance: string;
  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
};

function HormonesPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HormoneItem[]>([]);
  const [version, setVersion] = useState<number | null>(null);

  const loadProtocol = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("protocols")
      .select("hormones, version")
      .eq("user_id", user.id).eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1).maybeSingle();
    const arr = Array.isArray(data?.hormones) ? (data!.hormones as HormoneItem[]) : [];
    setItems(arr);
    setVersion(data?.version ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { loadProtocol(); }, [loadProtocol]);
  useProtocolRealtime(() => { loadProtocol(); toast.info("Prescrição hormonal atualizada"); });

  if (loading) {
    return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
        <ArrowLeft size={14} /> Dashboard
      </Link>
      <h1 className="mt-3 text-3xl font-heading font-bold flex items-center gap-3">
        <Pill className="text-primary" /> Hormônios
      </h1>
      {version != null && <p className="text-xs text-muted-foreground mt-1">Protocolo v{version}</p>}

      <Card className="mt-4 p-4 border-warning/40 bg-warning/5">
        <div className="flex gap-3 items-start">
          <AlertTriangle className="text-warning shrink-0 mt-0.5" size={18} />
          <p className="text-xs text-muted-foreground">
            Prescrição feita pelo seu coach com acompanhamento médico. Não altere doses por conta própria.
            Em caso de efeitos adversos, comunique imediatamente.
          </p>
        </div>
      </Card>

      {items.length === 0 ? (
        <Card className="mt-6 p-8 text-center text-muted-foreground">
          Nenhuma prescrição hormonal ativa.
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((h, i) => (
            <Card key={i} className="p-4">
              <h3 className="font-heading font-semibold text-lg">{h.substance || "—"}</h3>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {h.dose && <Field label="Dose" value={h.dose} />}
                {h.route && <Field label="Via" value={h.route} />}
                {h.frequency && <Field label="Frequência" value={h.frequency} />}
                {h.duration && <Field label="Duração" value={h.duration} />}
              </div>
              {h.notes && (
                <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2 whitespace-pre-wrap">
                  {h.notes}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6 p-4 flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <FlaskConical className="text-primary shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium">Exames laboratoriais</p>
            <p className="text-xs text-muted-foreground">
              Suba seus exames e veja a lista recomendada para acompanhamento hormonal.
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/exams">Ir para exames</Link>
        </Button>
      </Card>

      <div className="mt-6">
        <CoachContactDialog
          trigger={
            <Button variant="outline" size="sm" className="gap-2">
              <MessageSquare className="h-4 w-4" /> Falar com o coach
            </Button>
          }
        />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}