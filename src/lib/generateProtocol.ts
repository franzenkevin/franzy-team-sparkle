/**
 * Fallback rule-based: usado quando a IA falha.
 * Adaptado da metodologia Hypertrophy.
 */
import { SPLITS_MEN, SPLITS_WOMEN, getSetScheme, type SplitVariant } from "./workoutRules";

export type ProfileLike = {
  full_name?: string | null;
  sex?: string | null;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  goal?: string | null;
  activity_level?: string | null;
  experience?: string | null;
  gym_type?: string | null;
  training_days?: number | null;
  training_weekdays?: string[] | null;
  training_time?: string | null;
  meal_count?: number | null;
  preferred_foods?: string[] | null;
  disliked_foods?: string | null;
  allergies?: string | null;
  supplements?: string[] | null;
  sweet_preference?: string | null;
  cardio_enabled?: boolean | null;
  cardio_frequency?: string | null;
  cardio_duration?: string | null;
  cardio_timing?: string | null;
  cardio_type_preference?: string | null;
  free_meals?: string | null;
};

const WEEKDAY_ORDER: Record<string, number> = {
  Domingo: 0, Segunda: 1, Terça: 2, Quarta: 3, Quinta: 4, Sexta: 5, Sábado: 6,
};

type ExDef = { name: string; primary: string; accessory?: string; rest: string };

const EX_BANK: Record<string, ExDef[]> = {
  inferior: [
    { name: "Agachamento livre", primary: "quadriceps", accessory: "gluteo", rest: "120s" },
    { name: "Leg press 45°", primary: "quadriceps", accessory: "gluteo", rest: "90s" },
    { name: "Cadeira extensora", primary: "quadriceps", rest: "60s" },
    { name: "Stiff", primary: "posterior_coxa", accessory: "gluteo", rest: "90s" },
    { name: "Mesa flexora", primary: "posterior_coxa", rest: "60s" },
    { name: "Elevação pélvica com barra", primary: "gluteo", accessory: "posterior_coxa", rest: "90s" },
    { name: "Cadeira abdutora", primary: "gluteo", rest: "45s" },
    { name: "Panturrilha em pé", primary: "panturrilha", rest: "45s" },
  ],
  inferior_posterior: [
    { name: "Stiff", primary: "posterior_coxa", accessory: "gluteo", rest: "90s" },
    { name: "Mesa flexora", primary: "posterior_coxa", rest: "60s" },
    { name: "Elevação pélvica com barra", primary: "gluteo", accessory: "posterior_coxa", rest: "90s" },
    { name: "Cadeira flexora unilateral", primary: "posterior_coxa", rest: "60s" },
    { name: "Panturrilha sentado", primary: "panturrilha", rest: "45s" },
  ],
  superior: [
    { name: "Puxada frontal", primary: "costas", accessory: "biceps", rest: "75s" },
    { name: "Remada sentada", primary: "costas", accessory: "biceps", rest: "75s" },
    { name: "Desenvolvimento com halteres", primary: "deltoide_frontal", accessory: "triceps", rest: "75s" },
    { name: "Elevação lateral", primary: "deltoide_lateral", rest: "45s" },
    { name: "Crucifixo invertido", primary: "deltoide_posterior", rest: "45s" },
    { name: "Tríceps pulley corda", primary: "triceps", rest: "60s" },
    { name: "Rosca direta", primary: "biceps", rest: "60s" },
  ],
  superior_gluteo: [
    { name: "Puxada frontal", primary: "costas", accessory: "biceps", rest: "75s" },
    { name: "Remada sentada", primary: "costas", accessory: "biceps", rest: "75s" },
    { name: "Elevação lateral", primary: "deltoide_lateral", rest: "45s" },
    { name: "Crucifixo invertido", primary: "deltoide_posterior", rest: "45s" },
    { name: "Tríceps pulley corda", primary: "triceps", rest: "60s" },
    { name: "Rosca direta", primary: "biceps", rest: "60s" },
    { name: "Coice na polia", primary: "gluteo", rest: "45s" },
    { name: "Abdução em pé na polia", primary: "gluteo", rest: "45s" },
  ],
  push: [
    { name: "Supino reto com barra", primary: "peito", accessory: "deltoide_frontal", rest: "120s" },
    { name: "Supino inclinado halteres", primary: "peito", accessory: "deltoide_frontal", rest: "90s" },
    { name: "Crucifixo máquina", primary: "peito", rest: "60s" },
    { name: "Desenvolvimento com halteres", primary: "deltoide_frontal", accessory: "triceps", rest: "90s" },
    { name: "Elevação lateral", primary: "deltoide_lateral", rest: "45s" },
    { name: "Tríceps testa barra EZ", primary: "triceps", rest: "60s" },
    { name: "Tríceps pulley corda", primary: "triceps", rest: "60s" },
  ],
  pull: [
    { name: "Puxada frontal", primary: "costas", accessory: "biceps", rest: "90s" },
    { name: "Remada curvada", primary: "costas", accessory: "biceps", rest: "90s" },
    { name: "Remada unilateral halteres", primary: "costas", accessory: "biceps", rest: "75s" },
    { name: "Pulldown corda", primary: "costas", rest: "60s" },
    { name: "Crucifixo invertido", primary: "deltoide_posterior", rest: "45s" },
    { name: "Rosca direta barra", primary: "biceps", rest: "60s" },
    { name: "Rosca martelo", primary: "biceps", rest: "60s" },
  ],
  legs: [
    { name: "Agachamento livre", primary: "quadriceps", accessory: "gluteo", rest: "120s" },
    { name: "Leg press 45°", primary: "quadriceps", accessory: "gluteo", rest: "90s" },
    { name: "Cadeira extensora", primary: "quadriceps", rest: "60s" },
    { name: "Stiff", primary: "posterior_coxa", accessory: "gluteo", rest: "90s" },
    { name: "Mesa flexora", primary: "posterior_coxa", rest: "60s" },
    { name: "Panturrilha em pé", primary: "panturrilha", rest: "45s" },
    { name: "Abdominal infra", primary: "abdomen", rest: "45s" },
  ],
  upper: [
    { name: "Supino inclinado halteres", primary: "peito", accessory: "deltoide_frontal", rest: "90s" },
    { name: "Puxada frontal", primary: "costas", accessory: "biceps", rest: "90s" },
    { name: "Remada sentada", primary: "costas", accessory: "biceps", rest: "75s" },
    { name: "Desenvolvimento máquina", primary: "deltoide_frontal", accessory: "triceps", rest: "75s" },
    { name: "Elevação lateral", primary: "deltoide_lateral", rest: "45s" },
    { name: "Tríceps pulley corda", primary: "triceps", rest: "60s" },
    { name: "Rosca direta", primary: "biceps", rest: "60s" },
  ],
  fullbody_women: [
    { name: "Agachamento livre", primary: "quadriceps", accessory: "gluteo", rest: "120s" },
    { name: "Elevação pélvica com barra", primary: "gluteo", accessory: "posterior_coxa", rest: "90s" },
    { name: "Stiff", primary: "posterior_coxa", accessory: "gluteo", rest: "90s" },
    { name: "Cadeira abdutora", primary: "gluteo", rest: "45s" },
    { name: "Panturrilha em pé", primary: "panturrilha", rest: "45s" },
    { name: "Puxada frontal", primary: "costas", accessory: "biceps", rest: "75s" },
    { name: "Desenvolvimento halteres", primary: "deltoide_frontal", accessory: "triceps", rest: "75s" },
  ],
  fullbody_men: [
    { name: "Agachamento livre", primary: "quadriceps", accessory: "gluteo", rest: "120s" },
    { name: "Supino reto com barra", primary: "peito", accessory: "deltoide_frontal", rest: "120s" },
    { name: "Remada curvada", primary: "costas", accessory: "biceps", rest: "90s" },
    { name: "Stiff", primary: "posterior_coxa", accessory: "gluteo", rest: "90s" },
    { name: "Desenvolvimento com halteres", primary: "deltoide_frontal", accessory: "triceps", rest: "75s" },
    { name: "Rosca direta", primary: "biceps", rest: "60s" },
    { name: "Tríceps pulley corda", primary: "triceps", rest: "60s" },
  ],
  complemento: [
    { name: "Cardio LISS (30-40min, 60-70% FCmax)", primary: "abdomen", rest: "0s" },
    { name: "Abdominal infra", primary: "abdomen", rest: "45s" },
    { name: "Prancha", primary: "abdomen", rest: "30s" },
  ],
};

function focusKey(focus: string, sex: "M" | "F"): keyof typeof EX_BANK {
  const f = focus.toLowerCase();
  if (f.includes("full body")) return sex === "F" ? "fullbody_women" : "fullbody_men";
  if (f.includes("posterior")) return "inferior_posterior";
  if (f.includes("glúteo isolado") || f.includes("gluteo isolado")) return "superior_gluteo";
  if (f.includes("inferior")) return "inferior";
  if (f.includes("superior")) return "superior";
  if (f.includes("push")) return "push";
  if (f.includes("pull")) return "pull";
  if (f.includes("legs") || f.includes("lower")) return "legs";
  if (f.includes("upper")) return "upper";
  if (f.includes("cardio") || f.includes("complemento")) return "complemento";
  return sex === "F" ? "superior" : "upper";
}

function pickSplitVariant(sex: "M" | "F", days: number): SplitVariant {
  const table = sex === "F" ? SPLITS_WOMEN : SPLITS_MEN;
  const variants = table[days] || table[4] || table[3];
  return variants.find((v) => v.defaultChoice) || variants[0];
}

function generateTraining(p: ProfileLike) {
  const sex: "M" | "F" = p.sex === "F" ? "F" : "M";
  const days = Math.max(2, Math.min(7, p.training_days || 4));
  const weekdays = p.training_weekdays || [];
  const sortedWeekdays = [...weekdays].sort(
    (a, b) => (WEEKDAY_ORDER[a] ?? 0) - (WEEKDAY_ORDER[b] ?? 0)
  );
  const variant = pickSplitVariant(sex, days);
  const { scheme, level } = getSetScheme(p.experience);
  const targetEx = level === "advanced" ? 7 : 6;
  const cardioEnabled = p.cardio_enabled !== false && !!p.cardio_enabled;
  const cardioFreq = (p.cardio_frequency || "").toLowerCase();
  const numCardioDays = cardioEnabled
    ? cardioFreq.includes("todo") ? days
    : cardioFreq.includes("5") ? 5 : cardioFreq.includes("4") ? 4
    : cardioFreq.includes("3") ? 3 : cardioFreq.includes("2") ? 2
    : cardioFreq.includes("1") ? 1 : Math.ceil(days / 2)
    : 0;

  const daysOut = variant.days.map((dayDef, i) => {
    const weekday = sortedWeekdays[i] || "";
    const list = EX_BANK[focusKey(dayDef.focus, sex)] || [];
    const exercises = list.slice(0, targetEx).map((ex, j) => ({
      id: `${i}-${j}`,
      name: ex.name,
      sets: scheme.validSets.length,
      reps: `${scheme.validSets.length} séries válidas de ${scheme.repsLabel} reps (última na falha)`,
      rest: ex.rest,
      technique: "standard",
      primaryMuscle: ex.primary,
      accessoryMuscle: ex.accessory || null,
      videoQuery: `${ex.name} execução correta`,
      done: false,
    }));
    const cardio = cardioEnabled && i < numCardioDays
      ? {
          modality: p.cardio_type_preference || "Esteira (caminhada inclinada)",
          duration: p.cardio_duration || "20-30min",
          intensity: "65-75% FCmax",
          when: p.cardio_timing || "após o treino",
        }
      : null;
    return {
      name: `${dayDef.code} — ${dayDef.focus}`,
      weekday,
      code: dayDef.code,
      focus: dayDef.focus,
      muscleGroup: dayDef.focus,
      exercises,
      cardio,
      mobility: [],
      dynamicNotes: `${scheme.description} ${scheme.progressionRule}`,
    };
  });

  return {
    split: variant.name,
    days_per_week: days,
    days: daysOut,
    level,
    notes: `Fallback rule-based. ${scheme.description}`,
  };
}

// ==================== DIET ====================

function generateDiet(p: ProfileLike) {
  const weight = p.weight || 75;
  const sex = p.sex === "F" ? "F" : "M";
  const goal = (p.goal || "").toLowerCase();
  const activity = (p.activity_level || "Moderadamente ativo");
  const bmr = sex === "M" ? weight * 22 : weight * 20;
  const actMap: Record<string, number> = {
    "Sedentário": 1.15, "Levemente ativo": 1.25,
    "Moderadamente ativo": 1.35, "Muito ativo": 1.45, "Extremamente ativo": 1.5,
  };
  let tdee = Math.round(bmr * (actMap[activity] ?? 1.35));
  if (goal.includes("emagre") || goal.includes("defini")) tdee -= 500;
  else if (goal.includes("hipertrofia") || goal.includes("ganho")) tdee += 200;
  else tdee -= 100;

  const protein_g = Math.round(weight * 2);
  const fat_g = Math.round(weight * 0.8);
  const carbs_g = Math.max(50, Math.round((tdee - protein_g * 4 - fat_g * 9) / 4));

  const mealCount = p.meal_count || 4;
  const slots: { name: string; time: string }[] =
    mealCount === 3
      ? [{ name: "Café da manhã", time: "07:00" }, { name: "Almoço", time: "12:00" }, { name: "Jantar", time: "20:00" }]
      : mealCount === 5
      ? [{ name: "Café da manhã", time: "07:00" }, { name: "Lanche da manhã", time: "10:00" }, { name: "Almoço", time: "12:30" }, { name: "Lanche da tarde", time: "16:00" }, { name: "Jantar", time: "20:00" }]
      : [{ name: "Café da manhã", time: "07:00" }, { name: "Almoço", time: "12:30" }, { name: "Lanche da tarde", time: "16:00" }, { name: "Jantar", time: "20:00" }];

  const kcalPerMeal = Math.round(tdee / slots.length);
  const protPerMeal = Math.round(protein_g / slots.length);
  const carbPerMeal = Math.round(carbs_g / slots.length);
  const fatPerMeal = Math.round(fat_g / slots.length);

  const meals = slots.map((s) => ({
    name: s.name,
    time: s.time,
    items: s.name.includes("Café") || s.name.includes("Lanche")
      ? [
          { food: "Pão integral / tapioca", amount: "60g" },
          { food: "Ovo / whey", amount: s.name.includes("Lanche") ? "1 scoop whey (30g)" : "2 unidades" },
          { food: "Fruta", amount: "150g" },
        ]
      : [
          { food: "Arroz / batata-doce", amount: "150g cozido" },
          { food: "Feijão", amount: "100g" },
          { food: "Proteína (frango / carne / peixe)", amount: "180g" },
          { food: "Vegetais à vontade", amount: "—" },
        ],
    macros: { kcal: kcalPerMeal, protein_g: protPerMeal, carbs_g: carbPerMeal, fat_g: fatPerMeal },
  }));

  const notes: string[] = [
    "Multivitamínico: 1 dose/dia com refeição.",
    "Vitamina D 4000 UI/dia com refeição gordurosa.",
    "Creatina 5g/dia em qualquer horário.",
  ];
  if (p.supplements?.includes("Whey Protein"))
    notes.push("Whey Protein: 1 scoop pós-treino ou como complemento de macros.");

  return {
    target_kcal: tdee,
    target_protein_g: protein_g,
    target_carbs_g: carbs_g,
    target_fat_g: fat_g,
    totalCalories: tdee, // compat
    protein: protein_g,
    carbs: carbs_g,
    fat: fat_g,
    meals,
    notes,
  };
}

export function generateProtocol(profile: ProfileLike) {
  return {
    training: generateTraining(profile),
    diet: generateDiet(profile),
    summary: "Protocolo gerado pelo fallback rule-based (metodologia oficial Hypertrophy).",
  };
}