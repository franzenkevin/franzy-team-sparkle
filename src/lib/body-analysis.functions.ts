import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { BODY_ANALYSIS_SYSTEM_PROMPT } from "./ai-prompts";
import { extractJsonFromResponse } from "./ai-json";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Input = {
  photoFront: string;
  photoSide: string;
  photoBack: string;
  weight?: number | null;
  height?: number | null;
  notes?: string | null;
};

async function signed(supabase: any, path: string): Promise<string> {
  if (/^https?:\/\//.test(path)) return path;
  const { data } = await supabase.storage.from("photos").createSignedUrl(path, 3600);
  return data?.signedUrl || path;
}

export const requestBodyAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Input) => {
    if (!d?.photoFront || !d?.photoSide || !d?.photoBack) {
      throw new Error("Envie as 3 fotos (frente, lado e costas).");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, sex, age, weight, height, goal, experience, injuries")
      .eq("user_id", userId).maybeSingle();

    const [u1, u2, u3] = await Promise.all([
      signed(supabase, data.photoFront),
      signed(supabase, data.photoSide),
      signed(supabase, data.photoBack),
    ]);

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-pro");

    const profileText = `Perfil: ${profile?.full_name ?? "—"} | sexo ${profile?.sex ?? "—"} | ${profile?.age ?? "—"} anos | ${data.weight ?? profile?.weight ?? "—"}kg | ${data.height ?? profile?.height ?? "—"}cm | objetivo ${profile?.goal ?? "—"} | exp ${profile?.experience ?? "—"} | lesões ${profile?.injuries ?? "—"}.${data.notes ? ` Obs do aluno: ${data.notes}.` : ""}`;

    let content = "";
    try {
      const { text } = await generateText({
        model,
        system: BODY_ANALYSIS_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `${profileText}\n\nAnalise as 3 fotos (frente, lado, costas) e devolva JSON com: body_fat_estimate (faixa %), lean_mass_estimate, posture_deviations[], strong_points[], weak_points[], muscle_development (por grupo), symmetry, recommendations[], overall_summary.` },
            { type: "image", image: u1 },
            { type: "image", image: u2 },
            { type: "image", image: u3 },
          ],
        }],
        abortSignal: AbortSignal.timeout(110_000),
      });
      content = text || "";
    } catch (e: any) {
      throw new Error(`Falha na análise IA: ${e?.message ?? "erro desconhecido"}`);
    }

    let jsonText: string;
    try {
      jsonText = JSON.stringify(extractJsonFromResponse(content));
    } catch {
      jsonText = content.trim();
    }

    const { error } = await supabase.from("ai_analyses").insert({
      user_id: userId,
      kind: "body_analysis",
      content: jsonText,
      status: "pending",
      meta: {
        photos: { front: data.photoFront, side: data.photoSide, back: data.photoBack },
        weight: data.weight ?? null,
        height: data.height ?? null,
        notes: data.notes ?? null,
      },
    });
    if (error) throw new Error(error.message);
    return { content: jsonText, pending: true };
  });

export const listMyBodyAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("ai_analyses")
      .select("id, content, status, created_at, meta")
      .eq("user_id", userId).eq("kind", "body_analysis")
      .order("created_at", { ascending: false }).limit(10);
    return { items: data ?? [] };
  });

async function ensureAdmin(userId: string) {
  const { data: role } = await supabaseAdmin
    .from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!role) throw new Error("Acesso restrito ao admin");
}

async function signedAdmin(path: string): Promise<string> {
  if (/^https?:\/\//.test(path)) return path;
  const { data } = await supabaseAdmin.storage.from("photos").createSignedUrl(path, 3600);
  return data?.signedUrl || path;
}

/** Admin gera análise corporal usando as fotos da anamnese OU as últimas enviadas pelo aluno. */
export const adminGenerateBodyAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { targetUserId: string; notes?: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const { data: profile } = await supabaseAdmin.from("profiles")
      .select("full_name, sex, age, weight, height, goal, experience, injuries, photo_front_url, photo_side_url, photo_back_url")
      .eq("user_id", data.targetUserId).maybeSingle();
    if (!profile) throw new Error("Perfil não encontrado");

    let front = (profile as any).photo_front_url as string | null;
    let side = (profile as any).photo_side_url as string | null;
    let back = (profile as any).photo_back_url as string | null;

    if (!front || !side || !back) {
      // fallback: pega da última análise body_analysis com meta.photos
      const { data: last } = await supabaseAdmin.from("ai_analyses")
        .select("meta").eq("user_id", data.targetUserId).eq("kind", "body_analysis")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const m = (last as any)?.meta?.photos;
      front ||= m?.front; side ||= m?.side; back ||= m?.back;
    }
    if (!front || !side || !back) throw new Error("Aluno ainda não enviou as 3 fotos.");

    const [u1, u2, u3] = await Promise.all([signedAdmin(front), signedAdmin(side), signedAdmin(back)]);
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-pro");
    const profileText = `Perfil: ${profile.full_name ?? "—"} | sexo ${profile.sex ?? "—"} | ${profile.age ?? "—"} anos | ${profile.weight ?? "—"}kg | ${profile.height ?? "—"}cm | objetivo ${profile.goal ?? "—"} | exp ${profile.experience ?? "—"} | lesões ${profile.injuries ?? "—"}.${data.notes ? ` Obs admin: ${data.notes}.` : ""}`;

    const { text } = await generateText({
      model,
      system: BODY_ANALYSIS_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `${profileText}\n\nAnalise as 3 fotos (frente, lado, costas) e devolva JSON com: body_fat_estimate, lean_mass_estimate, posture_deviations[], strong_points[], weak_points[], muscle_development (por grupo), symmetry, recommendations[], overall_summary.` },
          { type: "image", image: u1 },
          { type: "image", image: u2 },
          { type: "image", image: u3 },
        ],
      }],
      abortSignal: AbortSignal.timeout(110_000),
    });

    let jsonText: string;
    try { jsonText = JSON.stringify(extractJsonFromResponse(text || "")); }
    catch { jsonText = (text || "").trim(); }

    const { data: inserted, error } = await supabaseAdmin.from("ai_analyses").insert({
      user_id: data.targetUserId,
      kind: "body_analysis",
      content: jsonText,
      status: "pending",
      meta: { photos: { front, side, back }, generated_by_admin: true, notes: data.notes ?? null },
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (inserted as any).id, content: jsonText };
  });

/** Admin edita o conteúdo (JSON) de uma análise IA. */
export const adminUpdateAnalysisContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { analysisId: string; content: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    // valida JSON
    try { JSON.parse(data.content); } catch { throw new Error("Conteúdo inválido (JSON)"); }
    const { error } = await supabaseAdmin.from("ai_analyses")
      .update({ content: data.content }).eq("id", data.analysisId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
