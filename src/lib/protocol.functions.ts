import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { PROTOCOL_SYSTEM_PROMPT, PROTOCOL_CYCLE_AND_REANALYSIS_SECTION } from "./ai-prompts";
import { getMethodologyPromptSection } from "./workoutRules";
import { generateProtocol as fallbackProtocol, type ProfileLike } from "./generateProtocol";
import { extractJsonFromResponse } from "./ai-json";

export const generateProtocol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await supabase
      .from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (pErr || !profile) throw new Error("Perfil não encontrado");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    // -------- Contexto histórico: protocolo anterior + feedbacks de reanálise --------
    const { data: previousProtocol } = await supabase
      .from("protocols")
      .select("id, version, training, diet, start_date, end_date, created_at")
      .eq("user_id", userId)
      .in("status", ["active", "archived", "pending_review"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sinceIso = new Date(Date.now() - 70 * 86400_000).toISOString();
    const [{ data: weekly }, { data: monthly }, { data: dietFb }, { data: workoutFb }] = await Promise.all([
      supabase.from("weekly_feedbacks").select("week_start, weight, adherence_training, adherence_diet, energy, sleep_quality, notes, measurements")
        .eq("user_id", userId).gte("created_at", sinceIso).order("week_start", { ascending: false }).limit(8),
      supabase.from("monthly_analyses").select("analysis_date, weight, measurements, coach_notes, ai_summary")
        .eq("user_id", userId).gte("created_at", sinceIso).order("analysis_date", { ascending: false }).limit(3),
      supabase.from("diet_feedback").select("session_date, meal_index, rating, hunger, notes")
        .eq("user_id", userId).gte("created_at", sinceIso).order("session_date", { ascending: false }).limit(20),
      supabase.from("workout_feedback").select("session_date, day_index, rating, notes")
        .eq("user_id", userId).gte("created_at", sinceIso).order("session_date", { ascending: false }).limit(20),
    ]);

    const hasHistory = !!previousProtocol || (weekly?.length ?? 0) > 0 || (monthly?.length ?? 0) > 0
      || (dietFb?.length ?? 0) > 0 || (workoutFb?.length ?? 0) > 0;

    const sex: "M" | "F" = profile.sex === "F" ? "F" : "M";
    const methodology = getMethodologyPromptSection(sex);
    const systemPrompt = hasHistory
      ? `${PROTOCOL_SYSTEM_PROMPT}\n\n${methodology}\n\n${PROTOCOL_CYCLE_AND_REANALYSIS_SECTION}`
      : `${PROTOCOL_SYSTEM_PROMPT}\n\n${methodology}`;

    const historyBlock = hasHistory ? `

## PROTOCOLO ANTERIOR (use para ondular o próximo ciclo de 60 dias)
${previousProtocol ? JSON.stringify({
      version: previousProtocol.version,
      start_date: previousProtocol.start_date,
      end_date: previousProtocol.end_date,
      training: previousProtocol.training,
      diet: previousProtocol.diet,
    }, null, 2) : "—"}

## REANÁLISE / FEEDBACK DO ALUNO (últimos 70 dias)
- Semanais: ${JSON.stringify(weekly ?? [])}
- Mensais: ${JSON.stringify(monthly ?? [])}
- Feedback de treino (por sessão): ${JSON.stringify(workoutFb ?? [])}
- Feedback de dieta (por refeição): ${JSON.stringify(dietFb ?? [])}

APLIQUE as regras de "CICLO DE 60 DIAS" e "REANÁLISE — FEEDBACK DO ALUNO".
` : "";

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
${historyBlock}
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
      const parsed = extractJsonFromResponse(text || "");
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

    // Nunca substitui o ativo: insere SEMPRE como pending_review.
    // O admin aprova manualmente (arquiva o anterior e ativa o novo).
    // Remove pending anterior do mesmo aluno (mantém só o mais recente para revisar).
    await supabase.from("protocols").delete().eq("user_id", userId).eq("status", "pending_review");

    const nextVersion = (previousProtocol?.version ?? 0) + 1;
    const { error } = await supabase.from("protocols")
      .insert({
        user_id: userId,
        training: out.training as any,
        diet: out.diet as any,
        status: "pending_review",
        version: nextVersion,
      });
    if (error) throw new Error(error.message);

    return { summary: out.summary, pendingReview: true };
  });