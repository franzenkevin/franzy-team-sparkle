import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

type FormData = {
  full_name: string;
  age: string;
  sex: string;
  weight: string;
  height: string;
  goal: string;
  activity_level: string;
  training_days: string;
  experience: string;
  gym_type: string;
  injuries: string;
  meal_count: string;
  disliked_foods: string;
  allergies: string;
  sleep_hours: string;
  stress_level: string;
};

const STEPS = ["Sobre você", "Corpo", "Treino", "Nutrição", "Estilo de vida"];

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — Franzen Team" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<FormData>({
    full_name: "", age: "", sex: "", weight: "", height: "",
    goal: "", activity_level: "", training_days: "", experience: "",
    gym_type: "", injuries: "", meal_count: "4", disliked_foods: "",
    allergies: "", sleep_hours: "8", stress_level: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (p) {
        if (p.onboarding_complete) { navigate({ to: "/dashboard" }); return; }
        setData((d) => ({
          ...d,
          full_name: p.full_name ?? d.full_name,
          age: p.age?.toString() ?? "",
          sex: p.sex ?? "",
          weight: p.weight?.toString() ?? "",
          height: p.height?.toString() ?? "",
          goal: p.goal ?? "",
          activity_level: p.activity_level ?? "",
          training_days: p.training_days?.toString() ?? "",
          experience: p.experience ?? "",
          gym_type: p.gym_type ?? "",
          injuries: p.injuries ?? "",
          meal_count: p.meal_count?.toString() ?? "4",
          disliked_foods: p.disliked_foods ?? "",
          allergies: p.allergies ?? "",
          sleep_hours: p.sleep_hours?.toString() ?? "8",
          stress_level: p.stress_level ?? "",
        }));
      }
    })();
  }, [navigate]);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setData((d) => ({ ...d, [k]: v }));

  const validate = (): string | null => {
    switch (step) {
      case 0:
        if (!data.full_name.trim()) return "Informe seu nome.";
        if (!data.age || +data.age < 14 || +data.age > 90) return "Idade inválida.";
        if (!data.sex) return "Selecione o sexo.";
        return null;
      case 1:
        if (!data.weight || +data.weight < 30) return "Peso inválido.";
        if (!data.height || +data.height < 100) return "Altura inválida (cm).";
        if (!data.goal) return "Selecione um objetivo.";
        return null;
      case 2:
        if (!data.experience) return "Selecione sua experiência.";
        if (!data.training_days || +data.training_days < 1 || +data.training_days > 7) return "Dias de treino inválidos.";
        if (!data.gym_type) return "Selecione o local de treino.";
        return null;
      case 3:
        if (!data.meal_count || +data.meal_count < 2 || +data.meal_count > 8) return "Refeições inválidas.";
        return null;
      case 4:
        if (!data.activity_level) return "Selecione seu nível de atividade diária.";
        if (!data.sleep_hours) return "Informe as horas de sono.";
        return null;
    }
    return null;
  };

  const next = async () => {
    setError("");
    const err = validate();
    if (err) { setError(err); return; }
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    await handleFinish();
  };

  const handleFinish = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload = {
      user_id: user.id,
      full_name: data.full_name,
      age: +data.age,
      sex: data.sex,
      weight: +data.weight,
      height: +data.height,
      goal: data.goal,
      activity_level: data.activity_level,
      training_days: +data.training_days,
      experience: data.experience,
      gym_type: data.gym_type,
      injuries: data.injuries || null,
      meal_count: +data.meal_count,
      disliked_foods: data.disliked_foods || null,
      allergies: data.allergies || null,
      sleep_hours: +data.sleep_hours,
      stress_level: data.stress_level || null,
      onboarding_complete: true,
    };
    const { error: upErr } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (upErr) { setError(upErr.message); return; }
    toast.success("Perfil concluído!");
    navigate({ to: "/dashboard" });
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="container max-w-xl mx-auto animate-fade-in">
        <p className="text-sm text-muted-foreground mb-2">{STEPS[step]} — Passo {step + 1} de {STEPS.length}</p>
        <Progress value={progress} className="mb-8" />

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {step === 0 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Sobre você</h2>
              <div>
                <Label htmlFor="full_name">Nome completo</Label>
                <Input id="full_name" value={data.full_name} onChange={(e) => set("full_name", e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="age">Idade</Label>
                  <Input id="age" type="number" value={data.age} onChange={(e) => set("age", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Sexo</Label>
                  <Select value={data.sex} onValueChange={(v) => set("sex", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Seu corpo e objetivo</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input id="weight" type="number" step="0.1" value={data.weight} onChange={(e) => set("weight", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input id="height" type="number" value={data.height} onChange={(e) => set("height", e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Objetivo principal</Label>
                <RadioGroup value={data.goal} onValueChange={(v) => set("goal", v)} className="mt-2 grid gap-2">
                  {[
                    { v: "hypertrophy", l: "Hipertrofia (ganho de massa)" },
                    { v: "cutting", l: "Cutting (perda de gordura)" },
                    { v: "recomp", l: "Recomposição corporal" },
                    { v: "performance", l: "Performance" },
                  ].map((o) => (
                    <label key={o.v} className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value={o.v} id={`goal-${o.v}`} />
                      <span className="text-sm">{o.l}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Treino</h2>
              <div>
                <Label>Experiência</Label>
                <Select value={data.experience} onValueChange={(v) => set("experience", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante (&lt; 1 ano)</SelectItem>
                    <SelectItem value="intermediate">Intermediário (1-3 anos)</SelectItem>
                    <SelectItem value="advanced">Avançado (3+ anos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="training_days">Dias de treino por semana</Label>
                <Input id="training_days" type="number" min={1} max={7} value={data.training_days} onChange={(e) => set("training_days", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Local de treino</Label>
                <Select value={data.gym_type} onValueChange={(v) => set("gym_type", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_gym">Academia completa</SelectItem>
                    <SelectItem value="basic_gym">Academia básica</SelectItem>
                    <SelectItem value="home_full">Casa (equipada)</SelectItem>
                    <SelectItem value="home_minimal">Casa (mínima)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="injuries">Lesões ou limitações (opcional)</Label>
                <Textarea id="injuries" value={data.injuries} onChange={(e) => set("injuries", e.target.value)} className="mt-1" rows={2} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Nutrição</h2>
              <div>
                <Label htmlFor="meal_count">Quantidade de refeições por dia</Label>
                <Input id="meal_count" type="number" min={2} max={8} value={data.meal_count} onChange={(e) => set("meal_count", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="disliked_foods">Alimentos que não gosta (opcional)</Label>
                <Textarea id="disliked_foods" value={data.disliked_foods} onChange={(e) => set("disliked_foods", e.target.value)} className="mt-1" rows={2} />
              </div>
              <div>
                <Label htmlFor="allergies">Alergias ou intolerâncias (opcional)</Label>
                <Textarea id="allergies" value={data.allergies} onChange={(e) => set("allergies", e.target.value)} className="mt-1" rows={2} />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Estilo de vida</h2>
              <div>
                <Label>Nível de atividade diária (fora do treino)</Label>
                <Select value={data.activity_level} onValueChange={(v) => set("activity_level", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentário</SelectItem>
                    <SelectItem value="light">Leve</SelectItem>
                    <SelectItem value="moderate">Moderado</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="very_active">Muito ativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sleep_hours">Horas de sono (média)</Label>
                <Input id="sleep_hours" type="number" step="0.5" value={data.sleep_hours} onChange={(e) => set("sleep_hours", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Nível de estresse</Label>
                <Select value={data.stress_level} onValueChange={(v) => set("stress_level", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixo</SelectItem>
                    <SelectItem value="moderate">Moderado</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => { setError(""); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0 || saving}>
              <ArrowLeft size={16} className="mr-1" /> Voltar
            </Button>
            <Button onClick={next} disabled={saving} className="glow">
              {step === STEPS.length - 1 ? (
                <>{saving ? "Salvando..." : "Concluir"} <Check size={16} className="ml-1" /></>
              ) : (
                <>Avançar <ArrowRight size={16} className="ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}