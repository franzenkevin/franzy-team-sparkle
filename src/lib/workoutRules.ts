/**
 * METODOLOGIA OFICIAL HYPERTROPHY — Regras de prescrição de treino
 * Fonte única usada pelo prompt da IA e pelo fallback rule-based local.
 */

export const WEEKLY_VOLUME_MEN: Record<string, [number, number]> = {
  peito: [9, 20], costas: [12, 24], deltoide_frontal: [9, 12],
  deltoide_lateral: [9, 16], deltoide_posterior: [9, 12],
  biceps: [9, 12], triceps: [9, 12], trapezio: [4, 8], antebraco: [0, 8],
  abdomen: [8, 12], quadriceps: [9, 24], posterior_coxa: [9, 20],
  gluteo: [6, 16], panturrilha: [4, 16],
};

export const WEEKLY_VOLUME_WOMEN: Record<string, [number, number]> = {
  peito: [2, 4], costas: [9, 20], deltoide_frontal: [2, 6],
  deltoide_lateral: [4, 12], deltoide_posterior: [2, 6],
  biceps: [4, 8], triceps: [4, 8], trapezio: [0, 4], antebraco: [0, 4],
  abdomen: [8, 12], quadriceps: [9, 24], posterior_coxa: [9, 20],
  gluteo: [9, 20], panturrilha: [4, 16],
};

export type SplitVariant = {
  name: string;
  days: { code: string; focus: string; notes?: string }[];
  schedulingRules: string[];
  defaultChoice?: boolean;
};

export const SPLITS_WOMEN: Record<number, SplitVariant[]> = {
  2: [{
    name: "FB-A + FB-B com ênfase inferior (2x — DOIS fullbodies DIFERENTES)",
    days: [
      { code: "A", focus: "Full Body A — ênfase QUADRÍCEPS + GLÚTEO MÉDIO; inclui 1 push, 1 pull e core. Exercícios DIFERENTES do dia B." },
      { code: "B", focus: "Full Body B — ênfase POSTERIOR + GLÚTEO MÁXIMO; inclui 1 push, 1 pull e core. Exercícios DIFERENTES do dia A." },
    ],
    schedulingRules: ["NÃO pode em dias seguidos", "A e B devem ser fullbodies DIFERENTES"],
    defaultChoice: true,
  }],
  3: [
    { name: "FB-FB-FB com ênfase inferior (3x)", days: [
      { code: "A", focus: "Full Body — ênfase inferior (glúteo + quad)" },
      { code: "B", focus: "Full Body — ênfase inferior (posterior + glúteo)" },
      { code: "C", focus: "Full Body — ênfase inferior (glúteo médio + quad)" },
    ], schedulingRules: ["NÃO em dias seguidos"], defaultChoice: true },
    { name: "Inf(quad)-Sup-Inf(post+glúteo) (3x)", days: [
      { code: "A", focus: "Inferior — ênfase QUADRÍCEPS" },
      { code: "B", focus: "Superior" },
      { code: "C", focus: "Inferior — ênfase POSTERIOR + GLÚTEO" },
    ], schedulingRules: [] },
  ],
  4: [
    { name: "Inf-Sup-Inf-Sup (4x — divisão mais comum)", days: [
      { code: "A", focus: "Inferior" }, { code: "B", focus: "Superior" },
      { code: "C", focus: "Inferior" }, { code: "D", focus: "Superior" },
    ], schedulingRules: ["Independe dos dias treinados"], defaultChoice: true },
    { name: "Inf-Sup-Inf(post)-Sup+gluteo (4x)", days: [
      { code: "A", focus: "Inferior" }, { code: "B", focus: "Superior" },
      { code: "C", focus: "Inferior — ênfase POSTERIOR" },
      { code: "D", focus: "Superior + glúteo isolado" },
    ], schedulingRules: ["Cuidar para C não atrapalhar D"] },
  ],
  5: [
    { name: "Inf-Sup-Inf-Sup-Inf (5x — alternado)", days: [
      { code: "A", focus: "Inferior" }, { code: "B", focus: "Superior" },
      { code: "C", focus: "Inferior" }, { code: "D", focus: "Superior" },
      { code: "E", focus: "Inferior" },
    ], schedulingRules: [], defaultChoice: true },
    { name: "Inf-Sup-Inf-OFF-Inf-Sup (5x com folga no meio)", days: [
      { code: "A", focus: "Inferior" }, { code: "B", focus: "Superior" },
      { code: "C", focus: "Inferior" }, { code: "D", focus: "Inferior (após OFF)" },
      { code: "E", focus: "Superior" },
    ], schedulingRules: ["1 dia OFF obrigatório entre C e D"] },
  ],
  6: [{ name: "Inf-Sup-Inf-Sup-Inf-Sup (6x — alternado)", days: [
    { code: "A", focus: "Inferior" }, { code: "B", focus: "Superior" },
    { code: "C", focus: "Inferior" }, { code: "D", focus: "Superior" },
    { code: "E", focus: "Inferior" }, { code: "F", focus: "Superior" },
  ], schedulingRules: ["Volume alto"], defaultChoice: true }],
  7: [{ name: "5x + 2 complementos", days: [
    { code: "A", focus: "Inferior" }, { code: "B", focus: "Superior" },
    { code: "C", focus: "Inferior" }, { code: "D", focus: "Superior" },
    { code: "E", focus: "Inferior" }, { code: "F", focus: "Cardio + abdômen" },
    { code: "G", focus: "Cardio leve + mobilidade" },
  ], schedulingRules: [], defaultChoice: true }],
};

export const SPLITS_MEN: Record<number, SplitVariant[]> = {
  2: [{ name: "FB-A + FB-B (2x — DOIS fullbodies DIFERENTES)", days: [
    { code: "A", focus: "Full Body A — agachamento como principal + push horizontal + pull vertical + posterior auxiliar + core" },
    { code: "B", focus: "Full Body B — terra/posterior como principal + push vertical + pull horizontal + quad auxiliar + core" },
  ], schedulingRules: ["≥2 dias de descanso entre eles"], defaultChoice: true }],
  3: [
    { name: "Push-Pull-Legs (PPL 3x)", days: [
      { code: "A", focus: "Push (peito + ombros + tríceps)" },
      { code: "B", focus: "Pull (costas + bíceps)" },
      { code: "C", focus: "Legs (perna completa)" },
    ], schedulingRules: [], defaultChoice: true },
    { name: "FB-FB-FB (Full Body 3x)", days: [
      { code: "A", focus: "Full Body" }, { code: "B", focus: "Full Body" },
      { code: "C", focus: "Full Body" },
    ], schedulingRules: ["Descanso entre eles"] },
  ],
  4: [
    { name: "Upper-Lower (4x)", days: [
      { code: "A", focus: "Upper" }, { code: "B", focus: "Lower" },
      { code: "C", focus: "Upper" }, { code: "D", focus: "Lower" },
    ], schedulingRules: ["Padrão 2 on + 1 off + 2 on"], defaultChoice: true },
    { name: "Push-Pull-Legs-Upper (4x)", days: [
      { code: "A", focus: "Push" }, { code: "B", focus: "Pull" },
      { code: "C", focus: "Legs" }, { code: "D", focus: "Upper" },
    ], schedulingRules: [] },
  ],
  5: [
    { name: "Legs-Push-Pull-Legs-Upper (5x)", days: [
      { code: "A", focus: "Legs" }, { code: "B", focus: "Push" },
      { code: "C", focus: "Pull" }, { code: "D", focus: "Legs" },
      { code: "E", focus: "Upper" },
    ], schedulingRules: [], defaultChoice: true },
    { name: "Push1-Pull1-Legs-Push2-Pull2 (5x)", days: [
      { code: "A", focus: "Push 1 (peito)" }, { code: "B", focus: "Pull 1 (largura)" },
      { code: "C", focus: "Legs" }, { code: "D", focus: "Push 2 (ombro/tríceps)" },
      { code: "E", focus: "Pull 2 (espessura + bíceps)" },
    ], schedulingRules: [] },
  ],
  6: [{ name: "Push1-Pull1-Legs1-Push2-Pull2-Legs2 (PPL x2 — 6x)", days: [
    { code: "A", focus: "Push 1 (peito)" }, { code: "B", focus: "Pull 1 (largura)" },
    { code: "C", focus: "Legs 1 (quadríceps)" }, { code: "D", focus: "Push 2 (ombro)" },
    { code: "E", focus: "Pull 2 (espessura)" }, { code: "F", focus: "Legs 2 (posterior+glúteo)" },
  ], schedulingRules: ["Volume alto — só para avançados"], defaultChoice: true }],
};

export type SetScheme = {
  repsLabel: string;
  warmups: { percent: number; reps: string; note: string }[];
  validSets: { reps: string; effort: string; note: string }[];
  description: string;
  progressionRule: string;
};

export const SET_SCHEME_STANDARD: SetScheme = {
  repsLabel: "8-12",
  warmups: [
    { percent: 50, reps: "12", note: "Aquecimento 1 — ativação leve. Pode pular se já estiver bem aquecido." },
    { percent: 75, reps: "5-8", note: "Aquecimento 2 — preparação neural" },
  ],
  validSets: [
    { reps: "8-12", effort: "RIR 1-2", note: "Válida — RIR 1-2" },
    { reps: "8-12", effort: "RIR 1-2", note: "Válida — RIR 1-2" },
    { reps: "falha", effort: "FALHA TOTAL", note: "Última — falha total" },
  ],
  description: "Padrão: 2 aquecimentos (50% + 75%) + 1 a 3 séries válidas (última SEMPRE falha total). Zonas permitidas: 5-9, 6-10, 8-12, 10-15.",
  progressionRule: "Olhe a série de FALHA: passou do TOPO → SUBIR carga; abaixo do PISO → REDUZIR; dentro da zona → +1 rep/sem até o topo.",
};

export function getSetScheme(experience: string | null | undefined): {
  scheme: SetScheme;
  level: "beginner" | "intermediate" | "advanced";
} {
  const exp = (experience || "").toLowerCase();
  const level: "beginner" | "intermediate" | "advanced" =
    exp.includes("iniciante") ? "beginner"
    : exp.includes("avançado") || exp.includes("avancado") ? "advanced"
    : "intermediate";
  const validSets = level === "advanced"
    ? SET_SCHEME_STANDARD.validSets
    : [
        { reps: "8-12", effort: "RIR 1-2", note: "Válida 1 — RIR 1-2" },
        { reps: "falha", effort: "FALHA TOTAL", note: "Válida 2 — falha total" },
      ];
  return { scheme: { ...SET_SCHEME_STANDARD, validSets }, level };
}

export type AdvancedTechnique = "standard" | "backoffset" | "peak_contraction" | "cluster_set" | "bi_set";

export const VOLUME_COUNT_RULE = `
REGRA DE CONTAGEM DE VOLUME (semanal por músculo):
- 1 série = 1.0 para músculo PRINCIPAL + 0.5 para ACESSÓRIO
- Aquecimentos NÃO contam. Backoffset NÃO conta. Cluster set conta como 1.
Exemplos: Supino reto 3 séries → 3.0 peito + 1.5 deltoide frontal + 1.5 tríceps.
Puxada 3 séries → 3.0 costas + 1.5 bíceps. Agachamento 3 séries → 3.0 quad + 1.5 glúteo + 0.5 posterior.`;

export function getMethodologyPromptSection(sex: "M" | "F"): string {
  const isWoman = sex === "F";
  const splits = isWoman ? SPLITS_WOMEN : SPLITS_MEN;
  const volumes = isWoman ? WEEKLY_VOLUME_WOMEN : WEEKLY_VOLUME_MEN;
  let splitsTxt = "";
  for (const [days, variants] of Object.entries(splits)) {
    splitsTxt += `\n### ${days}x na semana:\n`;
    variants.forEach((v, i) => {
      splitsTxt += `${i + 1}. **${v.name}**${v.defaultChoice ? " ⭐ (padrão)" : ""}\n`;
      v.days.forEach((d) => { splitsTxt += `   - ${d.code}: ${d.focus}\n`; });
      if (v.schedulingRules.length) splitsTxt += `   Regras: ${v.schedulingRules.join(" | ")}\n`;
    });
  }
  let volumeTxt = "\n### Volume semanal alvo (séries válidas/semana):\n";
  for (const [muscle, [min, max]] of Object.entries(volumes)) {
    volumeTxt += `- ${muscle.replace(/_/g, " ")}: ${min}-${max} séries\n`;
  }
  return `\n## METODOLOGIA OFICIAL — DIVISÕES PARA ${isWoman ? "MULHERES" : "HOMENS"}\n${splitsTxt}\n${volumeTxt}\n${VOLUME_COUNT_RULE}`;
}