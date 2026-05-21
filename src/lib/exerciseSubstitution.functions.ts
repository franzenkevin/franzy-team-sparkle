import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { extractJsonFromResponse } from "./ai-json";

const SubInput = z.object({
  exerciseId: z.string().min(1).max(64),
  exerciseName: z.string().min(1).max(200),
  reason: z.string().max(500).optional(),
});

export const suggestExerciseSubstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SubInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Source exercise context (lookup by name; id may not exist in catalog)
    const { data: src } = await supabase
      .from("exercises")
      .select("id, name, category, equipment, instructions")
      .ilike("name", data.exerciseName)
      .limit(1)
      .maybeSingle();

    // Candidate pool: same category if known; else broader sample
    let q = supabase
      .from("exercises")
      .select("id, name, category, equipment, instructions")
      .limit(60);
    if (src?.category) q = q.eq("category", src.category);
    const { data: candidates } = await q;

    const pool = (candidates ?? []).filter(
      (c) => c.name.toLowerCase() !== data.exerciseName.toLowerCase(),
    );

    if (pool.length === 0) {
      return { alt: null, rationale: "Sem alternativas cadastradas na mesma categoria." };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      const alt = pool[0];
      return {
        alt: { id: alt.id, name: alt.name, category: alt.category, equipment: alt.equipment },
        rationale: "Sugestão por categoria (IA indisponível).",
      };
    }

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-3-flash-preview");

    const system = `Você é um treinador de força e biomecânica. Sua tarefa é escolher a MELHOR substituição para um exercício de musculação considerando, em ordem de prioridade:
1) Padrão de movimento (vetor de força: horizontal/vertical, empurrar/puxar, agachamento/dobradiça de quadril).
2) Musculatura agonista e sinergista (mesmos grupos primários, mesma cabeça/região quando aplicável: ex. peitoral clavicular vs esternal, deltoide anterior/medial/posterior, isquiotibiais vs glúteo).
3) Amplitude articular e curva de resistência (ROM equivalente, pico de tensão na mesma porção do movimento).
4) Tipo de contração e estabilidade exigida (livre vs guiada, bilateral vs unilateral).
5) Equipamento DIFERENTE do original (o aluno está pedindo troca por NÃO TER o equipamento — nunca devolva o mesmo exercício com outro nome).

REGRAS ANTI-SINÔNIMO (CRÍTICO):
- NÃO devolva um candidato que seja apenas o MESMO exercício renomeado. Exemplos de sinônimos PROIBIDOS para troca:
  • "Pulldown com corda" ≡ "Pulôver na polia alta" ≡ "Straight-arm pulldown" — são o MESMO movimento (extensão de ombro com cotovelo travado).
  • "Remada baixa" ≡ "Remada sentado na polia".
  • "Cadeira extensora" ≡ "Extensão de joelho na máquina".
  • "Crucifixo invertido" ≡ "Voador invertido" ≡ "Reverse fly".
  • "Stiff" ≡ "RDL" ≡ "Romanian deadlift".
  • "Tríceps pulley barra" ≡ "Tríceps corda" (variação de pegada do mesmo padrão — só troque se o motivo for pegada/punho).
- Se TODOS os candidatos forem sinônimos, escolha o que muda o EQUIPAMENTO (livre↔máquina, cabo↔halter), nunca apenas o nome.
- Padrão de movimento DEVE ser preservado, mas o EXERCÍCIO deve ser claramente diferente em equipamento ou posicionamento.

Responda APENAS com JSON válido neste formato:
{"id":"<id do candidato>","rationale":"<frase curta em português explicando o porquê do match (vetor, músculos, amplitude) e por que NÃO é apenas sinônimo do original>"}`;

    const user = `Exercício original: ${src?.name ?? data.exerciseName}
Categoria: ${src?.category ?? "?"}
Equipamento: ${src?.equipment ?? "?"}
Instruções: ${src?.instructions ?? "—"}
Motivo da troca: ${data.reason ?? "Aluno não tem o equipamento."}

Candidatos (escolha UM pelo id):
${pool.map((c) => `- id=${c.id} | ${c.name} | cat=${c.category} | eq=${c.equipment ?? "—"}`).join("\n")}`;

    try {
      const { text } = await generateText({
        model,
        system,
        prompt: user,
        temperature: 0.2,
      });
      const parsed = extractJsonFromResponse(text) as { id?: string; rationale?: string };
      const picked = pool.find((c) => c.id === parsed.id) ?? pool[0];
      return {
        alt: { id: picked.id, name: picked.name, category: picked.category, equipment: picked.equipment },
        rationale: parsed.rationale ?? "Substituição equivalente em padrão de movimento e musculatura.",
      };
    } catch (e) {
      console.error("suggestExerciseSubstitution AI error", e);
      const alt = pool[0];
      return {
        alt: { id: alt.id, name: alt.name, category: alt.category, equipment: alt.equipment },
        rationale: "Sugestão por categoria (falha na IA).",
      };
    }
  });