import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, ChevronUp, ChevronDown, Dumbbell, Sparkles, Activity } from "lucide-react";

type Exercise = {
  id?: string;
  name?: string;
  sets?: number | string;
  reps?: string | number;
  rest?: string;
  notes?: string;
  warmupSets?: number;
  videoUrl?: string;
  rationale?: string;
};
type Mobility = { name?: string; prescription?: string };
type Day = {
  weekday?: string;
  name?: string;
  rationale?: string;
  mobility?: Mobility[];
  cardio?: { duration?: string; frequency?: string; notes?: string };
  exercises?: Exercise[];
};
type Training = { days?: Day[]; notes?: string };

const LETTERS = ["A","B","C","D","E","F","G","H"];
const WEEKDAYS = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

function normalize(value: unknown): Training {
  const v = (value && typeof value === "object" ? value : {}) as any;
  const rawDays = v.days ?? v.training_days ?? v.workouts ?? [];
  const days: Day[] = Array.isArray(rawDays) ? rawDays.map((d: any) => ({
    weekday: d.weekday ?? "",
    name: d.name ?? d.title ?? "",
    rationale: d.rationale ?? d.why ?? "",
    mobility: Array.isArray(d.mobility) ? d.mobility : [],
    cardio: d.cardio ?? undefined,
    exercises: Array.isArray(d.exercises) ? d.exercises.map((e: any) => ({
      id: e.id, name: e.name ?? "", sets: e.sets ?? "", reps: e.reps ?? "",
      rest: e.rest ?? "", notes: e.notes ?? "", warmupSets: e.warmupSets,
      videoUrl: e.videoUrl ?? e.video_url ?? "", rationale: e.rationale ?? "",
    })) : [],
  })) : [];
  return { days, notes: v.notes ?? "" };
}

export function TrainingEditor({ value, onChange }: { value: unknown; onChange: (v: Training) => void }) {
  const t = useMemo(() => normalize(value), [value]);
  const days = t.days ?? [];

  const update = (next: Training) => onChange(next);
  const setDay = (i: number, patch: Partial<Day>) => {
    const nd = [...days]; nd[i] = { ...nd[i], ...patch }; update({ ...t, days: nd });
  };
  const moveDay = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= days.length) return;
    const nd = [...days]; [nd[i], nd[j]] = [nd[j], nd[i]]; update({ ...t, days: nd });
  };
  const addDay = () => update({ ...t, days: [...days, { name: `Treino ${LETTERS[days.length] ?? days.length + 1}`, exercises: [] }] });
  const removeDay = (i: number) => update({ ...t, days: days.filter((_, k) => k !== i) });

  const setEx = (di: number, ei: number, patch: Partial<Exercise>) => {
    const exs = [...(days[di].exercises ?? [])]; exs[ei] = { ...exs[ei], ...patch };
    setDay(di, { exercises: exs });
  };
  const addEx = (di: number) => setDay(di, { exercises: [...(days[di].exercises ?? []), { name: "", sets: 3, reps: "8-12", rest: "90s" }] });
  const removeEx = (di: number, ei: number) => setDay(di, { exercises: (days[di].exercises ?? []).filter((_, k) => k !== ei) });
  const moveEx = (di: number, ei: number, dir: -1 | 1) => {
    const exs = [...(days[di].exercises ?? [])]; const j = ei + dir;
    if (j < 0 || j >= exs.length) return; [exs[ei], exs[j]] = [exs[j], exs[ei]]; setDay(di, { exercises: exs });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-2"><Dumbbell size={14} className="text-primary" /> Plano de treino</div>
        <Button size="sm" variant="outline" onClick={addDay}><Plus size={14} className="mr-1" />Adicionar treino</Button>
      </div>

      {days.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum treino. Clique em "Adicionar treino" para começar.</Card>
      )}

      {days.map((d, di) => (
        <Card key={di} className="p-4 space-y-3">
          <div className="flex items-start gap-2 flex-wrap">
            <div className="h-9 w-9 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center">
              {LETTERS[di] ?? di + 1}
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1 min-w-[220px]">
              <Input placeholder="Nome (ex.: Inferiores - Quads)" value={d.name ?? ""} onChange={(e) => setDay(di, { name: e.target.value })} />
              <select className="rounded-md border border-input bg-background px-2 text-sm h-9"
                value={d.weekday ?? ""} onChange={(e) => setDay(di, { weekday: e.target.value })}>
                <option value="">Dia (opcional)</option>
                {WEEKDAYS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => moveDay(di, -1)} disabled={di === 0}><ChevronUp size={14} /></Button>
              <Button size="icon" variant="ghost" onClick={() => moveDay(di, 1)} disabled={di === days.length - 1}><ChevronDown size={14} /></Button>
              <Button size="icon" variant="ghost" onClick={() => removeDay(di)}><Trash2 size={14} className="text-destructive" /></Button>
            </div>
          </div>

          <Textarea placeholder="Justificativa / racional do dia (opcional)" rows={2}
            value={d.rationale ?? ""} onChange={(e) => setDay(di, { rationale: e.target.value })} className="text-xs" />

          <div className="space-y-2">
            {(d.exercises ?? []).map((ex, ei) => (
              <div key={ei} className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground w-5">{ei + 1}.</span>
                  <Input placeholder="Exercício" value={ex.name ?? ""} onChange={(e) => setEx(di, ei, { name: e.target.value })} className="h-8" />
                  <div className="flex gap-0.5 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveEx(di, ei, -1)} disabled={ei === 0}><ChevronUp size={12} /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveEx(di, ei, 1)} disabled={ei === (d.exercises?.length ?? 0) - 1}><ChevronDown size={12} /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeEx(di, ei)}><Trash2 size={12} className="text-destructive" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Input placeholder="Séries" value={ex.sets ?? ""} onChange={(e) => setEx(di, ei, { sets: e.target.value })} className="h-8 text-xs" />
                  <Input placeholder="Reps (ex.: 8-12)" value={String(ex.reps ?? "")} onChange={(e) => setEx(di, ei, { reps: e.target.value })} className="h-8 text-xs" />
                  <Input placeholder="Descanso" value={ex.rest ?? ""} onChange={(e) => setEx(di, ei, { rest: e.target.value })} className="h-8 text-xs" />
                  <Input placeholder="Vídeo (URL)" value={ex.videoUrl ?? ""} onChange={(e) => setEx(di, ei, { videoUrl: e.target.value })} className="h-8 text-xs" />
                </div>
                <Textarea placeholder="Observações / técnica" rows={2} value={ex.notes ?? ""} onChange={(e) => setEx(di, ei, { notes: e.target.value })} className="text-xs" />
              </div>
            ))}
            <Button size="sm" variant="outline" className="w-full" onClick={() => addEx(di)}>
              <Plus size={14} className="mr-1" /> Adicionar exercício
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-border">
            <Label className="text-xs flex items-center gap-1 md:col-span-3"><Activity size={12} /> Cardio do dia (opcional)</Label>
            <Input placeholder="Duração" value={d.cardio?.duration ?? ""} onChange={(e) => setDay(di, { cardio: { ...(d.cardio ?? {}), duration: e.target.value } })} className="h-8 text-xs" />
            <Input placeholder="Frequência" value={d.cardio?.frequency ?? ""} onChange={(e) => setDay(di, { cardio: { ...(d.cardio ?? {}), frequency: e.target.value } })} className="h-8 text-xs" />
            <Input placeholder="Notas" value={d.cardio?.notes ?? ""} onChange={(e) => setDay(di, { cardio: { ...(d.cardio ?? {}), notes: e.target.value } })} className="h-8 text-xs" />
          </div>
        </Card>
      ))}

      <div>
        <Label className="text-xs flex items-center gap-1"><Sparkles size={12} /> Observações gerais</Label>
        <Textarea rows={3} value={t.notes ?? ""} onChange={(e) => update({ ...t, notes: e.target.value })} className="text-xs mt-1" />
      </div>
    </div>
  );
}