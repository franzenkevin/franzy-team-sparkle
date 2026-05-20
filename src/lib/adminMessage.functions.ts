import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "./ai-gateway";

async function ensureAdmin(userId: string) {
  const { data: role } = await supabaseAdmin
    .from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!role) throw new Error("Acesso restrito ao admin");
}

type ThreadMsg = { sender_id: string; body: string; created_at: string };

export const adminSuggestReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string; thread: ThreadMsg[]; extra?: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const [profile, protocol, weekly] = await Promise.all([
      supabaseAdmin.from("profiles").select("full_name, goal, sex, age, weight, height, injuries, allergies").eq("user_id", data.targetUserId).maybeSingle(),
      supabaseAdmin.from("protocols").select("training, diet, hormones, version").eq("user_id", data.targetUserId).eq("status", "active").maybeSingle(),
      supabaseAdmin.from("weekly_feedbacks").select("week_start, adherence_diet, adherence_training, energy, sleep_quality, notes").eq("user_id", data.targetUserId).order("week_start", { ascending: false }).limit(2),
    ]);

    const last = data.thread.slice(-10).map((m) =>
      `${m.sender_id === data.targetUserId ? "ALUNO" : "COACH"}: ${m.body}`).join("\n");

    const system = `Você é o coach Franzen Team respondendo um aluno via chat. Responda em PT-BR, tom acolhedor e profissional, OBJETIVO (máx 4-6 linhas), sem clichês. Use o nome do aluno apenas se fizer sentido. NUNCA invente protocolo — responda baseado no que existe. Se o aluno fizer pergunta clínica complexa, ofereça encaminhar para análise mais detalhada.`;

    const context_block = `## ALUNO\n${JSON.stringify(profile.data ?? {})}\n## PROTOCOLO ATIVO (resumo)\n${protocol.data ? JSON.stringify({
      version: protocol.data.version,
      training_split: (protocol.data.training as any)?.split,
      diet_kcal: (protocol.data.diet as any)?.totalCalories ?? (protocol.data.diet as any)?.target_kcal,
    }) : "Sem protocolo ativo"}\n## FEEDBACKS RECENTES\n${JSON.stringify(weekly.data ?? [])}\n## HISTÓRICO DO CHAT (últimas 10)\n${last}\n${data.extra ? `\n## INSTRUÇÃO DO COACH\n${data.extra}` : ""}`;

    const gw = createLovableAiGatewayProvider(apiKey);
    const { text } = await generateText({
      model: gw("google/gemini-2.5-flash"),
      system,
      prompt: `${context_block}\n\nGere SOMENTE o rascunho da resposta do coach ao aluno (sem prefixos tipo "COACH:" ou aspas). Direto ao ponto.`,
      abortSignal: AbortSignal.timeout(45_000),
    });
    return { suggestion: (text ?? "").trim() };
  });