import { createServerFn } from "@tanstack/react-start";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { extractJsonFromResponse } from "./ai-json";
import { PROTOCOL_SYSTEM_PROMPT } from "./ai-prompts";
import { tmbMifflin, activityFactor, getKcal, targetKcal, macros } from "./calculators";

async function ensureAdmin(userId: string) {
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!role) throw new Error("Acesso restrito ao admin");
}

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

export const adminCoachChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string; messages: ChatMsg[] }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    // Load student snapshot
    const sinceIso = new Date(Date.now() - 90 * 86400_000).toISOString();
    const [profile, weekly, dietFb, workoutFb, activeProtocol] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("user_id", data.targetUserId).maybeSingle(),
      supabaseAdmin.from("weekly_feedbacks").select("*").eq("user_id", data.targetUserId).gte("created_at", sinceIso).order("week_start", { ascending: false }).limit(8),
      supabaseAdmin.from("diet_feedback").select("session_date, meal_index, rating, hunger, notes").eq("user_id", data.targetUserId).gte("created_at", sinceIso).order("session_date", { ascending: false }).limit(15),
      supabaseAdmin.from("workout_feedback").select("session_date, day_index, rating, notes").eq("user_id", data.targetUserId).gte("created_at", sinceIso).order("session_date", { ascending: false }).limit(15),
      supabaseAdmin.from("protocols").select("training, diet, hormones, version, start_date").eq("user_id", data.targetUserId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const studentBlock = `
## ALUNO
${JSON.stringify({
  full_name: profile.data?.full_name, age: profile.data?.age, sex: profile.data?.sex,
  weight: profile.data?.weight, height: profile.data?.height, goal: profile.data?.goal,
  activity_level: profile.data?.activity_level, training_days: profile.data?.training_days,
  experience: profile.data?.experience, injuries: profile.data?.injuries,
  allergies: profile.data?.allergies, disliked_foods: profile.data?.disliked_foods,
  preferred_foods: profile.data?.preferred_foods, meal_count: profile.data?.meal_count,
  cardio_enabled: profile.data?.cardio_enabled, sleep_hours: profile.data?.sleep_hours,
  stress_level: profile.data?.stress_level,
}, null, 2)}

## PROTOCOLO ATIVO (resumo)
${activeProtocol.data ? JSON.stringify({
  version: activeProtocol.data.version, start_date: activeProtocol.data.start_date,
  training_split: (activeProtocol.data.training as any)?.split,
  diet_kcal: (activeProtocol.data.diet as any)?.target_kcal,
}, null, 2) : "Sem protocolo ativo."}

## FEEDBACKS RECENTES
- Semanais: ${JSON.stringify(weekly.data ?? [])}
- Treino (sessões): ${JSON.stringify(workoutFb.data ?? [])}
- Dieta (refeições): ${JSON.stringify(dietFb.data ?? [])}
`;

    const system = `Você é o assistente prescritor do admin da Franzen Team. Responda em PT-BR, claro e direto.

REGRAS:
- O admin é um profissional. Pode discutir números, técnicas, raciocínio.
- Ao propor um protocolo NOVO ou ajuste estrutural, use a tool "proposeProtocol" para gerar JSON completo + rationale.
- Para cálculos simples (TMB, GET, macros), use a tool "calcMacros".
- NUNCA invente dados do aluno: use somente o bloco abaixo.
- Sempre justifique escolhas conectando à avaliação física, lesões, feedbacks.
- Quando gerar proposta, descreva em 3-5 linhas o RACIOCÍNIO antes de chamar a tool.
${studentBlock}`;

    let proposal: any = null;

    const tools = {
      calcMacros: tool({
        description: "Calcula TMB, GET e macros para o aluno.",
        inputSchema: z.object({
          weightKg: z.number(),
          heightCm: z.number(),
          age: z.number(),
          sex: z.enum(["M", "F"]),
          activityLevel: z.string(),
          deficitPct: z.number().describe("Ex: -20 = déficit 20%, +10 = superávit"),
          proteinPerKg: z.number().default(2.0),
          fatPerKg: z.number().default(0.8),
        }),
        execute: async (input) => {
          const tmb = tmbMifflin(input);
          const f = activityFactor(input.activityLevel);
          const get = getKcal(tmb, f);
          const kcal = targetKcal(get, input.deficitPct);
          const m = macros({ kcal, weightKg: input.weightKg, proteinPerKg: input.proteinPerKg, fatPerKg: input.fatPerKg });
          return { tmb, factor: f, get, target_kcal: kcal, ...m };
        },
      }),
      proposeProtocol: tool({
        description: "Gera um protocolo completo (treino + dieta + hormônios opcional) com rationale para o aluno. Use quando o admin pedir 'monte um treino', 'crie protocolo', 'ajuste o plano', etc.",
        inputSchema: z.object({
          briefing: z.string().describe("Resumo das instruções específicas do admin para esta prescrição."),
        }),
        execute: async (input) => {
          try {
            const gw = createLovableAiGatewayProvider(apiKey);
            const subModel = gw("google/gemini-2.5-flash");
            const prompt = `${studentBlock}\n\n## INSTRUÇÕES DO ADMIN\n${input.briefing}\n\nGere o protocolo em JSON conforme as regras do sistema, INCLUINDO o campo "rationale" obrigatoriamente.`;
            const { text } = await generateText({
              model: subModel,
              system: `${PROTOCOL_SYSTEM_PROMPT}\n\n## CAMPO RATIONALE OBRIGATÓRIO\nAdicione ao topo do JSON dois campos extras:\n- "training.rationale": { "summary": string, "byDay": [{ "name": string, "why": string }] }\n- "diet.rationale": { "summary": string, "byMeal": [{ "name": string, "why": string }] }\nNas notas internas de cada exercício/alimento principal, mantenha "rationale" curto explicando a escolha.`,
              prompt,
              abortSignal: AbortSignal.timeout(110_000),
            });
            const parsed = extractJsonFromResponse(text || "");
            if (!parsed.training || !parsed.diet) throw new Error("Estrutura inválida");
            proposal = {
              training: parsed.training,
              diet: parsed.diet,
              hormones: Array.isArray((parsed as any).hormones) ? (parsed as any).hormones : [],
              summary: typeof (parsed as any).summary === "string" ? (parsed as any).summary : "",
            };
            return { ok: true, summary: proposal.summary || "Proposta gerada. Revise no painel abaixo." };
          } catch (e: any) {
            return { ok: false, error: e?.message ?? "Falha ao gerar protocolo" };
          }
        },
      }),
    };

    const gw = createLovableAiGatewayProvider(apiKey);
    const model = gw("google/gemini-2.5-flash");
    const { text } = await generateText({
      model,
      system,
      messages: data.messages.map((m) => ({ role: m.role, content: m.content })) as any,
      tools,
      stopWhen: stepCountIs(50),
      abortSignal: AbortSignal.timeout(120_000),
    });

    return { reply: text || "(sem resposta)", proposal };
  });
