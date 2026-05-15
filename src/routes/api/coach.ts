import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(1500),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(30),
});

export const Route = createFileRoute("/api/coach")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { data: userData, error: userErr } =
          await supabaseAdmin.auth.getUser(token);
        if (userErr || !userData.user) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = userData.user.id;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) {
          return new Response("Invalid input", { status: 400 });
        }

        const [{ data: profile }, { data: protocol }] = await Promise.all([
          supabaseAdmin
            .from("profiles")
            .select(
              "full_name, age, sex, weight, height, goal, activity_level, training_days, experience, injuries, allergies, supplements, sleep_hours, stress_level"
            )
            .eq("user_id", userId)
            .maybeSingle(),
          supabaseAdmin
            .from("protocols")
            .select("training, diet, start_date, end_date")
            .eq("user_id", userId)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("LOVABLE_API_KEY ausente", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-2.5-flash");

        const trainingSummary = {
          split: (protocol?.training as any)?.split,
          days_per_week: (protocol?.training as any)?.days_per_week,
          notes: (protocol?.training as any)?.notes,
        };
        const dietSummary = {
          target_kcal: (protocol?.diet as any)?.target_kcal,
          target_protein_g: (protocol?.diet as any)?.target_protein_g,
          target_carbs_g: (protocol?.diet as any)?.target_carbs_g,
          target_fat_g: (protocol?.diet as any)?.target_fat_g,
          meals: (protocol?.diet as any)?.meals?.length,
        };

        const system = `Você é o coach virtual da Franzen Team — direto, prático e motivador.

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em português, de forma curta e objetiva (máx. 4 parágrafos).
- Atenha-se EXCLUSIVAMENTE ao protocolo ativo do atleta (treino, dieta, descanso, suplementação, check-in, lesões).
- NÃO recomende medicamentos, hormônios, anabolizantes, drogas, dietas extremas (<1200 kcal), jejuns prolongados não previstos no protocolo, nem mude macros/treino sem orientar o atleta a falar com o coach humano.
- Se a pergunta for fora do escopo (política, médica clínica, finanças, opinião pessoal etc.), recuse educadamente e redirecione ao protocolo.
- Se o usuário pedir mudanças estruturais no protocolo, oriente a registrar feedback ou contatar o coach humano.
- Nunca invente números do protocolo: se o dado não estiver abaixo, diga que não há protocolo ativo.

PERFIL: ${JSON.stringify(profile ?? {})}
PROTOCOLO ATIVO: treino=${JSON.stringify(trainingSummary)} dieta=${JSON.stringify(dietSummary)} periodo=${protocol?.start_date ?? "?"}→${protocol?.end_date ?? "?"}`;

        const result = streamText({
          model,
          system,
          messages: parsed.data.messages,
          maxOutputTokens: 600,
          abortSignal: request.signal,
        });

        return result.toTextStreamResponse({
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});