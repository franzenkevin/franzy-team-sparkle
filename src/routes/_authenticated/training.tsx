import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Dumbbell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/training")({
  head: () => ({ meta: [{ title: "Treino — Franzen Team" }] }),
  component: TrainingPage,
});

type WorkoutSet = {
  type: "warmup" | "valid";
  weight: number;
  reps: number;
  completed: boolean;
};

type Exercise = {
  id: string;
  name: string;
  sets?: number;
  reps?: string | number;
  rest?: string;
  notes?: string;
};

type TrainingDay = { weekday?: string; name?: string; exercises: Exercise[] };

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const todayWeekday = WEEKDAYS[new Date().getDay()];
const todayISO = new Date().toISOString().split("T")[0];

function normalizeTraining(training: unknown): TrainingDay[] {
  if (!training) return [];
  const t = training as Record<string, unknown>;
  const days = (t.days ?? t.training_days ?? t.workouts) as unknown;
  if (!Array.isArray(days)) return [];
  return days.map((d: any, i: number) => ({
    weekday: d.weekday,
    name: d.name ?? d.title ?? `Treino ${i + 1}`,
    exercises: Array.isArray(d.exercises) ? d.exercises : [],
  }));
}

function TrainingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [protocol, setProtocol] = useState<{ id: string; training: unknown } | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [exerciseSets, setExerciseSets] = useState<Record<string, WorkoutSet[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("protocols")
        .select("id, training")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setProtocol(data);
      setLoading(false);
    })();
  }, []);

  const days = useMemo(() => normalizeTraining(protocol?.training), [protocol]);

  // Auto-select today's day
  useEffect(() => {
    if (days.length === 0) return;
    const idx = days.findIndex((d) => d.weekday === todayWeekday);
    setSelectedDay(idx >= 0 ? idx : 0);
  }, [days.length]);

  const day = days[selectedDay];

  // Load saved logs for selected day
  useEffect(() => {
    if (!protocol || !day) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: logs } = await supabase
        .from("workout_logs")
        .select("exercise_id, sets")
        .eq("user_id", user.id)
        .eq("protocol_id", protocol.id)
        .eq("day_index", selectedDay)
        .eq("session_date", todayISO);

      const initial: Record<string, WorkoutSet[]> = {};
      for (const ex of day.exercises) {
        const saved = logs?.find((l) => l.exercise_id === ex.id);
        if (saved) {
          initial[ex.id] = saved.sets as WorkoutSet[];
        } else {
          const count = Math.min(Math.max(Number(ex.sets) || 3, 1), 6);
          initial[ex.id] = Array.from({ length: count }, () => ({
            type: "valid" as const,
            weight: 0,
            reps: 0,
            completed: false,
          }));
        }
      }
      setExerciseSets(initial);
    })();
  }, [protocol?.id, selectedDay, day]);

  const updateSet = (exId: string, i: number, field: keyof WorkoutSet, value: number | boolean) => {
    setExerciseSets((prev) => {
      const sets = [...(prev[exId] || [])];
      sets[i] = { ...sets[i], [field]: value as never };
      return { ...prev, [exId]: sets };
    });
  };

  const saveExercise = async (ex: Exercise) => {
    if (!protocol) return;
    const sets = exerciseSets[ex.id];
    if (!sets) return;
    setSavingId(ex.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not signed in");

      const { data: existing } = await supabase
        .from("workout_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("protocol_id", protocol.id)
        .eq("day_index", selectedDay)
        .eq("exercise_id", ex.id)
        .eq("session_date", todayISO)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("workout_logs")
          .update({ sets, exercise_name: ex.name })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workout_logs").insert({
          user_id: user.id,
          protocol_id: protocol.id,
          day_index: selectedDay,
          exercise_id: ex.id,
          exercise_name: ex.name,
          session_date: todayISO,
          sets,
        });
        if (error) throw error;
      }
      toast.success("Exercício salvo!");
    } catch (e) {
      toast.error("Erro ao salvar");
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-5 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Franzen Team" className="w-8 h-8" />
          <span className="font-heading font-bold tracking-wide text-sm">FRANZEN TEAM</span>
        </Link>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-heading font-bold flex items-center gap-3">
          <Dumbbell className="text-primary" /> Treino
        </h1>

        {days.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Você ainda não tem um protocolo de treino ativo. Quando seu coach liberar, ele aparecerá aqui.
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: "/dashboard" })}>
              Voltar ao dashboard
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
              {days.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm transition ${
                    i === selectedDay
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  {d.weekday ?? d.name}
                </button>
              ))}
            </div>

            {day && (
              <div className="mt-6 space-y-4">
                <h2 className="font-heading text-xl font-semibold">{day.name}</h2>
                {day.exercises.length === 0 && (
                  <p className="text-muted-foreground">Sem exercícios cadastrados neste dia.</p>
                )}
                {day.exercises.map((ex) => {
                  const sets = exerciseSets[ex.id] ?? [];
                  return (
                    <div key={ex.id} className="rounded-xl border border-border bg-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-heading font-semibold">{ex.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ex.sets ?? sets.length} séries
                            {ex.reps ? ` × ${ex.reps} reps` : ""}
                            {ex.rest ? ` · descanso ${ex.rest}` : ""}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveExercise(ex)}
                          disabled={savingId === ex.id}
                        >
                          {savingId === ex.id ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                          <span className="ml-1">Salvar</span>
                        </Button>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
                          <span className="col-span-1">#</span>
                          <span className="col-span-4">Carga (kg)</span>
                          <span className="col-span-4">Reps</span>
                          <span className="col-span-3 text-right">Feito</span>
                        </div>
                        {sets.map((s, i) => (
                          <div key={i} className="grid grid-cols-12 gap-2 items-center">
                            <span className="col-span-1 text-sm text-muted-foreground">{i + 1}</span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={s.weight || ""}
                              onChange={(e) => updateSet(ex.id, i, "weight", Number(e.target.value))}
                              className="col-span-4 h-9"
                            />
                            <Input
                              type="number"
                              inputMode="numeric"
                              value={s.reps || ""}
                              onChange={(e) => updateSet(ex.id, i, "reps", Number(e.target.value))}
                              className="col-span-4 h-9"
                            />
                            <div className="col-span-3 flex justify-end">
                              <Checkbox
                                checked={s.completed}
                                onCheckedChange={(v) => updateSet(ex.id, i, "completed", Boolean(v))}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}