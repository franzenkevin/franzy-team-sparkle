import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronUp, Utensils, Loader2, Info, Leaf, Zap, Pill } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/diet")({
  head: () => ({ meta: [{ title: "Dieta — Franzen Team" }] }),
  component: DietPage,
});

type Food = { name: string; amount?: string; calories?: number; protein?: number; carbs?: number; fat?: number };
type MealOption = { label?: string; foods?: Food[] };
type Meal = { label: string; time?: string; options?: MealOption[] };
type Supplement = { name: string; dose?: string; timing?: string; notes?: string };
type Diet = {
  totalCalories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  meals?: Meal[];
  notes?: string[];
  intro?: string;
  supplements?: Supplement[];
  preworkout?: string;
};

function DietPage() {
  const [loading, setLoading] = useState(true);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [expanded, setExpanded] = useState<number | null>(0);
  const [activeOption, setActiveOption] = useState<Record<number, number>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("protocols")
        .select("diet")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setDiet((data?.diet as Diet) ?? null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const meals = diet?.meals ?? [];

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
          <Utensils className="text-primary" /> Dieta
        </h1>

        {!diet || meals.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Você ainda não tem uma dieta ativa. Quando seu coach liberar, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <h3 className="font-heading font-semibold mb-3">Resumo do dia</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <Stat label="Kcal" value={diet.totalCalories} accent="text-primary" />
                <Stat label="Prot" value={diet.protein != null ? `${diet.protein}g` : undefined} accent="text-sky-400" />
                <Stat label="Carb" value={diet.carbs != null ? `${diet.carbs}g` : undefined} accent="text-amber-400" />
                <Stat label="Gord" value={diet.fat != null ? `${diet.fat}g` : undefined} accent="text-rose-400" />
              </div>
            </div>

            {diet.intro && (
              <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 flex gap-3">
                <Zap className="text-primary shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{diet.intro}</p>
              </div>
            )}

            <div className="mt-6 space-y-3">
              {meals.map((meal, idx) => {
                const isOpen = expanded === idx;
                const oi = activeOption[idx] ?? 0;
                const opts = meal.options ?? [];
                const current = opts[oi] ?? opts[0];
                const totalCal = current?.foods?.reduce((a, f) => a + (f.calories ?? 0), 0) ?? 0;
                return (
                  <div key={idx} className="rounded-xl border border-border bg-card overflow-hidden">
                    <button
                      className="w-full p-4 flex items-center justify-between text-left"
                      onClick={() => setExpanded(isOpen ? null : idx)}
                    >
                      <div>
                        <h3 className="font-heading font-semibold">{meal.label}</h3>
                        <p className="text-xs text-muted-foreground">
                          {meal.time ? `${meal.time} • ` : ""}{current?.foods?.length ?? 0} alimentos
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{totalCal} kcal</span>
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        {opts.length > 1 && (
                          <div className="flex flex-wrap gap-1.5">
                            {opts.map((opt, i) => (
                              <Button
                                key={i}
                                size="sm"
                                variant={oi === i ? "default" : "outline"}
                                className="h-7 text-xs gap-1"
                                onClick={() => setActiveOption((p) => ({ ...p, [idx]: i }))}
                              >
                                <Leaf size={10} /> {opt.label ?? `Opção ${i + 1}`}
                              </Button>
                            ))}
                          </div>
                        )}
                        {current?.foods?.map((food, fi) => (
                          <div key={fi} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{food.name}</p>
                              {food.amount && <p className="text-xs text-primary/80 font-mono">{food.amount}</p>}
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-muted-foreground block">{food.calories ?? 0} kcal</span>
                              <span className="text-[10px] text-muted-foreground">
                                P:{food.protein ?? 0}g C:{food.carbs ?? 0}g G:{food.fat ?? 0}g
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {Array.isArray(diet.notes) && diet.notes.length > 0 && (
              <div className="mt-6 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={14} className="text-primary" />
                  <h3 className="font-heading font-semibold text-sm">Observações</h3>
                </div>
                <div className="space-y-1">
                  {diet.notes.map((n, i) => (
                    <p key={i} className="text-xs text-muted-foreground">• {n}</p>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(diet.supplements) && diet.supplements.length > 0 && (
              <div className="mt-4 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Pill size={14} className="text-primary" />
                  <h3 className="font-heading font-semibold text-sm">Suplementação</h3>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {diet.supplements.map((s, i) => (
                    <div key={i} className="rounded-md border border-border bg-background/40 p-3">
                      <p className="text-sm font-medium">{s.name}</p>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {s.dose && <p><span className="text-foreground/70">Dose:</span> {s.dose}</p>}
                        {s.timing && <p><span className="text-foreground/70">Quando:</span> {s.timing}</p>}
                        {s.notes && <p className="whitespace-pre-wrap">{s.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diet.preworkout && (
              <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={14} className="text-primary" />
                  <h3 className="font-heading font-semibold text-sm">Pré-treino / termogênico</h3>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{diet.preworkout}</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value?: number | string; accent?: string }) {
  return (
    <div>
      <p className={`text-lg font-bold ${accent ?? "text-foreground"}`}>{value ?? "—"}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}