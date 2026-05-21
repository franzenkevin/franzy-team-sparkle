import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Plus, Search, Trash2, Loader2, Barcode, AlertTriangle } from "lucide-react";
import {
  searchLocalFoods,
  searchOpenFoodFacts,
  lookupBarcode,
  type FoodItem,
  type OffProduct,
} from "@/lib/foodsDb";

type FoodLog = {
  id: string;
  log_date: string;
  meal_type: string;
  food_name: string;
  amount_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string | null;
};

type Targets = { kcal?: number; protein?: number; carbs?: number; fat?: number };

const MEALS = [
  { key: "breakfast", label: "Café da manhã" },
  { key: "lunch", label: "Almoço" },
  { key: "snack", label: "Lanche" },
  { key: "dinner", label: "Jantar" },
  { key: "other", label: "Outros" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function FoodDiary({ targets }: { targets?: Targets }) {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [dialogMeal, setDialogMeal] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", date)
      .order("created_at", { ascending: true });
    setLogs((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  const totals = useMemo(() => {
    return logs.reduce(
      (a, l) => ({
        kcal: a.kcal + Number(l.calories || 0),
        protein: a.protein + Number(l.protein || 0),
        carbs: a.carbs + Number(l.carbs || 0),
        fat: a.fat + Number(l.fat || 0),
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [logs]);

  const removeLog = async (id: string) => {
    await supabase.from("food_logs").delete().eq("id", id);
    setLogs((p) => p.filter((l) => l.id !== id));
  };

  const addFood = async (params: {
    meal: string; name: string; amountG: number;
    per100: { kcal: number; protein: number; carbs: number; fat: number };
    source: string; barcode?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const f = params.amountG / 100;
    const row = {
      user_id: user.id,
      log_date: date,
      meal_type: params.meal,
      food_name: params.name,
      amount_g: params.amountG,
      calories: +(params.per100.kcal * f).toFixed(1),
      protein: +(params.per100.protein * f).toFixed(1),
      carbs: +(params.per100.carbs * f).toFixed(1),
      fat: +(params.per100.fat * f).toFixed(1),
      source: params.source,
      barcode: params.barcode ?? null,
    };
    const { data } = await supabase.from("food_logs").insert(row).select("*").single();
    if (data) setLogs((p) => [...p, data as any]);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="text-primary" size={18} />
          <h3 className="font-heading font-semibold">Diário alimentar</h3>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto h-8 text-xs"
        />
      </div>

      <div className="p-4 grid grid-cols-4 gap-2 text-center border-b border-border bg-background/40">
        <Macro label="Kcal" value={totals.kcal} target={targets?.kcal} accent="text-primary" />
        <Macro label="Prot" value={totals.protein} target={targets?.protein} accent="text-sky-400" unit="g" />
        <Macro label="Carb" value={totals.carbs} target={targets?.carbs} accent="text-amber-400" unit="g" />
        <Macro label="Gord" value={totals.fat} target={targets?.fat} accent="text-rose-400" unit="g" />
      </div>

      {targets?.kcal && totals.kcal > targets.kcal * 0.95 && (
        <div
          className={`mx-4 mt-3 rounded-md border p-3 flex items-start gap-2 text-xs ${
            totals.kcal > targets.kcal
              ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
              : "border-amber-500/40 bg-amber-500/10 text-amber-200"
          }`}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            {totals.kcal > targets.kcal ? (
              <p>
                <strong>Você ultrapassou suas calorias do dia</strong> —{" "}
                {Math.round(totals.kcal - targets.kcal)} kcal acima da meta
                ({Math.round(targets.kcal)} kcal). Anote no feedback diário da dieta o motivo do ajuste.
              </p>
            ) : (
              <p>
                Você está chegando perto da meta calórica do dia
                ({Math.round(totals.kcal)} / {Math.round(targets.kcal)} kcal).
                Cuidado nas próximas refeições para não ultrapassar.
              </p>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>
      ) : (
        <div className="divide-y divide-border">
          {MEALS.map((m) => {
            const items = logs.filter((l) => l.meal_type === m.key);
            const sub = items.reduce((a, l) => a + Number(l.calories || 0), 0);
            return (
              <div key={m.key} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{m.label}</p>
                    <p className="text-[11px] text-muted-foreground">{Math.round(sub)} kcal • {items.length} itens</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setDialogMeal(m.key)}>
                    <Plus size={14} className="mr-1" /> Adicionar
                  </Button>
                </div>
                {items.length > 0 && (
                  <div className="space-y-1">
                    {items.map((l) => (
                      <div key={l.id} className="flex items-center justify-between py-1.5 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{l.food_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {Math.round(Number(l.amount_g))}g • P:{Number(l.protein).toFixed(0)} C:{Number(l.carbs).toFixed(0)} G:{Number(l.fat).toFixed(0)}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground mr-2">{Math.round(Number(l.calories))} kcal</div>
                        <button onClick={() => removeLog(l.id)} className="text-muted-foreground hover:text-rose-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddFoodDialog
        open={!!dialogMeal}
        onOpenChange={(v) => !v && setDialogMeal(null)}
        onAdd={async (p) => { await addFood({ ...p, meal: dialogMeal! }); setDialogMeal(null); }}
      />
    </div>
  );
}

function Macro({
  label, value, target, accent, unit,
}: { label: string; value: number; target?: number; accent?: string; unit?: string }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : null;
  return (
    <div>
      <p className={`text-lg font-bold ${accent ?? "text-foreground"}`}>
        {Math.round(value)}{unit ?? ""}
        {target ? <span className="text-[10px] text-muted-foreground font-normal"> / {Math.round(target)}{unit ?? ""}</span> : null}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}{pct !== null ? ` • ${pct}%` : ""}</p>
    </div>
  );
}

function AddFoodDialog({
  open, onOpenChange, onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (p: { name: string; amountG: number; per100: { kcal: number; protein: number; carbs: number; fat: number }; source: string; barcode?: string }) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"base" | "rotulo" | "barcode" | "manual">("base");
  const [offResults, setOffResults] = useState<OffProduct[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [picked, setPicked] = useState<null | { name: string; per100: any; source: string; barcode?: string }>(null);
  const [amount, setAmount] = useState<number>(100);

  // Manual entry state
  const [m, setM] = useState({ name: "", kcal: 0, protein: 0, carbs: 0, fat: 0 });

  // Barcode
  const [bc, setBc] = useState("");
  const [bcLoading, setBcLoading] = useState(false);
  const [bcErr, setBcErr] = useState("");

  useEffect(() => {
    if (!open) {
      setQ(""); setOffResults([]); setPicked(null); setAmount(100);
      setM({ name: "", kcal: 0, protein: 0, carbs: 0, fat: 0 });
      setBc(""); setBcErr(""); setTab("base");
    }
  }, [open]);

  const localResults: FoodItem[] = useMemo(() => searchLocalFoods(q), [q]);

  const runOff = async () => {
    setOffLoading(true);
    const res = await searchOpenFoodFacts(q);
    setOffResults(res);
    setOffLoading(false);
  };

  const runBarcode = async () => {
    setBcLoading(true); setBcErr("");
    const p = await lookupBarcode(bc);
    setBcLoading(false);
    if (!p) { setBcErr("Produto não encontrado."); return; }
    setPicked({ name: p.name, per100: { kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat }, source: "OpenFoodFacts", barcode: p.barcode });
  };

  const submitPicked = async () => {
    if (!picked) return;
    await onAdd({ name: picked.name, amountG: amount, per100: picked.per100, source: picked.source, barcode: picked.barcode });
  };

  const submitManual = async () => {
    if (!m.name) return;
    await onAdd({
      name: m.name, amountG: amount,
      per100: { kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat },
      source: "manual",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Adicionar alimento</DialogTitle></DialogHeader>

        <div className="flex gap-1 text-xs">
          {[
            { k: "base", l: "Base (TBCA/TACO)" },
            { k: "rotulo", l: "Rótulo" },
            { k: "barcode", l: "Cód. barras" },
            { k: "manual", l: "Manual" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => { setTab(t.k as any); setPicked(null); }}
              className={`px-2 py-1 rounded-md border ${tab === t.k ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
            >{t.l}</button>
          ))}
        </div>

        {tab === "base" && (
          <div className="space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar (ex: frango, arroz, banana)" className="pl-7 h-9" />
            </div>
            <div className="max-h-56 overflow-auto space-y-1">
              {localResults.map((f, i) => (
                <button
                  key={i}
                  className={`w-full text-left p-2 rounded-md border ${picked?.name === f.name ? "border-primary bg-primary/10" : "border-border hover:bg-muted/30"}`}
                  onClick={() => setPicked({ name: f.name, per100: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat }, source: f.source })}
                >
                  <p className="text-sm">{f.name}</p>
                  <p className="text-[10px] text-muted-foreground">{f.kcal} kcal/100g • P{f.protein} C{f.carbs} G{f.fat} • {f.source}</p>
                </button>
              ))}
              {localResults.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Nada encontrado. Use a aba Rótulo ou Manual.</p>}
            </div>
          </div>
        )}

        {tab === "rotulo" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto (OpenFoodFacts)" className="h-9" />
              <Button size="sm" onClick={runOff} disabled={offLoading || !q}>
                {offLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </Button>
            </div>
            <div className="max-h-56 overflow-auto space-y-1">
              {offResults.map((p, i) => (
                <button
                  key={i}
                  className={`w-full text-left p-2 rounded-md border ${picked?.name === p.name ? "border-primary bg-primary/10" : "border-border hover:bg-muted/30"}`}
                  onClick={() => setPicked({ name: p.name, per100: { kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat }, source: "OpenFoodFacts", barcode: p.barcode })}
                >
                  <p className="text-sm">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{Math.round(p.kcal)} kcal/100g • P{p.protein.toFixed(1)} C{p.carbs.toFixed(1)} G{p.fat.toFixed(1)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "barcode" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={bc} onChange={(e) => setBc(e.target.value)} placeholder="Digite o código de barras" className="pl-7 h-9" />
              </div>
              <Button size="sm" onClick={runBarcode} disabled={bcLoading || !bc}>
                {bcLoading ? <Loader2 size={14} className="animate-spin" /> : "Buscar"}
              </Button>
            </div>
            {bcErr && <p className="text-xs text-rose-400">{bcErr}</p>}
            {picked && tab === "barcode" && (
              <div className="p-2 rounded-md border border-primary bg-primary/10 text-sm">
                <p>{picked.name}</p>
                <p className="text-[10px] text-muted-foreground">{Math.round(picked.per100.kcal)} kcal/100g</p>
              </div>
            )}
          </div>
        )}

        {tab === "manual" && (
          <div className="grid grid-cols-2 gap-2">
            <Input className="col-span-2 h-9" placeholder="Nome do alimento" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
            <Input className="h-9" type="number" placeholder="Kcal /100g" value={m.kcal || ""} onChange={(e) => setM({ ...m, kcal: Number(e.target.value) })} />
            <Input className="h-9" type="number" placeholder="Prot /100g" value={m.protein || ""} onChange={(e) => setM({ ...m, protein: Number(e.target.value) })} />
            <Input className="h-9" type="number" placeholder="Carb /100g" value={m.carbs || ""} onChange={(e) => setM({ ...m, carbs: Number(e.target.value) })} />
            <Input className="h-9" type="number" placeholder="Gord /100g" value={m.fat || ""} onChange={(e) => setM({ ...m, fat: Number(e.target.value) })} />
          </div>
        )}

        <div className="flex items-end gap-2 border-t border-border pt-3">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground">Quantidade (g)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="h-9" />
          </div>
          {tab === "manual" ? (
            <Button onClick={submitManual} disabled={!m.name || !amount}>Adicionar</Button>
          ) : (
            <Button onClick={submitPicked} disabled={!picked || !amount}>Adicionar</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}