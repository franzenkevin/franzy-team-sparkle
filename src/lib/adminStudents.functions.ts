import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const APP_URL = "https://www.franzenteam.app";

function encodeRFC2822({ to, subject, html }: { to: string; subject: string; html: string }) {
  const headers = [
    `To: ${to}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    `Subject: =?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`,
    "",
    html,
  ].join("\r\n");
  return Buffer.from(headers, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendWelcomeEmail(params: {
  to: string;
  fullName: string;
  email: string;
  password: string;
  plan?: string | null;
  planStart?: string | null;
  planEnd?: string | null;
}) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_MAIL_API_KEY = process.env.GOOGLE_MAIL_API_KEY;
  if (!LOVABLE_API_KEY || !GOOGLE_MAIL_API_KEY) {
    console.warn("[welcome-email] Gmail não configurado, pulando envio");
    return { sent: false, reason: "not_configured" };
  }

  const fmt = (d?: string | null) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
  };

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <h1 style="font-size:22px;margin:0 0 16px;">Bem-vindo(a) à Franzen Team, ${params.fullName}!</h1>
      <p style="font-size:14px;line-height:1.6;">Seu acesso ao app foi criado. Use as credenciais abaixo para entrar:</p>
      <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;line-height:1.8;">
        <strong>E-mail:</strong> ${params.email}<br/>
        <strong>Senha:</strong> ${params.password}<br/>
        <strong>Plano:</strong> ${params.plan ?? "—"}<br/>
        <strong>Início:</strong> ${fmt(params.planStart)}<br/>
        <strong>Término:</strong> ${fmt(params.planEnd)}
      </div>
      <p style="font-size:14px;line-height:1.6;">Acesse o app e complete sua anamnese para liberar seu protocolo personalizado.</p>
      <p style="margin:24px 0;">
        <a href="${APP_URL}" style="background:#000;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-size:14px;">Acessar o app</a>
      </p>
      <p style="font-size:12px;color:#666;margin-top:24px;">Recomendamos alterar sua senha após o primeiro acesso.</p>
    </div>
  `;

  const raw = encodeRFC2822({
    to: params.to,
    subject: "Bem-vindo(a) à Franzen Team — seu acesso ao app",
    html,
  });

  const res = await fetch(`${GMAIL_GATEWAY}/users/me/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("[welcome-email] Gmail send falhou", res.status, txt);
    return { sent: false, reason: `gmail_${res.status}` };
  }
  return { sent: true };
}

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

    // Envio do e-mail de boas-vindas via Gmail do admin
    let emailResult: { sent: boolean; reason?: string } = { sent: false };
    try {
      emailResult = await sendWelcomeEmail({
        to: email,
        fullName: data.fullName.trim(),
        email,
        password: data.password,
        plan: data.plan,
        planStart: data.planStart,
        planEnd: data.planEnd,
      });
    } catch (e: any) {
      console.error("[adminCreateStudent] sendWelcomeEmail error", e?.message);
    }

    return {
      ok: true,
      userId: newUserId,
      credentials: { email, password: data.password },
      email: emailResult,
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

export const adminGetStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (error) throw new Error(error.message);
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("full_name, plan, plan_start, plan_end, account_status")
      .eq("user_id", data.userId)
      .maybeSingle();
    return {
      email: u.user?.email ?? null,
      fullName: prof?.full_name ?? null,
      plan: prof?.plan ?? null,
      planStart: prof?.plan_start ?? null,
      planEnd: prof?.plan_end ?? null,
      accountStatus: prof?.account_status ?? null,
    };
  });

export const adminUpdateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    userId: string;
    fullName?: string | null;
    email?: string | null;
    password?: string | null;
    plan?: string | null;
    planStart?: string | null;
    planEnd?: string | null;
  }) => data)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    if (!data.userId) throw new Error("userId obrigatório");

    const authUpdate: { email?: string; password?: string } = {};
    if (data.email && data.email.trim()) {
      const email = data.email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("E-mail inválido");
      authUpdate.email = email;
    }
    if (data.password && data.password.length > 0) {
      if (data.password.length < 6) throw new Error("Senha deve ter ao menos 6 caracteres");
      authUpdate.password = data.password;
    }
    if (Object.keys(authUpdate).length > 0) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        ...authUpdate,
        ...(authUpdate.email ? { email_confirm: true } : {}),
      } as any);
      if (error) throw new Error(error.message);
    }

    const profileUpdate: Record<string, any> = {};
    if (data.fullName !== undefined) profileUpdate.full_name = data.fullName?.trim() || null;
    if (data.plan !== undefined) profileUpdate.plan = data.plan || null;
    if (data.planStart !== undefined) profileUpdate.plan_start = data.planStart || null;
    if (data.planEnd !== undefined) profileUpdate.plan_end = data.planEnd || null;
    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdate as any)
        .eq("user_id", data.userId);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

export const adminDeleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    if (!data.userId) throw new Error("userId obrigatório");
    if (data.userId === context.userId) throw new Error("Você não pode excluir a si mesmo");

    // Limpeza de dados dependentes (best-effort; FKs sem cascade)
    const tables = [
      "notifications", "messages", "achievements", "challenge_participations",
      "checkins", "diet_feedback", "food_logs", "journal_entries",
      "monthly_analyses", "protocols", "share_links", "user_exams",
      "weekly_feedbacks", "workout_feedback", "workout_logs", "ai_analyses",
      "user_roles", "profiles",
    ];
    for (const t of tables) {
      const col = t === "messages" ? "recipient_id" : "user_id";
      await supabaseAdmin.from(t as any).delete().eq(col, data.userId);
      if (t === "messages") {
        await supabaseAdmin.from("messages").delete().eq("sender_id", data.userId);
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });