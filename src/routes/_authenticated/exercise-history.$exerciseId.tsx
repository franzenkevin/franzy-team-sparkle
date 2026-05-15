import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, LineChart as LineChartIcon, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/exercise-history/$exerciseId")({
  head: () => ({ meta: [{ title: "Histórico do exercício — Franzen Team" }] }),
  component: ExerciseHistoryPage,
});

type WorkoutSet = { type: string; weight: number; reps: number; completed: boolean };
type Log = { id: string; session_date: string; exercise_name: string; sets: WorkoutSet[] };

function ExerciseHistoryPage() {
  const { exerciseId } = useParams({ from: "/_authenticated/exercise-history/$exerciseId" });
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("workout_logs")
        .select("id, session_date, exercise_name, sets")
        .eq("user_id", user.id)
        .eq("exercise_id", exerciseId)
        .order("session_date", { ascending: true })
        .limit(200);
      setLogs((data ?? []) as unknown as Log[]);
      setLoading(false);
    })();
  }, [exerciseId]);

  const chartData = useMemo(() => {
    return logs.map((l) => {
      const valid = (l.sets ?? []).filter((s) => s.type !== "warmup");
      const maxWeight = Math.max(0, ...valid.map((s) => s.weight || 0));
      const totalReps = valid.reduce((acc, s) => acc + (s.reps || 0), 0);
      const tonnage = valid.reduce((acc, s) => acc + (s.weight || 0) * (s.reps || 0), 0);
      return {
        date: new Date(l.session_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        carga: maxWeight,
        reps: totalReps,
        volume: tonnage,
      };
    });
  }, [logs]);

  const exerciseName = logs[0]?.exercise_name ?? "Exercício";

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/training" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Voltar
      </Link>
      <h1 className="mt-4 text-3xl md:text-4xl font-heading font-bold flex items-center gap-3">
        <LineChartIcon className="text-primary" /> {exerciseName}
      </h1>
      <p className="mt-2 text-muted-foreground text-sm">{logs.length} sessões registradas.</p>

      {logs.length < 2 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Registre mais sessões deste exercício para ver a evolução.
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h3 className="font-heading font-semibold mb-3">Carga máxima (kg)</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="carga" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-card p-5">
            <h3 className="font-heading font-semibold mb-3">Volume total (kg × reps) e reps</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="volume" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reps" stroke="hsl(var(--cta))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <div className="mt-6 space-y-2">
        {[...logs].reverse().map((l) => (
          <div key={l.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">
                {new Date(l.session_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </span>
              <span className="text-muted-foreground text-xs">{l.sets?.length ?? 0} séries</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {(l.sets ?? []).map((s, i) => `${i + 1}: ${s.weight || "—"}×${s.reps || "—"}`).join("  ·  ")}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}