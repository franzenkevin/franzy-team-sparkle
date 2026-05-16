import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { PROTOCOL_SYSTEM_PROMPT } from "./ai-prompts";
import { getMethodologyPromptSection } from "./workoutRules";
import { generateProtocol as fallbackProtocol, type ProfileLike } from "./generateProtocol";

export const generateProtocol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (pErr || !profile) throw new Error("Perfil não encontrado");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const sex: "M" | "F" = profile.sex === "F" ? "F" : "M";
    const methodology = getMethodologyPromptSection(sex);
    const systemPrompt = `${PROTOCOL_SYSTEM_PROMPT}\n\n${methodology}`;

    const userPrompt = `Gere um protocolo completo (treino + dieta) para este aluno:

## DADOS DO ALUNO
- Nome: ${profile.full_name || "Aluno"}
- Sexo: ${sex === "M" ? "Masculino" : "Feminino"}
- Idade: ${profile.age ?? "—"} anos | Peso: ${profile.weight ?? "—"}kg | Altura: ${profile.height ?? "—"}cm
- Objetivo: ${profile.goal ?? "—"}
- Nível de atividade: ${profile.activity_level ?? "—"} | NEAT: ${profile.neat ?? "—"}
- Experiência: ${profile.experience ?? "—"}
- Tipo de academia: ${profile.gym_type ?? "Academia completa"}
- Lesões: ${profile.injuries || "Nenhuma"}
- Dias de treino: ${profile.training_days ?? 4}x/semana (${(profile.training_weekdays || []).join(", ") || "flexível"})
- Horário do treino: ${profile.training_time ?? "—"}
- Refeições/dia: ${profile.meal_count ?? 4}
- Alimentos preferidos (USE EXCLUSIVAMENTE ESTES): ${(profile.preferred_foods || []).join(", ") || "—"}
- Não gosta: ${profile.disliked_foods || "—"} | Alergias: ${profile.allergies || "—"}
- Preferência de doce: ${profile.sweet_preference || "Nenhum"}
- Suplementos: ${(profile.supplements || []).join(", ") || "—"}
- Refeições livres: ${profile.free_meals ?? "—"}
- Sono: ${profile.sleep_hours ?? "—"}h | Estresse: ${profile.stress_level ?? "—"}
- Cardio: ${profile.cardio_enabled ? `SIM — ${profile.cardio_frequency ?? "?"}, ${profile.cardio_duration ?? "?"}, ${profile.cardio_timing ?? "?"}, tipo: ${profile.cardio_type_preference ?? "?"}` : "NÃO"}

Aplique o CHECKLIST DO COMITÊ DE 3 PROFISSIONAIS antes de gerar o JSON. Responda APENAS com o JSON.`;

    let out: { training: unknown; diet: unknown; summary: string };
    try {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const model = gateway("google/gemini-2.5-flash");
      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        abortSignal: AbortSignal.timeout(110_000),
      });
      let content = text || "";
      const m = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (m) content = m[1].trim();
      const parsed = JSON.parse(content);
      if (!parsed.training || !parsed.diet) throw new Error("Estrutura inválida");
      out = {
        training: parsed.training,
        diet: parsed.diet,
        summary: typeof parsed.summary === "string" ? parsed.summary : "Protocolo gerado pelo Comitê (IA).",
      };
    } catch (e) {
      console.warn("[generateProtocol] IA falhou — usando fallback rule-based:", e);
      const fb = fallbackProtocol(profile as ProfileLike);
      out = { training: fb.training, diet: fb.diet, summary: fb.summary };
    }

    const { data: existing } = await supabase
      .from("protocols").select("id, version")
      .eq("user_id", userId).eq("status", "active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (existing) {
      const { error } = await supabase.from("protocols")
        .update({ training: out.training as any, diet: out.diet as any, version: existing.version + 1 })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("protocols")
        .insert({ user_id: userId, training: out.training as any, diet: out.diet as any, status: "active" });
      if (error) throw new Error(error.message);
    }

    return { summary: out.summary };
  });