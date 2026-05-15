import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";

const SetSchema = z.object({
  reps: z.string().describe("Faixa de repetições, ex: '8-12'"),
  rest_seconds: z.number().describe("Descanso em segundos"),
});

const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number(),
  scheme: SetSchema,
  notes: z.string().optional(),
});

const TrainingDaySchema = z.object({
  day: z.string().describe("Ex: 'Dia A — Peito/Tríceps'"),
  focus: z.string(),
  exercises: z.array(ExerciseSchema).min(4).max(8),
});

const MealSchema = z.object({
  name: z.string().describe("Ex: 'Café da manhã'"),
  time: z.string().optional(),
  items: z.array(z.object({
    food: z.string(),
    amount: z.string(),
  })).min(1),
  macros: z.object({
    kcal: z.number(),
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
  }),
});

const ProtocolSchema = z.object({
  training: z.object({
    split: z.string().describe("Ex: 'Push/Pull/Legs'"),
    days_per_week: z.number(),
    days: z.array(TrainingDaySchema),
    notes: z.string().optional(),
  }),
  diet: z.object({
    target_kcal: z.number(),
    target_protein_g: z.number(),
    target_carbs_g: z.number(),
    target_fat_g: z.number(),
    meals: z.array(MealSchema).min(3),
    notes: z.string().optional(),
  }),
  summary: z.string().describe("Resumo curto do raciocínio do protocolo"),
});

export const generateProtocol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (pErr || !profile) throw new Error("Perfil não encontrado");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-pro");

    const prompt = `Você é um coach de hipertrofia da Franzen Team. Crie um protocolo COMPLETO e personalizado (treino + dieta) para o atleta abaixo.

PERFIL:
- Nome: ${profile.full_name ?? "—"}
- Idade: ${profile.age ?? "—"} | Sexo: ${profile.sex ?? "—"}
- Peso: ${profile.weight ?? "—"} kg | Altura: ${profile.height ?? "—"} cm
- Objetivo: ${profile.goal ?? "—"}
- Nível de atividade: ${profile.activity_level ?? "—"} | NEAT: ${profile.neat ?? "—"}
- Experiência: ${profile.experience ?? "—"} | Academia: ${profile.gym_type ?? "—"}
- Dias de treino: ${profile.training_days ?? "—"} (${(profile.training_weekdays ?? []).join(", ")})
- Tempo por sessão: ${profile.training_time ?? "—"}
- Lesões: ${profile.injuries ?? "nenhuma"}
- Refeições/dia: ${profile.meal_count ?? "—"}
- Alergias: ${profile.allergies ?? "—"} | Não gosta: ${profile.disliked_foods ?? "—"}
- Suplementos: ${(profile.supplements ?? []).join(", ") || "—"}
- Cardio: ${profile.cardio_enabled ? `${profile.cardio_frequency}, ${profile.cardio_duration}, ${profile.cardio_type_preference}` : "não"}
- Sono: ${profile.sleep_hours ?? "—"} h | Estresse: ${profile.stress_level ?? "—"}

REGRAS:
- Treino com split coerente para os dias semanais.
- 4-8 exercícios por sessão, com séries, repetições e descanso.
- Dieta com kcal e macros calculados a partir do peso, altura, idade, sexo e objetivo.
- ≥3 refeições, respeitando alergias e alimentos não preferidos.
- Resumo curto explicando as escolhas.`;

    const { experimental_output } = await generateText({
      model,
      prompt,
      experimental_output: Output.object({ schema: ProtocolSchema }),
    });

    const out = experimental_output;

    const { data: existing } = await supabase
      .from("protocols").select("id, version")
      .eq("user_id", userId).eq("status", "active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (existing) {
      const { error } = await supabase.from("protocols")
        .update({ training: out.training, diet: out.diet, version: existing.version + 1 })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("protocols")
        .insert({ user_id: userId, training: out.training, diet: out.diet, status: "active" });
      if (error) throw new Error(error.message);
    }

    return { summary: out.summary };
  });