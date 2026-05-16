import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Dumbbell, Apple, FlaskConical, Activity, Leaf } from "lucide-react";

type Exercise = {
  id?: string; name?: string; sets?: number | string; reps?: string | number;
  rest?: string; notes?: string; videoUrl?: string; video_url?: string; rationale?: string;
};
type Day = {
  weekday?: string; name?: string; rationale?: string;
  mobility?: { name?: string; prescription?: string }[];
  cardio?: { duration?: string; frequency?: string; notes?: string };
  exercises?: Exercise[];
};
type Food = { name?: string; amount?: string; calories?: number; protein?: number; carbs?: number; fat?: number };
type MealOption = { label?: string; foods?: Food[] };
type Meal = { label?: string; time?: string; options?: MealOption[]; foods?: Food[] };
type Diet = { totalCalories?: number; protein?: number; carbs?: number; fat?: number; meals?: Meal[]; notes?: string[]; intro?: string };
type Hormone = { substance?: string; dose?: string; route?: string; frequency?: string; duration?: string; notes?: string; category?: string };

function normTraining(v: any): Day[] {
  if (!v) return [];
  const days = v.days ?? v.training_days ?? v.workouts;
  if (!Array.isArray(days)) return [];
  return days.map((d: any) => ({
    weekday: d.weekday, name: d.name ?? d.title, rationale: d.rationale ?? d.why,
    mobility: Array.isArray(d.mobility) ? d.mobility : [],
    cardio: d.cardio, exercises: Array.isArray(d.exercises) ? d.exercises : [],
  }));
}

export function TrainingPreview({ value }: { value: unknown }) {
  const days = normTraining(value);
  const [open, setOpen] = useState<number | null>(0);
  if (!days.length) return <p className="text-sm text-muted-foreground">Sem treino prescrito.</p>;
  return (
    <div className="space-y-3">
      {days.map((d, i) => {
        const isOpen = open === i;
        return (
          <Card key={i} className="overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/40 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-md bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + i)}
                </div>
                <div className="min-w-0">
                  <div className="font-heading font-semibold truncate">{d.name ?? `Treino ${i + 1}`}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {d.weekday ? `${d.weekday} • ` : ""}{(d.exercises ?? []).length} exercícios
                  </div>
                </div>
              </div>
              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isOpen && (
              <div className="border-t border-border p-4 space-y-3">
                {d.rationale && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap italic">{d.rationale}</p>
                )}
                {Array.isArray(d.mobility) && d.mobility.length > 0 && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                    <div className="text-xs font-semibold text-warning flex items-center gap-1 mb-2">
                      <Activity size={12} /> Mobilidade
                    </div>
                    {d.mobility.map((m, k) => (
                      <p key={k} className="text-xs"><span className="font-medium">{m.name}</span>{m.prescription ? ` — ${m.prescription}` : ""}</p>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  {(d.exercises ?? []).map((ex, k) => (
                    <div key={k} className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">{k + 1}.</span>
                            <span className="truncate">{ex.name ?? "—"}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            {ex.sets ?? "—"}x{ex.reps ?? "—"} • desc. {ex.rest ?? "—"}
                          </div>
                        </div>
                        {(ex.videoUrl || ex.video_url) && (
                          <a href={(ex.videoUrl ?? ex.video_url) as string} target="_blank" rel="noreferrer"
                            className="text-xs text-primary shrink-0">🎥 vídeo</a>
                        )}
                      </div>
                      {ex.notes && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{ex.notes}</p>}
                    </div>
                  ))}
                </div>
                {d.cardio && (d.cardio.duration || d.cardio.frequency || d.cardio.notes) && (
                  <div className="rounded-lg border border-border p-3 text-xs">
                    <div className="font-semibold mb-1 flex items-center gap-1"><Activity size={12} /> Cardio</div>
                    <div className="text-muted-foreground">
                      {[d.cardio.duration, d.cardio.frequency, d.cardio.notes].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export function DietPreview({ value }: { value: unknown }) {
  const diet = (value ?? {}) as Diet;
  const meals = diet.meals ?? [];
  const [open, setOpen] = useState<number | null>(0);
  const [activeOpt, setActiveOpt] = useState<Record<number, number>>({});
  if (!meals.length) return <p className="text-sm text-muted-foreground">Sem dieta prescrita.</p>;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="Kcal" value={diet.totalCalories} accent="text-primary" />
          <Stat label="Prot" value={diet.protein != null ? `${diet.protein}g` : undefined} accent="text-sky-400" />
          <Stat label="Carb" value={diet.carbs != null ? `${diet.carbs}g` : undefined} accent="text-amber-400" />
          <Stat label="Gord" value={diet.fat != null ? `${diet.fat}g` : undefined} accent="text-rose-400" />
        </div>
      </Card>
      {diet.intro && (
        <Card className="p-3 text-sm text-muted-foreground whitespace-pre-wrap">{diet.intro}</Card>
      )}
      <div className="space-y-2">
        {meals.map((m, i) => {
          const isOpen = open === i;
          const opts = m.options && m.options.length ? m.options : (m.foods ? [{ foods: m.foods }] : []);
          const oi = activeOpt[i] ?? 0;
          const current = opts[oi];
          const kcal = current?.foods?.reduce((a, f) => a + (f.calories ?? 0), 0) ?? 0;
          return (
            <Card key={i} className="overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : i)} className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/40">
                <div className="min-w-0">
                  <div className="font-heading font-semibold truncate">{m.label ?? `Refeição ${i + 1}`}</div>
                  <div className="text-xs text-muted-foreground">{m.time ? `${m.time} • ` : ""}{current?.foods?.length ?? 0} alimentos</div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{kcal} kcal</span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-border p-4 space-y-3">
                  {opts.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {opts.map((opt, k) => (
                        <Button key={k} size="sm" variant={oi === k ? "default" : "outline"}
                          className="h-7 text-xs gap-1"
                          onClick={() => setActiveOpt((p) => ({ ...p, [i]: k }))}>
                          <Leaf size={10} /> {opt.label ?? `Opção ${k + 1}`}
                        </Button>
                      ))}
                    </div>
                  )}
                  {current?.foods?.map((f, k) => (
                    <div key={k} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        {f.amount && <p className="text-xs text-primary/80 font-mono">{f.amount}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-muted-foreground block">{f.calories ?? 0} kcal</span>
                        <span className="text-[10px] text-muted-foreground">P:{f.protein ?? 0} C:{f.carbs ?? 0} G:{f.fat ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {Array.isArray(diet.notes) && diet.notes.length > 0 && (
        <Card className="p-4">
          <div className="text-sm font-semibold mb-2">Observações</div>
          {diet.notes.map((n, i) => <p key={i} className="text-xs text-muted-foreground">• {n}</p>)}
        </Card>
      )}
    </div>
  );
}

export function HormonesPreview({ value }: { value: unknown }) {
  const items = (Array.isArray(value) ? value : []) as Hormone[];
  if (!items.length) return <p className="text-sm text-muted-foreground">Sem hormônios/suplementação prescritos.</p>;
  return (
    <div className="space-y-2">
      {items.map((h, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FlaskConical size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm">{h.substance ?? "—"}</div>
              <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                {[h.dose, h.route, h.frequency, h.duration].filter(Boolean).join(" • ")}
              </div>
              {h.notes && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{h.notes}</p>}
            </div>
          </div>
        </Card>
      ))}
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

export function ProtocolPreviewTabs({ training, diet, hormones }: { training: unknown; diet: unknown; hormones: unknown }) {
  const [tab, setTab] = useState<"training" | "diet" | "hormones">("training");
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        <Tab active={tab === "training"} onClick={() => setTab("training")} icon={<Dumbbell size={14} />}>Treino</Tab>
        <Tab active={tab === "diet"} onClick={() => setTab("diet")} icon={<Apple size={14} />}>Dieta</Tab>
        <Tab active={tab === "hormones"} onClick={() => setTab("hormones")} icon={<FlaskConical size={14} />}>Hormônios</Tab>
      </div>
      {tab === "training" && <TrainingPreview value={training} />}
      {tab === "diet" && <DietPreview value={diet} />}
      {tab === "hormones" && <HormonesPreview value={hormones} />}
    </div>
  );
}

function Tab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
      {icon}{children}
    </button>
  );
}
