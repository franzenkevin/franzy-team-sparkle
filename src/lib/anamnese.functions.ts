import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { BODY_ANALYSIS_SYSTEM_PROMPT, PROTOCOL_SYSTEM_PROMPT, PROTOCOL_CYCLE_AND_REANALYSIS_SECTION } from "./ai-prompts";
import { getMethodologyPromptSection } from "./workoutRules";
import { generateProtocol as fallbackProtocol, type ProfileLike } from "./generateProtocol";
import { extractJsonFromResponse } from "./ai-json";

function profileToText(p: any) {
  return `## DADOS DA ANAMNESE
- Nome: ${p.full_name ?? "—"} | CPF: ${p.cpf ?? "—"} | Nasc: ${p.birth_date ?? "—"} | Profissão: ${p.profession ?? "—"}
- Sexo: ${p.sex ?? "—"} | Idade: ${p.age ?? "—"} | Peso: ${p.weight ?? "—"}kg | Altura: ${p.height ?? "—"}cm
- Objetivo: ${p.goal ?? "—"} | 3m: ${p.goal_3m ?? "—"} | 1y: ${p.goal_1y ?? "—"}
- Nível: ${p.activity_level ?? "—"} | NEAT: ${p.neat ?? "—"} | Exp: ${p.experience ?? "—"}
- Academia: ${p.gym_type ?? "—"} (${p.gym_brand ?? "—"})
- Lesões: ${p.injuries ?? "Nenhuma"} | Limite estrutural: ${p.structural_limit ?? "—"}
- Desconforto diário: ${p.daily_discomfort ?? "—"} | em exercício: ${p.exercise_discomfort ?? "—"}
- Split atual: ${p.current_split ?? "—"} | Aeróbico: ${p.aerobic_protocol ?? "—"} jejum: ${p.aerobic_fasted ? "sim" : "não"}
- Dias treino: ${p.training_days ?? "—"}x (${(p.training_weekdays ?? []).join(", ")}) Horário: ${p.training_time ?? "—"}
- Histórico ergogênico: ${p.ergogenics_history ?? "—"}
- Meds psiquiátricos: ${p.psych_meds ?? "—"} | Fitoterápicos manipulados: ${p.manipulated_fitoterapics ?? "—"}
- Efeitos colaterais hormonais: ${p.hormonal_side_effects ?? "—"}
- Status dieta: ${p.diet_status ?? "—"} | Jejum manhã: ${p.fasting_morning ?? "—"}
- Digestibilidade: ${p.digestibility ?? "—"} | Intestino: ${p.bowel_routine ?? "—"}
- Dieta atual: ${p.current_diet_text ?? "—"}
- Rotina diária: ${p.daily_routine ?? "—"} | Fim de semana: ${p.weekend_routine ?? "—"}
- Horários difíceis: ${p.hard_meal_times ?? "—"} | Ansiedade doce: ${p.sweet_anxiety_times ?? "—"}
- Comidas que gosta: ${p.liked_foods ?? (p.preferred_foods ?? []).join(", ")}
- Não gosta: ${p.disliked_foods ?? "—"} | Alergias: ${p.allergies ?? "—"}
- Refeições/dia: ${p.meal_count ?? "—"} | Doce: ${p.sweet_preference ?? "—"} | Livres: ${p.free_meals ?? "—"}
- Suplementos: ${(p.supplements ?? []).join(", ")}
- Sono: ${p.sleep_hours ?? "—"}h (${p.sleep_quality ?? "—"}) | Estresse: ${p.stress_level ?? "—"}
- Junk food preferido: ${p.junk_food_choice ?? "—"}
- Cardio: ${p.cardio_enabled ? `SIM (${p.cardio_frequency}, ${p.cardio_duration}, ${p.cardio_timing}, ${p.cardio_type_preference})` : "Não"}`;
}

async function getSignedPhotoUrls(supabase: any, p: any): Promise<string[]> {
  const urls: string[] = [];
  for (const key of ["photo_front_url", "photo_side_url", "photo_back_url"]) {
    const path = p[key];
    if (!path) continue;
    if (/^https?:\/\//.test(path)) { urls.push(path); continue; }
    const { data } = await supabase.storage.from("photos").createSignedUrl(path, 3600);
    if (data?.signedUrl) urls.push(data.signedUrl);
  }
  return urls;
}

export const analyzeAnamnese = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId?: string }) => d ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const uid = data.targetUserId ?? userId;

    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
    if (!profile) throw new Error("Perfil não encontrado");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const photoUrls = await getSignedPhotoUrls(supabase, profile);
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-pro");

    const userContent: any[] = [
      { type: "text", text: `${profileToText(profile)}\n\nAnalise as fotos físicas (frente/lado/costas) e a anamnese acima. Retorne JSON.` },
      ...photoUrls.map((url) => ({ type: "image", image: url })),
    ];

    let content = "";
    try {
      const { text } = await generateText({
        model,
        system: BODY_ANALYSIS_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
        abortSignal: AbortSignal.timeout(110_000),
      });
      content = text || "";
    } catch (e: any) {
      content = JSON.stringify({
        body_fat_estimate: "—",
        overall_summary: `Análise IA indisponível: ${e?.message ?? "erro"}. Avalie manualmente com base na anamnese.`,
        weak_points: [], strong_points: [], posture_deviations: [],
        muscle_development: {}, recommendations: [],
      });
    }
    let jsonText: string;
    try {
      jsonText = JSON.stringify(extractJsonFromResponse(content));
    } catch {
      jsonText = content.trim();
    }

    const { error } = await supabase.from("ai_analyses").insert({
      user_id: uid, kind: "anamnese_analysis", content: jsonText, status: "pending",
      meta: { photos: photoUrls.length },
    });
    if (error) throw new Error(error.message);
    return { content: jsonText };
  });

export const prescribeFromAnamnese = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId?: string }) => d ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const uid = data.targetUserId ?? userId;

    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle();
    if (!profile) throw new Error("Perfil não encontrado");

    // EXIGE anamnese completa + análise corporal IA antes de prescrever
    if (!profile.anamnese_completed_at) {
      throw new Error("O aluno ainda não finalizou a anamnese. Peça que conclua antes de prescrever.");
    }

    const { data: lastAnamnese } = await supabase
      .from("ai_analyses").select("content, created_at").eq("user_id", uid).eq("kind", "anamnese_analysis")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    const { data: lastBody } = await supabase
      .from("ai_analyses").select("content, created_at").eq("user_id", uid).eq("kind", "body_analysis")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (!lastBody?.content) {
      throw new Error(
        "Antes de prescrever, gere a Análise Corporal IA (aba Análises IA). O protocolo SEMPRE deve usar a análise das fotos junto com a anamnese.",
      );
    }
    if (!lastAnamnese?.content) {
      throw new Error(
        "Antes de prescrever, gere a Análise IA da anamnese (botão Gerar análise IA na aba Anamnese).",
      );
    }

    // Contexto histórico para ondulação + reanálise
    const { data: previousProtocol } = await supabase
      .from("protocols").select("id, version, training, diet, start_date, end_date")
      .eq("user_id", uid).in("status", ["active", "archived", "pending_review"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    const sinceIso = new Date(Date.now() - 70 * 86400_000).toISOString();
    const [{ data: weekly }, { data: monthly }, { data: dietFb }, { data: workoutFb }] = await Promise.all([
      supabase.from("weekly_feedbacks").select("week_start, weight, adherence_training, adherence_diet, energy, sleep_quality, notes, measurements")
        .eq("user_id", uid).gte("created_at", sinceIso).order("week_start", { ascending: false }).limit(8),
      supabase.from("monthly_analyses").select("analysis_date, weight, measurements, coach_notes, ai_summary")
        .eq("user_id", uid).gte("created_at", sinceIso).order("analysis_date", { ascending: false }).limit(3),
      supabase.from("diet_feedback").select("session_date, meal_index, rating, hunger, notes")
        .eq("user_id", uid).gte("created_at", sinceIso).order("session_date", { ascending: false }).limit(20),
      supabase.from("workout_feedback").select("session_date, day_index, rating, notes")
        .eq("user_id", uid).gte("created_at", sinceIso).order("session_date", { ascending: false }).limit(20),
    ]);
    const hasHistory = !!previousProtocol || (weekly?.length ?? 0) > 0 || (monthly?.length ?? 0) > 0
      || (dietFb?.length ?? 0) > 0 || (workoutFb?.length ?? 0) > 0;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const sex: "M" | "F" = profile.sex === "F" ? "F" : "M";
    const systemPrompt = hasHistory
      ? `${PROTOCOL_SYSTEM_PROMPT}\n\n${getMethodologyPromptSection(sex)}\n\n${PROTOCOL_CYCLE_AND_REANALYSIS_SECTION}`
      : `${PROTOCOL_SYSTEM_PROMPT}\n\n${getMethodologyPromptSection(sex)}`;

    const historyBlock = hasHistory ? `

## PROTOCOLO ANTERIOR
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
- Treino: ${JSON.stringify(workoutFb ?? [])}
- Dieta: ${JSON.stringify(dietFb ?? [])}

APLIQUE as regras de "CICLO DE 60 DIAS" e "REANÁLISE — FEEDBACK DO ALUNO".` : "";

    const userPrompt = `${profileToText(profile)}

## AVALIAÇÃO IA DA ANAMNESE (obrigatória)
${lastAnamnese.content}

## ANÁLISE CORPORAL IA — FOTOS (obrigatória)
${lastBody.content}
${historyBlock}

REGRA CRÍTICA: você DEVE usar TANTO os dados da anamnese QUANTO os achados da análise corporal das fotos (desvios posturais, pontos fracos/fortes, simetria, recomendações) para construir o protocolo. Justifique escolhas baseadas em ambas as fontes no campo "summary".

Gere o JSON completo do protocolo (treino + dieta + summary).`;

    let out: { training: any; diet: any; summary: string };
    try {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const model = gateway("google/gemini-2.5-flash");
      const { text } = await generateText({
        model, system: systemPrompt, prompt: userPrompt,
        abortSignal: AbortSignal.timeout(110_000),
      });
      const parsed = extractJsonFromResponse(text || "");
      if (!parsed.training || !parsed.diet) throw new Error("estrutura inválida");
      out = { training: parsed.training, diet: parsed.diet, summary: parsed.summary ?? "Prescrição automática IA." };
    } catch (e) {
      console.warn("[prescribeFromAnamnese] fallback:", e);
      const fb = fallbackProtocol(profile as ProfileLike);
      out = { training: fb.training, diet: fb.diet, summary: fb.summary };
    }

    // Cria como pending_review (admin prescreveu via IA, mas precisa revisar/ajustar antes de liberar).
    const { data: existingPending } = await supabase
      .from("protocols").select("id").eq("user_id", uid).eq("status", "pending_review")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const nextVersion = (previousProtocol?.version ?? 0) + 1;
    if (existingPending) {
      const { error } = await supabase.from("protocols")
        .update({ training: out.training, diet: out.diet, version: nextVersion }).eq("id", existingPending.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("protocols")
        .insert({ user_id: uid, training: out.training, diet: out.diet, status: "pending_review", version: nextVersion });
      if (error) throw new Error(error.message);
    }

    await supabase.from("ai_analyses").insert({
      user_id: uid, kind: "prescription", content: out.summary, status: "pending", meta: { auto: true },
    });

    return { summary: out.summary };
  });

export const generateCoachFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "weekly" | "monthly" | "diet"; refId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    let table: "weekly_feedbacks" | "monthly_analyses" | "diet_feedback" = "weekly_feedbacks";
    if (data.kind === "monthly") table = "monthly_analyses";
    if (data.kind === "diet") table = "diet_feedback";

    const { data: row } = await (supabase.from(table) as any).select("*").eq("id", data.refId).maybeSingle();
    if (!row) throw new Error("Registro não encontrado");

    const { data: profile } = await supabase.from("profiles").select("full_name, sex, age, weight, height, goal, experience")
      .eq("user_id", (row as any).user_id).maybeSingle();

    const prompt = `Você é o coach. Escreva um feedback ESCRITO curto (4-8 frases), motivador, direto, em PT-BR, para o aluno abaixo.

ALUNO: ${JSON.stringify(profile)}
TIPO: ${data.kind}
DADOS DO FEEDBACK: ${JSON.stringify(row)}

Use tom de coach (Franzen Team). Cite ajustes práticos se cabíveis. Sem markdown.`;

    let text = "";
    try {
      const gateway = createLovableAiGatewayProvider(apiKey);
      const model = gateway("google/gemini-2.5-flash");
      const res = await generateText({ model, prompt, abortSignal: AbortSignal.timeout(60_000) });
      text = res.text || "";
    } catch (e: any) {
      text = `Acompanhei seus dados. Mantenha consistência nesta semana, foco em sono e proteína em todas as refeições. (IA indisponível: ${e?.message ?? "erro"})`;
    }
    return { text };
  });

/* ============================================================
 * AUTO-SAVE DA ANAMNESE (rascunho no servidor)
 * Persiste estado parcial em profiles.anamnese_extra.draft
 * ============================================================ */
export const saveAnamneseDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { values: Record<string, unknown>; step?: number }) => {
    if (!d || typeof d.values !== "object" || d.values === null) {
      throw new Error("Payload inválido");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: current } = await supabase
      .from("profiles").select("anamnese_extra").eq("user_id", userId).maybeSingle();
    const extra = (current?.anamnese_extra ?? {}) as Record<string, unknown>;
    const merged = {
      ...extra,
      draft: {
        values: data.values,
        step: data.step ?? 0,
        savedAt: new Date().toISOString(),
      },
    };
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, anamnese_extra: merged as any }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { savedAt: (merged.draft as any).savedAt };
  });

export const loadAnamneseDraft = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles").select("anamnese_extra, onboarding_complete")
      .eq("user_id", userId).maybeSingle();
    const draft = (data?.anamnese_extra as any)?.draft ?? null;
    return { draft, completed: !!data?.onboarding_complete };
  });

export const clearAnamneseDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: current } = await supabase
      .from("profiles").select("anamnese_extra").eq("user_id", userId).maybeSingle();
    const extra = { ...((current?.anamnese_extra ?? {}) as Record<string, unknown>) };
    delete (extra as any).draft;
    await supabase.from("profiles").update({ anamnese_extra: extra as any }).eq("user_id", userId);
    return { ok: true };
  });
