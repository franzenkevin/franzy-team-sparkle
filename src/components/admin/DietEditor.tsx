import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, ChevronUp, ChevronDown, Utensils, Leaf, Pill, Zap } from "lucide-react";
import { LOCAL_FOODS, type FoodItem } from "@/lib/foodsDb";
import { supabase } from "@/integrations/supabase/client";

type Food = {
  name?: string;
  amount?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  /** Quando true, recalcula macros automaticamente a partir da base por 100g + quantidade em gramas. */
  auto?: boolean;
};
type MealOption = { label?: string; foods?: Food[] };
type Meal = { label?: string; time?: string; options?: MealOption[] };
type Supplement = { name?: string; dose?: string; timing?: string; notes?: string };
type Diet = {
  totalCalories?: number; protein?: number; carbs?: number; fat?: number;
  intro?: string; notes?: string[]; meals?: Meal[];
  supplements?: Supplement[];
  preworkout?: string;
};

function normalize(value: unknown): Diet {
  const v = (value && typeof value === "object" ? value : {}) as any;
  const meals: Meal[] = Array.isArray(v.meals) ? v.meals.map((m: any) => ({
    label: m.label ?? m.name ?? "",
    time: m.time ?? "",
    options: Array.isArray(m.options) && m.options.length > 0
      ? m.options.map((o: any) => ({
          label: o.label ?? "",
          foods: Array.isArray(o.foods) ? o.foods : [],
        }))
      : [{ label: "Opção 1", foods: Array.isArray(m.foods) ? m.foods : [] }],
  })) : [];
  return {
    totalCalories: v.totalCalories, protein: v.protein, carbs: v.carbs, fat: v.fat,
    intro: v.intro ?? "", notes: Array.isArray(v.notes) ? v.notes : [], meals,
    supplements: Array.isArray(v.supplements) ? v.supplements : [],
    preworkout: v.preworkout ?? "",
  };
}

const toNum = (s: string) => (s === "" ? undefined : Number(s));

/** Extrai gramas de strings como "200g", "1 colher (30g)", "150". */
function parseGrams(amount?: string): number | null {
  if (!amount) return null;
  const m = String(amount).match(/(\d+(?:[.,]\d+)?)\s*g/i) ?? String(amount).match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

type BaseFood = { name: string; kcal: number; protein: number; carbs: number; fat: number; serving_g?: number };

function bestMatch(name: string | undefined, db: BaseFood[]): BaseFood | null {
  const q = (name ?? "").trim().toLowerCase();
  if (q.length < 3) return null;
  let best: BaseFood | null = null;
  let bestScore = 0;
  for (const f of db) {
    const n = f.name.toLowerCase();
    let score = 0;
    if (n === q) score = 100;
    else if (n.includes(q)) score = 60 + Math.min(20, q.length);
    else if (q.includes(n.split(",")[0])) score = 40;
    if (score > bestScore) { bestScore = score; best = f; }
  }
  return bestScore >= 40 ? best : null;
}

function computeFromBase(base: BaseFood, grams: number): { calories: number; protein: number; carbs: number; fat: number } {
  const per = base.serving_g && base.serving_g > 0 ? base.serving_g : 100;
  const k = grams / per;
  const r = (n: number) => Math.round(n * 10) / 10;
  return {
    calories: Math.round(base.kcal * k),
    protein: r(base.protein * k),
    carbs: r(base.carbs * k),
    fat: r(base.fat * k),
  };
}

export function DietEditor({ value, onChange }: { value: unknown; onChange: (v: Diet) => void }) {
  const d = useMemo(() => normalize(value), [value]);
  const meals = d.meals ?? [];
  const update = (next: Diet) => onChange(next);

  const [customFoods, setCustomFoods] = useState<BaseFood[]>([]);
  useEffect(() => {
    let alive = true;
    supabase.from("custom_foods").select("name, kcal, protein, carbs, fat, serving_g").limit(1000)
      .then(({ data }) => { if (alive && data) setCustomFoods(data as any); });
    return () => { alive = false; };
  }, []);

  const foodDb: BaseFood[] = useMemo(() => {
    const local: BaseFood[] = LOCAL_FOODS.map((f: FoodItem) => ({
      name: f.name, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, serving_g: 100,
    }));
    return [...customFoods, ...local];
  }, [customFoods]);

  const setMeal = (mi: number, patch: Partial<Meal>) => {
    const nm = [...meals]; nm[mi] = { ...nm[mi], ...patch }; update({ ...d, meals: nm });
  };
  const addMeal = () => update({ ...d, meals: [...meals, { label: `Refeição ${meals.length + 1}`, time: "", options: [{ label: "Opção 1", foods: [] }] }] });
  const removeMeal = (mi: number) => update({ ...d, meals: meals.filter((_, k) => k !== mi) });
  const moveMeal = (mi: number, dir: -1 | 1) => {
    const j = mi + dir; if (j < 0 || j >= meals.length) return;
    const nm = [...meals]; [nm[mi], nm[j]] = [nm[j], nm[mi]]; update({ ...d, meals: nm });
  };

  const setOpt = (mi: number, oi: number, patch: Partial<MealOption>) => {
    const opts = [...(meals[mi].options ?? [])]; opts[oi] = { ...opts[oi], ...patch };
    setMeal(mi, { options: opts });
  };
  const addOpt = (mi: number) => setMeal(mi, { options: [...(meals[mi].options ?? []), { label: `Opção ${(meals[mi].options?.length ?? 0) + 1}`, foods: [] }] });
  const removeOpt = (mi: number, oi: number) => setMeal(mi, { options: (meals[mi].options ?? []).filter((_, k) => k !== oi) });

  const setFood = (mi: number, oi: number, fi: number, patch: Partial<Food>) => {
    const foods = [...((meals[mi].options ?? [])[oi]?.foods ?? [])];
    const next: Food = { ...foods[fi], ...patch };

    // Auto-cálculo: se mudou o nome ou a quantidade, tenta casar com a biblioteca
    // e recalcula macros proporcionalmente. Macros editados à mão desligam o auto.
    const nameOrAmountChanged = "name" in patch || "amount" in patch;
    const macroEditedManually = ("protein" in patch) || ("carbs" in patch) || ("fat" in patch) || ("calories" in patch);

    if (macroEditedManually) {
      next.auto = false;
    } else if (nameOrAmountChanged) {
      const match = bestMatch(next.name, foodDb);
      const grams = parseGrams(next.amount);
      if (match && grams) {
        const c = computeFromBase(match, grams);
        next.calories = c.calories;
        next.protein = c.protein;
        next.carbs = c.carbs;
        next.fat = c.fat;
        next.auto = true;
      }
    }

    foods[fi] = next;
    setOpt(mi, oi, { foods });
  };
  const addFood = (mi: number, oi: number) => {
    const foods = [...((meals[mi].options ?? [])[oi]?.foods ?? []), { name: "", amount: "", calories: 0, protein: 0, carbs: 0, fat: 0 }];
    setOpt(mi, oi, { foods });
  };
  const removeFood = (mi: number, oi: number, fi: number) => {
    const foods = ((meals[mi].options ?? [])[oi]?.foods ?? []).filter((_, k) => k !== fi);
    setOpt(mi, oi, { foods });
  };

  const supplements = d.supplements ?? [];
  const setSupp = (i: number, patch: Partial<Supplement>) => {
    const next = [...supplements]; next[i] = { ...next[i], ...patch };
    update({ ...d, supplements: next });
  };
  const addSupp = () => update({ ...d, supplements: [...supplements, { name: "", dose: "", timing: "" }] });
  const removeSupp = (i: number) => update({ ...d, supplements: supplements.filter((_, k) => k !== i) });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-2"><Utensils size={14} className="text-primary" /> Plano alimentar</div>
        <Button size="sm" variant="outline" onClick={addMeal}><Plus size={14} className="mr-1" />Adicionar refeição</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <NumField label="Kcal total" value={d.totalCalories} onChange={(v) => update({ ...d, totalCalories: v })} />
        <NumField label="Prot (g)" value={d.protein} onChange={(v) => update({ ...d, protein: v })} />
        <NumField label="Carb (g)" value={d.carbs} onChange={(v) => update({ ...d, carbs: v })} />
        <NumField label="Gord (g)" value={d.fat} onChange={(v) => update({ ...d, fat: v })} />
      </div>

      <Textarea placeholder="Introdução / orientações da dieta" rows={2}
        value={d.intro ?? ""} onChange={(e) => update({ ...d, intro: e.target.value })} className="text-xs" />

      <p className="text-[10px] text-muted-foreground -mt-1">
        Dica: digite o alimento (ex.: "Arroz, branco, cozido") e a quantidade em gramas (ex.: "200g"). Os macros são calculados automaticamente pela biblioteca de alimentos. Editar P/C/G/kcal manualmente desativa o auto-cálculo.
      </p>

      {meals.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma refeição. Clique em "Adicionar refeição".</Card>
      )}

      {meals.map((m, mi) => (
        <Card key={mi} className="p-4 space-y-3">
          <div className="flex items-start gap-2 flex-wrap">
            <div className="grid grid-cols-3 gap-2 flex-1 min-w-[220px]">
              <Input placeholder="Hora" value={m.time ?? ""} onChange={(e) => setMeal(mi, { time: e.target.value })} className="h-9" />
              <Input placeholder="Nome (ex.: Almoço)" value={m.label ?? ""} onChange={(e) => setMeal(mi, { label: e.target.value })} className="h-9 col-span-2" />
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => moveMeal(mi, -1)} disabled={mi === 0}><ChevronUp size={14} /></Button>
              <Button size="icon" variant="ghost" onClick={() => moveMeal(mi, 1)} disabled={mi === meals.length - 1}><ChevronDown size={14} /></Button>
              <Button size="icon" variant="ghost" onClick={() => removeMeal(mi)}><Trash2 size={14} className="text-destructive" /></Button>
            </div>
          </div>

          <div className="space-y-3">
            {(m.options ?? []).map((opt, oi) => (
              <div key={oi} className="rounded-lg border border-border p-3 bg-muted/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Leaf size={12} className="text-primary" />
                  <Input className="h-8 text-xs" placeholder="Rótulo da opção" value={opt.label ?? ""} onChange={(e) => setOpt(mi, oi, { label: e.target.value })} />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeOpt(mi, oi)} disabled={(m.options?.length ?? 0) <= 1}>
                    <Trash2 size={12} className="text-destructive" />
                  </Button>
                </div>
                {(opt.foods ?? []).map((f, fi) => (
                  <div key={fi} className="space-y-1.5 rounded-md border border-border/60 p-2 sm:p-0 sm:border-0">
                    <div className="flex gap-1.5 items-center">
                      <Input className="h-8 text-xs flex-1 min-w-0" placeholder="Alimento" list="diet-foods-db"
                        value={f.name ?? ""} onChange={(e) => setFood(mi, oi, fi, { name: e.target.value })} />
                      <Input className="h-8 text-xs w-20 shrink-0" placeholder="Qtd (g)" value={f.amount ?? ""} onChange={(e) => setFood(mi, oi, fi, { amount: e.target.value })} />
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeFood(mi, oi, fi)}><Trash2 size={12} className="text-destructive" /></Button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      <Input className="h-8 text-xs" placeholder="P" value={f.protein ?? ""} onChange={(e) => setFood(mi, oi, fi, { protein: toNum(e.target.value) })} />
                      <Input className="h-8 text-xs" placeholder="C" value={f.carbs ?? ""} onChange={(e) => setFood(mi, oi, fi, { carbs: toNum(e.target.value) })} />
                      <Input className="h-8 text-xs" placeholder="G" value={f.fat ?? ""} onChange={(e) => setFood(mi, oi, fi, { fat: toNum(e.target.value) })} />
                      <Input className="h-8 text-xs" placeholder="kcal" value={f.calories ?? ""} onChange={(e) => setFood(mi, oi, fi, { calories: toNum(e.target.value) })} />
                    </div>
                    {f.auto && (
                      <p className="text-[10px] text-primary/80">Auto-calculado pela biblioteca</p>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" className="w-full h-8" onClick={() => addFood(mi, oi)}>
                  <Plus size={12} className="mr-1" /> Alimento
                </Button>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => addOpt(mi)}><Plus size={12} className="mr-1" /> Adicionar opção substituta</Button>
          </div>
        </Card>
      ))}

      <div>
        <Label className="text-xs">Suplementação / notas (uma por linha)</Label>
        <Textarea rows={3} className="text-xs mt-1"
          value={(d.notes ?? []).join("\n")}
          onChange={(e) => update({ ...d, notes: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium flex items-center gap-2"><Pill size={14} className="text-primary" /> Suplementos</div>
          <Button size="sm" variant="outline" onClick={addSupp}><Plus size={14} className="mr-1" />Adicionar</Button>
        </div>
        {supplements.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum suplemento cadastrado.</p>
        )}
        {supplements.map((s, i) => (
          <div key={i} className="rounded-lg border border-border p-3 bg-muted/20 space-y-2">
            <div className="flex items-center gap-2">
              <Input className="h-8 text-xs" placeholder="Nome (ex.: Whey)" value={s.name ?? ""} onChange={(e) => setSupp(i, { name: e.target.value })} />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeSupp(i)}><Trash2 size={12} className="text-destructive" /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input className="h-8 text-xs" placeholder="Dose (ex.: 30g)" value={s.dose ?? ""} onChange={(e) => setSupp(i, { dose: e.target.value })} />
              <Input className="h-8 text-xs" placeholder="Quando (ex.: pós-treino)" value={s.timing ?? ""} onChange={(e) => setSupp(i, { timing: e.target.value })} />
            </div>
            <Textarea rows={2} className="text-xs" placeholder="Observações" value={s.notes ?? ""} onChange={(e) => setSupp(i, { notes: e.target.value })} />
          </div>
        ))}
      </Card>

      <datalist id="diet-foods-db">
        {foodDb.slice(0, 500).map((f, i) => (<option key={i} value={f.name} />))}
      </datalist>

      <div>
        <Label className="text-xs flex items-center gap-1"><Zap size={12} className="text-primary" /> Pré-treino / termogênico</Label>
        <Textarea rows={2} className="text-xs mt-1" placeholder="Ex.: Cafeína 200mg + beta-alanina 20min antes…"
          value={d.preworkout ?? ""} onChange={(e) => update({ ...d, preworkout: e.target.value })} />
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input type="number" className="h-8 text-xs mt-0.5" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
    </div>
  );
}