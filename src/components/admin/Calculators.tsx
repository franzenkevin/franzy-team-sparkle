import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useServerFn } from "@tanstack/react-start";
import { adminGetStudentWorkspace } from "@/lib/admin.functions";
import {
  tmbMifflin, activityFactor, getKcal, targetKcal, macros, navyBodyFat,
  projectWeight, progressionSuggestions, ACTIVITY_FACTORS,
} from "@/lib/calculators";
import { Calculator, TrendingUp, Activity, Loader2 } from "lucide-react";

type Profile = {
  user_id: string;
  full_name?: string | null;
  sex?: string | null;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  activity_level?: string | null;
  anamnese_extra?: any;
};

export function Calculators({ profiles }: { profiles: Profile[] }) {
  const [userId, setUserId] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fetchWorkspace = useServerFn(adminGetStudentWorkspace);

  useEffect(() => {
    if (!userId) { setData(null); return; }
    setLoading(true);
    fetchWorkspace({ data: { targetUserId: userId } })
      .then((r) => setData(r))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId, fetchWorkspace]);

  const profile = data?.profile ?? null;
  const extra = (profile?.anamnese_extra ?? {}) as Record<string, any>;

  // Estado editável das calculadoras
  const [weight, setWeight] = useState<number>(70);
  const [height, setHeight] = useState<number>(170);
  const [age, setAge] = useState<number>(30);
  const [sex, setSex] = useState<string>("M");
  const [actLevel, setActLevel] = useState<string>("moderado");
  const [deltaPct, setDeltaPct] = useState<number>(-20);
  const [proteinPerKg, setProteinPerKg] = useState<number>(2.0);
  const [fatPerKg, setFatPerKg] = useState<number>(0.8);
  const [neck, setNeck] = useState<string>("");
  const [waist, setWaist] = useState<string>("");
  const [hip, setHip] = useState<string>("");

  // Hidrata ao mudar de aluno
  useEffect(() => {
    if (!profile) return;
    setWeight(Number(profile.weight) || 70);
    setHeight(Number(profile.height) || 170);
    setAge(Number(profile.age) || 30);
    setSex(profile.sex ?? "M");
    setActLevel((profile.activity_level ?? "moderado").toString());
    setNeck(extra.neck_cm ?? extra.pescoco_cm ?? "");
    setWaist(extra.waist_cm ?? extra.cintura_cm ?? "");
    setHip(extra.hip_cm ?? extra.quadril_cm ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.user_id]);

  const tmb = useMemo(() => tmbMifflin({ weightKg: weight, heightCm: height, age, sex }), [weight, height, age, sex]);
  const factor = useMemo(() => activityFactor(actLevel), [actLevel]);
  const get = useMemo(() => getKcal(tmb, factor), [tmb, factor]);
  const targetK = useMemo(() => targetKcal(get, deltaPct), [get, deltaPct]);
  const macroResult = useMemo(() => macros({ kcal: targetK, weightKg: weight, proteinPerKg, fatPerKg }), [targetK, weight, proteinPerKg, fatPerKg]);
  const bf = useMemo(() => navyBodyFat({
    sex, heightCm: height,
    neckCm: neck ? Number(String(neck).replace(",", ".")) : null,
    waistCm: waist ? Number(String(waist).replace(",", ".")) : null,
    hipCm: hip ? Number(String(hip).replace(",", ".")) : null,
  }), [sex, height, neck, waist, hip]);

  const weeklyAsc = useMemo(() => {
    const arr = (data?.weekly ?? []).slice() as any[];
    return arr.sort((a, b) => (a.week_start ?? "").localeCompare(b.week_start ?? ""));
  }, [data]);
  const projection = useMemo(() => projectWeight(weeklyAsc.map((w) => ({ week_start: w.week_start, weight: w.weight }))), [weeklyAsc]);
  const progressions = useMemo(() => progressionSuggestions(data?.logs ?? []), [data]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Label className="text-xs">Aluno</Label>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {profiles.map((p) => (
              <SelectItem key={p.user_id} value={p.user_id}>
                {p.full_name ?? "(sem nome)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading && <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Carregando dados…</div>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><Calculator size={16} /><h3 className="font-heading font-semibold text-sm">TMB · GET · Macros</h3></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Peso (kg)</Label><Input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Altura (cm)</Label><Input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Idade</Label><Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value) || 0)} /></div>
            <div>
              <Label className="text-xs">Sexo</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Nível de atividade</Label>
              <Select value={actLevel} onValueChange={setActLevel}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(ACTIVITY_FACTORS).map((k) => (
                    <SelectItem key={k} value={k}>{k} (×{ACTIVITY_FACTORS[k]})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-md border border-border p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">TMB</span><span className="font-medium">{tmb} kcal</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GET (×{factor})</span><span className="font-medium">{get} kcal</span></div>
          </div>
          <div>
            <div className="flex justify-between text-xs">
              <Label>Déficit / Superávit</Label>
              <span className={deltaPct < 0 ? "text-orange-500" : deltaPct > 0 ? "text-emerald-500" : "text-muted-foreground"}>{deltaPct > 0 ? "+" : ""}{deltaPct}%</span>
            </div>
            <Slider min={-30} max={20} step={5} value={[deltaPct]} onValueChange={(v) => setDeltaPct(v[0])} className="mt-2" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div><Label className="text-xs">Proteína g/kg</Label><Input type="number" step="0.1" value={proteinPerKg} onChange={(e) => setProteinPerKg(Number(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Gordura g/kg</Label><Input type="number" step="0.1" value={fatPerKg} onChange={(e) => setFatPerKg(Number(e.target.value) || 0)} /></div>
            <div className="flex items-end"><div className="text-xs text-muted-foreground">Carbo = resto</div></div>
          </div>
          <div className="rounded-md bg-muted/40 p-3 space-y-1 text-sm">
            <div className="flex justify-between font-medium"><span>Meta diária</span><span>{targetK} kcal</span></div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              <div className="rounded bg-background border border-border p-2 text-center">
                <div className="text-muted-foreground">Proteína</div>
                <div className="font-semibold">{macroResult.proteinG}g</div>
                <div className="text-[10px] text-muted-foreground">{macroResult.pctP}%</div>
              </div>
              <div className="rounded bg-background border border-border p-2 text-center">
                <div className="text-muted-foreground">Carbo</div>
                <div className="font-semibold">{macroResult.carbsG}g</div>
                <div className="text-[10px] text-muted-foreground">{macroResult.pctC}%</div>
              </div>
              <div className="rounded bg-background border border-border p-2 text-center">
                <div className="text-muted-foreground">Gordura</div>
                <div className="font-semibold">{macroResult.fatG}g</div>
                <div className="text-[10px] text-muted-foreground">{macroResult.pctF}%</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2"><Activity size={16} /><h3 className="font-heading font-semibold text-sm">% Gordura (US Navy)</h3></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label className="text-xs">Pescoço (cm)</Label><Input value={neck} onChange={(e) => setNeck(e.target.value)} /></div>
            <div><Label className="text-xs">Cintura (cm)</Label><Input value={waist} onChange={(e) => setWaist(e.target.value)} /></div>
            <div><Label className="text-xs">Quadril (cm){sex === "F" ? " *" : ""}</Label><Input value={hip} onChange={(e) => setHip(e.target.value)} /></div>
          </div>
          <div className="rounded-md border border-border p-3 text-sm">
            {bf != null ? (
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">% Gordura estimado</span>
                <span className="text-2xl font-heading font-bold">{bf}%</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Preencha pescoço, cintura{sex === "F" ? " e quadril" : ""} para calcular.</span>
            )}
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border"><TrendingUp size={16} /><h3 className="font-heading font-semibold text-sm">Projeção de peso (8 sem.)</h3></div>
          {projection ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Tendência: <span className={projection.slopePerWeek < 0 ? "text-orange-500" : projection.slopePerWeek > 0 ? "text-emerald-500" : ""}>{projection.slopePerWeek > 0 ? "+" : ""}{projection.slopePerWeek} kg/semana</span></div>
              <div className="grid grid-cols-4 gap-1 text-xs">
                {projection.projection.map((p) => (
                  <div key={p.weekOffset} className="rounded border border-border p-2 text-center">
                    <div className="text-[10px] text-muted-foreground">+{p.weekOffset}s</div>
                    <div className="font-medium">{p.weight}kg</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">São necessárias ao menos 2 pesagens semanais.</div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3"><TrendingUp size={16} /><h3 className="font-heading font-semibold text-sm">Progressão de carga (últimos 120 dias)</h3></div>
        {progressions.length === 0 ? (
          <div className="text-xs text-muted-foreground">Sem logs de treino registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2">Exercício</th>
                  <th className="py-2">Última carga top</th>
                  <th className="py-2">RPE médio</th>
                  <th className="py-2">Sugestão</th>
                </tr>
              </thead>
              <tbody>
                {progressions.map((p) => (
                  <tr key={p.exercise} className="border-b border-border/50">
                    <td className="py-2">{p.exercise}</td>
                    <td className="py-2">{p.lastWeight}kg × {p.lastReps}</td>
                    <td className="py-2">{p.avgRpe ?? "—"}</td>
                    <td className="py-2 text-xs">{p.suggestion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
