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
import { ArrowLeft, ArrowRight, Check, Upload, Camera } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { saveAnamneseDraft, loadAnamneseDraft, clearAnamneseDraft } from "@/lib/anamnese.functions";

type FD = Record<string, string>;

const STEPS = [
  "Identificação",
  "Sobre você",
  "Corpo & Objetivo",
  "Treino — Realidade",
  "Treino — Detalhes",
  "Dieta — Realidade",
  "Dieta — Preferências",
  "Estilo de vida",
  "Fotos do físico",
] as const;

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Anamnese — Franzen Team" }] }),
  component: OnboardingPage,
});

const JUNK_OPTIONS = [
  "Doce de Leite / Leite Condensado / Geléia",
  "Hamburguer Caseiro",
  "Açai (comum de mercado)",
  "Sucrilhos",
  "Chocolate (20-30g)",
  "Outro",
];

const REFERRAL_OPTIONS = [
  "Indicação de aluno",
  "Repost de outros alunos",
  "Conteúdo no Instagram",
  "Conheço pessoalmente",
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const saveDraftFn = useServerFn(saveAnamneseDraft);
  const loadDraftFn = useServerFn(loadAnamneseDraft);
  const clearDraftFn = useServerFn(clearAnamneseDraft);
  const [d, setD] = useState<FD>({
    // Identificação
    full_name: "", cpf: "", address: "", birth_date: "",
    // Sobre você
    age: "", sex: "", profession: "",
    previous_consultation: "", referral_source: "", referral_other: "",
    psych_meds: "", ergogenics_history: "",
    // Corpo
    weight: "", height: "", goal: "", goal_3m: "", goal_1y: "",
    // Treino realidade
    experience: "", training_days: "", training_time: "", gym_type: "", gym_brand: "",
    // Treino detalhes
    injuries: "", structural_limit: "", daily_discomfort: "", exercise_discomfort: "",
    current_split: "", aerobic_protocol: "", aerobic_fasted: "",
    training_time_of_day: "",
    // Dieta realidade
    diet_status: "", fasting_morning: "", digestibility: "", bowel_routine: "",
    current_diet_text: "", daily_routine: "",
    // Dieta pref
    hard_meal_times: "", sweet_anxiety_times: "", liked_foods: "", disliked_foods: "",
    allergies: "", supplements: "", manipulated_fitoterapics: "",
    meal_count: "4", junk_food_choice: "", junk_food_other: "",
    // Estilo
    activity_level: "", sleep_hours: "8", sleep_quality: "",
    stress_level: "", hormonal_side_effects: "", weekend_routine: "",
    // Fotos
    photo_front_url: "", photo_side_url: "", photo_back_url: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!p) return;
      if (p.onboarding_complete) { navigate({ to: "/dashboard" }); return; }
      const next: FD = {};
      for (const k of Object.keys(d)) {
        const v = (p as any)[k];
        if (v !== undefined && v !== null) next[k] = String(v);
      }
      setD((prev) => ({ ...prev, ...next }));
      // Restaurar rascunho remoto se existir
      try {
        const r = await loadDraftFn();
        if (r?.draft?.values) {
          setD((prev) => ({ ...prev, ...(r.draft.values as FD) }));
          if (typeof r.draft.step === "number") setStep(r.draft.step);
          if (r.draft.savedAt) setDraftSavedAt(new Date(r.draft.savedAt).toLocaleTimeString());
        }
      } catch { /* ignore */ }
      setDraftLoaded(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save no servidor (debounce 1.5s)
  useEffect(() => {
    if (!draftLoaded) return;
    const handle = window.setTimeout(async () => {
      try {
        setDraftSaving(true);
        const r = await saveDraftFn({ data: { values: d, step } });
        if (r?.savedAt) setDraftSavedAt(new Date(r.savedAt).toLocaleTimeString());
      } catch { /* ignore */ } finally {
        setDraftSaving(false);
      }
    }, 1500);
    return () => window.clearTimeout(handle);
  }, [d, step, draftLoaded, saveDraftFn]);

  const set = (k: string, v: string) => setD((p) => ({ ...p, [k]: v }));

  const uploadPhoto = async (slot: "front" | "side" | "back", file: File) => {
    setUploading(slot);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/onboarding/${slot}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("photos").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl || path;
      set(`photo_${slot}_url`, url);
      toast.success(`Foto ${slot} enviada`);
    } catch (e: any) {
      toast.error(e.message || "Falha no upload");
    } finally {
      setUploading(null);
    }
  };

  const validate = (): string | null => {
    const req = (k: string, msg: string) => (!d[k]?.trim() ? msg : null);
    switch (step) {
      case 0:
        return req("full_name", "Informe seu nome completo.") ||
          req("cpf", "Informe o CPF (para nota fiscal).") ||
          req("address", "Informe o endereço (para nota fiscal).");
      case 1:
        if (!d.age || +d.age < 14 || +d.age > 90) return "Idade inválida.";
        if (!d.sex) return "Selecione o sexo.";
        return req("profession", "Informe profissão e jornada.") ||
          req("referral_source", "Como você me conheceu?");
      case 2:
        if (!d.weight || +d.weight < 30) return "Peso inválido.";
        if (!d.height || +d.height < 100) return "Altura inválida (cm).";
        return req("goal", "Objetivo principal.") || req("goal_3m", "Objetivo de 3 meses.");
      case 3:
        return req("experience", "Conte sua experiência atual.") ||
          (!d.training_days || +d.training_days < 1 || +d.training_days > 7 ? "Dias de treino inválidos." : null) ||
          req("training_time", "Tempo disponível por treino.") ||
          req("gym_type", "Local de treino.");
      case 4:
        return req("injuries", "Informe lesões (ou escreva 'nenhuma').") ||
          req("current_split", "Como está sua divisão atual?") ||
          req("aerobic_protocol", "Faz aeróbico? Qual protocolo?");
      case 5:
        return req("diet_status", "Está fazendo dieta?") ||
          req("current_diet_text", "Descreva sua alimentação atual.") ||
          req("daily_routine", "Sua rotina diária.");
      case 6:
        if (!d.meal_count || +d.meal_count < 2 || +d.meal_count > 8) return "Refeições inválidas.";
        return req("liked_foods", "Alimentos que gostaria.");
      case 7:
        return req("activity_level", "Nível de atividade diária.") ||
          req("sleep_quality", "Como é seu sono?");
      case 8:
        if (!d.photo_front_url || !d.photo_side_url || !d.photo_back_url)
          return "Envie as 3 fotos (frente, lado e costas).";
        return null;
    }
    return null;
  };

  const next = async () => {
    setError("");
    const e = validate();
    if (e) { setError(e); return; }
    if (step < STEPS.length - 1) { setStep(step + 1); window.scrollTo(0, 0); return; }
    await handleFinish();
  };

  const handleFinish = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const referral = d.referral_source === "Outro" ? d.referral_other : d.referral_source;
    const junk = d.junk_food_choice === "Outro" ? d.junk_food_other : d.junk_food_choice;
    const payload: any = {
      user_id: user.id,
      full_name: d.full_name,
      cpf: d.cpf || null,
      address: d.address || null,
      birth_date: d.birth_date || null,
      age: +d.age,
      sex: d.sex,
      profession: d.profession || null,
      previous_consultation: d.previous_consultation || null,
      referral_source: referral || null,
      psych_meds: d.psych_meds || null,
      ergogenics_history: d.ergogenics_history || null,
      weight: +d.weight,
      height: +d.height,
      goal: d.goal,
      goal_3m: d.goal_3m || null,
      goal_1y: d.goal_1y || null,
      experience: d.experience,
      training_days: +d.training_days,
      training_time: d.training_time || null,
      gym_type: d.gym_type,
      gym_brand: d.gym_brand || null,
      injuries: d.injuries || null,
      structural_limit: d.structural_limit || null,
      daily_discomfort: d.daily_discomfort || null,
      exercise_discomfort: d.exercise_discomfort || null,
      current_split: d.current_split || null,
      aerobic_protocol: d.aerobic_protocol || null,
      aerobic_fasted: d.aerobic_fasted === "sim" ? true : d.aerobic_fasted === "nao" ? false : null,
      diet_status: d.diet_status || null,
      fasting_morning: d.fasting_morning || null,
      digestibility: d.digestibility || null,
      bowel_routine: d.bowel_routine || null,
      current_diet_text: d.current_diet_text || null,
      daily_routine: d.daily_routine || null,
      hard_meal_times: d.hard_meal_times || null,
      sweet_anxiety_times: d.sweet_anxiety_times || null,
      liked_foods: d.liked_foods || null,
      disliked_foods: d.disliked_foods || null,
      allergies: d.allergies || null,
      supplements: d.supplements ? d.supplements.split(",").map((s) => s.trim()).filter(Boolean) : null,
      manipulated_fitoterapics: d.manipulated_fitoterapics || null,
      meal_count: +d.meal_count,
      junk_food_choice: junk || null,
      activity_level: d.activity_level,
      sleep_hours: +d.sleep_hours,
      sleep_quality: d.sleep_quality || null,
      stress_level: d.stress_level || null,
      hormonal_side_effects: d.hormonal_side_effects || null,
      weekend_routine: d.weekend_routine || null,
      photo_front_url: d.photo_front_url || null,
      photo_side_url: d.photo_side_url || null,
      photo_back_url: d.photo_back_url || null,
      training_time_of_day: d.training_time_of_day || null,
      anamnese_completed_at: new Date().toISOString(),
      onboarding_complete: true,
    };
    const { error: upErr } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (upErr) { setError(upErr.message); return; }
    toast.success("Anamnese concluída! O treinador vai analisar e montar seu protocolo.");
    navigate({ to: "/dashboard" });
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="container max-w-2xl mx-auto animate-fade-in">
        <p className="text-sm text-muted-foreground mb-2">{STEPS[step]} — Passo {step + 1} de {STEPS.length}</p>
        <Progress value={progress} className="mb-8" />

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {step === 0 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Identificação</h2>
              <Field label="Nome completo *"><Input value={d.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
              <Field label="CPF (para nota fiscal) *"><Input value={d.cpf} onChange={(e) => set("cpf", e.target.value)} /></Field>
              <Field label="Endereço completo (para nota fiscal) *"><Textarea rows={2} value={d.address} onChange={(e) => set("address", e.target.value)} /></Field>
              <Field label="Data de nascimento"><Input type="date" value={d.birth_date} onChange={(e) => set("birth_date", e.target.value)} /></Field>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Sobre você</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Idade *"><Input type="number" value={d.age} onChange={(e) => set("age", e.target.value)} /></Field>
                <Field label="Sexo *">
                  <Select value={d.sex} onValueChange={(v) => set("sex", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Profissão e jornada (se faz plantões, descreva) *">
                <Textarea rows={2} value={d.profession} onChange={(e) => set("profession", e.target.value)} />
              </Field>
              <Field label="Já fez consultoria antes? Se sim, por que parou?">
                <Textarea rows={2} value={d.previous_consultation} onChange={(e) => set("previous_consultation", e.target.value)} />
              </Field>
              <Field label="De onde você me conheceu? *">
                <RadioGroup value={d.referral_source} onValueChange={(v) => set("referral_source", v)} className="grid gap-2">
                  {REFERRAL_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value={opt} id={`ref-${opt}`} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="Outro" id="ref-other" />
                    <span className="text-sm">Outro:</span>
                    <Input className="ml-2 h-8" value={d.referral_other} onChange={(e) => set("referral_other", e.target.value)} disabled={d.referral_source !== "Outro"} />
                  </label>
                </RadioGroup>
              </Field>
              <Field label="Usa remédio para tratamento psiquiátrico ou já fez? Se sim, conte mais.">
                <Textarea rows={2} value={d.psych_meds} onChange={(e) => set("psych_meds", e.target.value)} />
              </Field>
              <Field label="Faz uso de ergogênicos (anabolizantes/esteroides)? Se sim, descreva seu último protocolo.">
                <Textarea rows={3} value={d.ergogenics_history} onChange={(e) => set("ergogenics_history", e.target.value)} />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Corpo & Objetivo</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Peso em jejum (kg) *"><Input type="number" step="0.1" value={d.weight} onChange={(e) => set("weight", e.target.value)} /></Field>
                <Field label="Altura (cm) *"><Input type="number" value={d.height} onChange={(e) => set("height", e.target.value)} /></Field>
              </div>
              <Field label="Objetivo principal *">
                <RadioGroup value={d.goal} onValueChange={(v) => set("goal", v)} className="grid gap-2">
                  {[
                    { v: "hypertrophy", l: "Hipertrofia (ganho de massa)" },
                    { v: "cutting", l: "Cutting (perda de gordura)" },
                    { v: "recomp", l: "Recomposição corporal" },
                    { v: "performance", l: "Performance" },
                  ].map((o) => (
                    <label key={o.v} className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value={o.v} id={`g-${o.v}`} />
                      <span className="text-sm">{o.l}</span>
                    </label>
                  ))}
                </RadioGroup>
              </Field>
              <Field label="Qual seu objetivo para os próximos 3 meses? *">
                <Textarea rows={2} value={d.goal_3m} onChange={(e) => set("goal_3m", e.target.value)} />
              </Field>
              <Field label="Qual seu objetivo daqui a 1 ano?">
                <Textarea rows={2} value={d.goal_1y} onChange={(e) => set("goal_1y", e.target.value)} />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Treino — Realidade</h2>
              <Field label="Você está treinando atualmente? Conte sua experiência *">
                <Textarea rows={3} value={d.experience} onChange={(e) => set("experience", e.target.value)} placeholder="Tempo treinando, métodos já usados…" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dias por semana *"><Input type="number" min={1} max={7} value={d.training_days} onChange={(e) => set("training_days", e.target.value)} /></Field>
                <Field label="Tempo por treino *"><Input value={d.training_time} onChange={(e) => set("training_time", e.target.value)} placeholder="ex: 60 min" /></Field>
              </div>
              <Field label="Local de treino *">
                <Select value={d.gym_type} onValueChange={(v) => set("gym_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_gym">Academia completa</SelectItem>
                    <SelectItem value="basic_gym">Academia básica</SelectItem>
                    <SelectItem value="home_full">Casa (equipada)</SelectItem>
                    <SelectItem value="home_minimal">Casa (mínima)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Qual rede de academias treina? (pode enviar vídeo dos aparelhos por mensagem)">
                <Input value={d.gym_brand} onChange={(e) => set("gym_brand", e.target.value)} />
              </Field>
              <Field label="Qual horário do dia treina normalmente? (descreva também cardio se separado)">
                <Textarea rows={2} value={d.training_time_of_day} onChange={(e) => set("training_time_of_day", e.target.value)} />
              </Field>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Treino — Detalhes</h2>
              <Field label="Tem ou teve alguma lesão? Conte sobre. *">
                <Textarea rows={2} value={d.injuries} onChange={(e) => set("injuries", e.target.value)} />
              </Field>
              <Field label="Fator limitante estrutural identificado por médico (ressonância/raio-x)?">
                <Textarea rows={2} value={d.structural_limit} onChange={(e) => set("structural_limit", e.target.value)} />
              </Field>
              <Field label="Sente desconforto ao subir escada, sentar e levantar?">
                <Textarea rows={2} value={d.daily_discomfort} onChange={(e) => set("daily_discomfort", e.target.value)} />
              </Field>
              <Field label="Sente desconforto em algum exercício da musculação?">
                <Textarea rows={2} value={d.exercise_discomfort} onChange={(e) => set("exercise_discomfort", e.target.value)} />
              </Field>
              <Field label="Como está sua divisão de treino atual? Descreva exercícios e séries comuns. *">
                <Textarea rows={4} value={d.current_split} onChange={(e) => set("current_split", e.target.value)} />
              </Field>
              <Field label="Faz aeróbicos? Qual horário e protocolo (HIIT, caminhada, bike…)? *">
                <Textarea rows={2} value={d.aerobic_protocol} onChange={(e) => set("aerobic_protocol", e.target.value)} />
              </Field>
              <Field label="Faz ou gostaria de fazer aeróbico em jejum?">
                <RadioGroup value={d.aerobic_fasted} onValueChange={(v) => set("aerobic_fasted", v)} className="flex gap-4">
                  <label className="flex items-center gap-2"><RadioGroupItem value="sim" /> Sim</label>
                  <label className="flex items-center gap-2"><RadioGroupItem value="nao" /> Não</label>
                </RadioGroup>
              </Field>
            </>
          )}

          {step === 5 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Dieta — Realidade</h2>
              <Field label="Está fazendo dieta? *">
                <RadioGroup value={d.diet_status} onValueChange={(v) => set("diet_status", v)} className="grid gap-2">
                  {[
                    "Sim, contabilizando macros sozinho",
                    "Sim, tenho uma dieta feita por um profissional",
                    "Não, mas já fiz",
                    "Não, e nunca fiz dieta específica",
                  ].map((opt) => (
                    <label key={opt} className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value={opt} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              </Field>
              <Field label="Sente fome pela manhã? É adepto ao jejum intermitente? Explique.">
                <Textarea rows={2} value={d.fasting_morning} onChange={(e) => set("fasting_morning", e.target.value)} />
              </Field>
              <Field label="Boa digestibilidade? Algum desconforto com alimento?">
                <Textarea rows={2} value={d.digestibility} onChange={(e) => set("digestibility", e.target.value)} />
              </Field>
              <Field label="Vai ao banheiro regularmente? Problemas com intestino?">
                <Textarea rows={2} value={d.bowel_routine} onChange={(e) => set("bowel_routine", e.target.value)} />
              </Field>
              <Field label="Descreva sua alimentação atual com o máximo de detalhes e quantidades. *">
                <Textarea rows={5} value={d.current_diet_text} onChange={(e) => set("current_diet_text", e.target.value)} />
              </Field>
              <Field label="Descreva sua rotina com horários do acordar ao dormir. *">
                <Textarea rows={3} value={d.daily_routine} onChange={(e) => set("daily_routine", e.target.value)} />
              </Field>
            </>
          )}

          {step === 6 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Dieta — Preferências</h2>
              <Field label="Quantidade de refeições por dia *"><Input type="number" min={2} max={8} value={d.meal_count} onChange={(e) => set("meal_count", e.target.value)} /></Field>
              <Field label="Algum horário difícil para comer ou transportar alimentos?">
                <Textarea rows={2} value={d.hard_meal_times} onChange={(e) => set("hard_meal_times", e.target.value)} />
              </Field>
              <Field label="Algum horário específico que sente ansiedade ou vontade de doces?">
                <Textarea rows={2} value={d.sweet_anxiety_times} onChange={(e) => set("sweet_anxiety_times", e.target.value)} />
              </Field>
              <Field label="Cite alimentos que você gostaria na sua dieta. *">
                <Textarea rows={3} value={d.liked_foods} onChange={(e) => set("liked_foods", e.target.value)} />
              </Field>
              <Field label="Cite alimentos que você NÃO gostaria na sua dieta.">
                <Textarea rows={2} value={d.disliked_foods} onChange={(e) => set("disliked_foods", e.target.value)} />
              </Field>
              <Field label="Alergias ou intolerâncias">
                <Textarea rows={2} value={d.allergies} onChange={(e) => set("allergies", e.target.value)} />
              </Field>
              <Field label="Utiliza algum suplemento? Quais? (separar por vírgula)">
                <Textarea rows={2} value={d.supplements} onChange={(e) => set("supplements", e.target.value)} placeholder="Whey, creatina, ômega…" />
              </Field>
              <Field label="Há disponibilidade financeira para manipulados fitoterápicos?">
                <Textarea rows={2} value={d.manipulated_fitoterapics} onChange={(e) => set("manipulated_fitoterapics", e.target.value)} />
              </Field>
              <Field label='Escolha um alimento "lixo" que você gostaria na dieta eventualmente (com sabedoria)'>
                <RadioGroup value={d.junk_food_choice} onValueChange={(v) => set("junk_food_choice", v)} className="grid gap-2">
                  {JUNK_OPTIONS.filter((o) => o !== "Outro").map((opt) => (
                    <label key={opt} className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value={opt} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="Outro" />
                    <span className="text-sm">Outro:</span>
                    <Input className="ml-2 h-8" value={d.junk_food_other} onChange={(e) => set("junk_food_other", e.target.value)} disabled={d.junk_food_choice !== "Outro"} />
                  </label>
                </RadioGroup>
              </Field>
            </>
          )}

          {step === 7 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Estilo de vida</h2>
              <Field label="Nível de atividade diária (fora do treino) *">
                <Select value={d.activity_level} onValueChange={(v) => set("activity_level", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentário</SelectItem>
                    <SelectItem value="light">Leve</SelectItem>
                    <SelectItem value="moderate">Moderado</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="very_active">Muito ativo</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Horas de sono"><Input type="number" step="0.5" value={d.sleep_hours} onChange={(e) => set("sleep_hours", e.target.value)} /></Field>
                <Field label="Nível de estresse">
                  <Select value={d.stress_level} onValueChange={(v) => set("stress_level", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixo</SelectItem>
                      <SelectItem value="moderate">Moderado</SelectItem>
                      <SelectItem value="high">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Como é seu sono? Acorda disposto? Pega no sono rápido? Acorda muito? *">
                <Textarea rows={3} value={d.sleep_quality} onChange={(e) => set("sleep_quality", e.target.value)} />
              </Field>
              <Field label="Tem algum colateral de hormônios ou estresse que possa incomodar?">
                <Textarea rows={2} value={d.hormonal_side_effects} onChange={(e) => set("hormonal_side_effects", e.target.value)} />
              </Field>
              <Field label="Descreva seu final de semana (comidas, bebidas, festas…)">
                <Textarea rows={2} value={d.weekend_routine} onChange={(e) => set("weekend_routine", e.target.value)} />
              </Field>
            </>
          )}

          {step === 8 && (
            <>
              <h2 className="text-2xl font-heading font-bold">Fotos do físico</h2>
              <p className="text-sm text-muted-foreground">Envie 3 fotos em local bem iluminado, com pouca roupa, postura natural. Serão a referência inicial da sua evolução.</p>
              {(["front", "side", "back"] as const).map((slot) => {
                const url = d[`photo_${slot}_url`];
                const label = slot === "front" ? "Frente" : slot === "side" ? "Lado" : "Costas";
                return (
                  <div key={slot} className="rounded-md border border-border p-3 space-y-2">
                    <p className="font-medium text-sm">{label}</p>
                    {url ? (
                      <img src={url} alt={label} className="max-h-48 rounded" />
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhuma foto enviada</p>
                    )}
                    <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-primary">
                      {uploading === slot ? <><Upload size={16} className="animate-pulse" /> Enviando…</> : <><Camera size={16} /> {url ? "Trocar" : "Enviar"} foto</>}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0]; if (f) uploadPhoto(slot, f);
                      }} disabled={uploading !== null} />
                    </label>
                  </div>
                );
              })}
            </>
          )}

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => { setError(""); setStep((s) => Math.max(0, s - 1)); window.scrollTo(0, 0); }} disabled={step === 0 || saving}>
              <ArrowLeft size={16} className="mr-1" /> Voltar
            </Button>
            <Button onClick={next} disabled={saving || uploading !== null} className="glow">
              {step === STEPS.length - 1 ? (
                <>{saving ? "Salvando..." : "Concluir anamnese"} <Check size={16} className="ml-1" /></>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-sm">{label}</Label>
      {children}
    </div>
  );
}