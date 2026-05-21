import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function ensureAdmin(userId: string) {
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new Error("Acesso restrito ao admin");
}

export const adminCreateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    fullName: string;
    email: string;
    password: string;
    plan?: string | null;
    planStart?: string | null;
    planEnd?: string | null;
  }) => data)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const email = data.email.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("E-mail inválido");
    if (!data.password || data.password.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres");
    if (!data.fullName?.trim()) throw new Error("Nome obrigatório");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName.trim() },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário");
    const newUserId = created.user.id;

    // Garantir profile (trigger handle_new_user já cria, mas atualizamos campos)
    await supabaseAdmin.from("profiles").upsert({
      user_id: newUserId,
      full_name: data.fullName.trim(),
      plan: data.plan ?? null,
      plan_start: data.planStart ?? null,
      plan_end: data.planEnd ?? null,
      account_status: "pending",
      created_by_admin: context.userId,
    } as any, { onConflict: "user_id" });

    // Notificação interna de boas-vindas (visível ao acessar)
    await supabaseAdmin.from("notifications").insert({
      user_id: newUserId,
      type: "welcome",
      title: "Bem-vindo(a) à Franzen Team!",
      body: `Seu plano${data.plan ? ` (${data.plan})` : ""} foi ativado. Complete a anamnese para liberar seu protocolo.`,
      link: "/onboarding",
    });

    return {
      ok: true,
      userId: newUserId,
      credentials: { email, password: data.password },
    };
  });

export const markFirstAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ account_status: "active", first_access_at: new Date().toISOString() } as any)
      .eq("user_id", context.userId)
      .or("account_status.eq.pending,first_access_at.is.null");
    if (error) console.warn("[markFirstAccess]", error.message);
    return { ok: true };
  });