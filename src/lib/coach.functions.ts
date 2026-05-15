import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const coachChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ messages: z.array(MessageSchema).min(1).max(40) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: protocol }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("protocols").select("training, diet")
        .eq("user_id", userId).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-flash");

    const system = `Você é o coach virtual da Franzen Team — direto, prático e motivador.
Responda em português, de forma curta e objetiva (até 4 parágrafos).
Use o perfil e o protocolo ativo do atleta como referência.

PERFIL: ${JSON.stringify(profile ?? {})}
PROTOCOLO ATIVO (resumido): ${JSON.stringify({
      split: (protocol?.training as any)?.split,
      days_per_week: (protocol?.training as any)?.days_per_week,
      target_kcal: (protocol?.diet as any)?.target_kcal,
      target_protein_g: (protocol?.diet as any)?.target_protein_g,
    })}`;

    const { text } = await generateText({
      model,
      system,
      messages: data.messages,
    });

    return { reply: text };
  });
