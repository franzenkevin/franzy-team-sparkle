import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CalendarDays, Activity, ChevronRight, Brain } from "lucide-react";

export const Route = createFileRoute("/_authenticated/feedback/")({
  head: () => ({ meta: [{ title: "Feedback — Franzen Team" }] }),
  component: FeedbackHub,
});

function FeedbackHub() {
  const [lastWeekly, setLastWeekly] = useState<string | null>(null);
  const [lastMonthly, setLastMonthly] = useState<string | null>(null);
  const [monthlyCountdown, setMonthlyCountdown] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: w }, { data: m }] = await Promise.all([
        supabase.from("weekly_feedbacks").select("week_start").eq("user_id", user.id)
          .order("week_start", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("monthly_analyses").select("analysis_date").eq("user_id", user.id)
          .order("analysis_date", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setLastWeekly(w?.week_start ?? null);
      setLastMonthly(m?.analysis_date ?? null);
      if (m?.analysis_date) {
        const days = Math.floor((Date.now() - new Date(m.analysis_date).getTime()) / 86400000);
        setMonthlyCountdown(Math.max(0, 30 - days));
      } else {
        setMonthlyCountdown(0);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen container mx-auto px-4 py-6 max-w-2xl">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft size={14}/> Dashboard
      </Link>
      <h1 className="text-2xl md:text-3xl font-heading font-bold">Feedback</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Escolha qual feedback quer preencher. Todas as informações ficam salvas no seu Progresso.
      </p>

      <Link to="/feedback/weekly" className="block mt-5">
        <Card className="p-5 hover:border-primary transition flex items-start gap-3">
          <CalendarDays size={22} className="text-primary mt-0.5" />
          <div className="flex-1">
            <h2 className="font-heading font-semibold">Feedback semanal (livre)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Como foi a semana — treino, dieta, sono, energia, humor e observações livres.
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">
              Último: {lastWeekly ?? "—"}
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Card>
      </Link>

      <Link to="/monthly-analysis" className="block mt-3">
        <Card className="p-5 hover:border-primary transition flex items-start gap-3">
          <Activity size={22} className="text-primary mt-0.5" />
          <div className="flex-1">
            <h2 className="font-heading font-semibold">Feedback mensal — Análise postural</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              A cada 30 dias completos: 4 fotos (frente, lado direito, lado esquerdo, costas), peso e medidas.
            </p>
            <p className="text-[11px] mt-2">
              {lastMonthly
                ? (monthlyCountdown && monthlyCountdown > 0
                    ? <span className="text-amber-300">Disponível em {monthlyCountdown} dia(s) — último: {lastMonthly}</span>
                    : <span className="text-primary">Disponível agora — último: {lastMonthly}</span>)
                : <span className="text-primary">Primeira avaliação disponível</span>}
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </Card>
      </Link>

      <Card className="mt-3 p-5 flex items-start gap-3 border-dashed">
        <Brain size={22} className="text-primary mt-0.5" />
        <div className="flex-1">
          <h2 className="font-heading font-semibold">Análise mental</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            O estado mental (humor, ansiedade, motivação) é coletado dentro dos feedbacks acima
            e fica consolidado no seu Progresso.
          </p>
          <Link to="/progress" className="inline-flex items-center gap-1 text-primary text-sm font-medium mt-2 hover:underline">
            Ver Progresso <ChevronRight size={14} />
          </Link>
        </div>
      </Card>
    </div>
  );
}