import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ProtocolStatus = "active" | "pending_review" | "archived" | "rejected";

export const adminGetStudentWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { targetUserId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Acesso restrito ao admin");

    const sinceIso = new Date(Date.now() - 120 * 86400_000).toISOString();
    const [profile, protocols, analyses, weekly, monthly, dietFeedback, workoutFeedback, checkins, logs] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("user_id", data.targetUserId).maybeSingle(),
      supabaseAdmin.from("protocols").select("*").eq("user_id", data.targetUserId).order("created_at", { ascending: false }).limit(25),
      supabaseAdmin.from("ai_analyses").select("*").eq("user_id", data.targetUserId).order("created_at", { ascending: false }).limit(25),
      supabaseAdmin.from("weekly_feedbacks").select("*").eq("user_id", data.targetUserId).gte("created_at", sinceIso).order("week_start", { ascending: false }).limit(12),
      supabaseAdmin.from("monthly_analyses").select("*").eq("user_id", data.targetUserId).order("analysis_date", { ascending: false }).limit(8),
      supabaseAdmin.from("diet_feedback").select("*").eq("user_id", data.targetUserId).gte("created_at", sinceIso).order("session_date", { ascending: false }).limit(40),
      supabaseAdmin.from("workout_feedback").select("*").eq("user_id", data.targetUserId).gte("created_at", sinceIso).order("session_date", { ascending: false }).limit(40),
      supabaseAdmin.from("checkins").select("*").eq("user_id", data.targetUserId).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("workout_logs").select("*").eq("user_id", data.targetUserId).gte("created_at", sinceIso).order("session_date", { ascending: false }).limit(80),
    ]);
    if (profile.error) throw new Error(profile.error.message);
    return {
      profile: profile.data,
      protocols: protocols.data ?? [],
      analyses: analyses.data ?? [],
      weekly: weekly.data ?? [],
      monthly: monthly.data ?? [],
      dietFeedback: dietFeedback.data ?? [],
      workoutFeedback: workoutFeedback.data ?? [],
      checkins: checkins.data ?? [],
      logs: logs.data ?? [],
    };
  });

export const adminUpdateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { targetUserId: string; profile: Record<string, unknown> }) => data)
  .handler(async ({ data, context }) => {
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Acesso restrito ao admin");

    const allowed = new Set([
      "full_name", "age", "sex", "weight", "height", "goal", "activity_level", "neat",
      "training_days", "training_time", "experience", "gym_type", "injuries", "disliked_foods",
      "allergies", "sleep_hours", "stress_level", "sweet_preference", "free_meals", "meal_count",
      "cardio_enabled", "cardio_frequency", "cardio_duration", "cardio_timing", "cardio_type_preference",
    ]);
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(data.profile ?? {})) {
      if (allowed.has(key)) updates[key] = value === "" ? null : value;
    }
    const { error } = await supabaseAdmin.from("profiles").update(updates as any).eq("user_id", data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSaveProtocol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    targetUserId: string;
    protocolId?: string | null;
    training: unknown;
    diet: unknown;
    hormones?: unknown;
    status: ProtocolStatus;
    notify?: boolean;
  }) => data)
  .handler(async ({ data, context }) => {
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Acesso restrito ao admin");

    const status = (["active", "pending_review", "archived", "rejected"] as ProtocolStatus[]).includes(data.status)
      ? data.status
      : "pending_review";
    if (status === "active") {
      let q = supabaseAdmin.from("protocols").update({ status: "archived" }).eq("user_id", data.targetUserId).eq("status", "active");
      if (data.protocolId) q = q.neq("id", data.protocolId);
      const { error } = await q;
      if (error) throw new Error(error.message);
    }

    if (data.protocolId) {
      const { data: current, error: getError } = await supabaseAdmin
        .from("protocols")
        .select("version")
        .eq("id", data.protocolId)
        .eq("user_id", data.targetUserId)
        .maybeSingle();
      if (getError) throw new Error(getError.message);
      const { error } = await supabaseAdmin
        .from("protocols")
        .update({
          training: data.training as any,
          diet: data.diet as any,
          hormones: Array.isArray(data.hormones) ? data.hormones as any : [],
          status,
          version: ((current as any)?.version ?? 0) + 1,
        })
        .eq("id", data.protocolId)
        .eq("user_id", data.targetUserId);
      if (error) throw new Error(error.message);
    } else {
      const { data: latest } = await supabaseAdmin
        .from("protocols")
        .select("version")
        .eq("user_id", data.targetUserId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { error } = await supabaseAdmin.from("protocols").insert({
        user_id: data.targetUserId,
        training: data.training as any,
        diet: data.diet as any,
        hormones: Array.isArray(data.hormones) ? data.hormones as any : [],
        status,
        version: ((latest as any)?.version ?? 0) + 1,
      });
      if (error) throw new Error(error.message);
    }

    if (status === "active" && data.notify) {
      await supabaseAdmin.from("notifications").insert({
        user_id: data.targetUserId,
        type: "protocol",
        title: "Novo protocolo liberado",
        body: "Seu coach revisou e liberou uma nova versão do protocolo.",
        link: "/training",
      });
    }
    return { ok: true };
  });

export const adminSetAnalysisStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { analysisId: string; status: "pending" | "approved" | "rejected"; content?: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Acesso restrito ao admin");

    const { data: analysis, error: getError } = await supabaseAdmin
      .from("ai_analyses")
      .select("user_id")
      .eq("id", data.analysisId)
      .maybeSingle();
    if (getError) throw new Error(getError.message);
    if (!analysis) throw new Error("Análise não encontrada");

    const { error } = await supabaseAdmin
      .from("ai_analyses")
      .update({ status: data.status, ...(typeof data.content === "string" ? { content: data.content } : {}) })
      .eq("id", data.analysisId);
    if (error) throw new Error(error.message);
    if (data.status === "approved") {
      await supabaseAdmin.from("notifications").insert({
        user_id: (analysis as any).user_id,
        type: "analysis",
        title: "Nova análise IA disponível",
        body: "Seu coach revisou e liberou uma nova análise sua.",
        link: "/progress",
      });
    }
    return { ok: true };
  });