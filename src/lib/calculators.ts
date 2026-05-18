// Calculadoras para uso do admin: TMB, GET, macros, %BF (Navy),
// projeção de peso e progressão de carga. Tudo em funções puras.

export type Sex = "M" | "F" | string | null | undefined;

function toNum(v: any): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Mifflin-St Jeor (kcal/dia) */
export function tmbMifflin(opts: { weightKg: number; heightCm: number; age: number; sex: Sex }): number {
  const base = 10 * opts.weightKg + 6.25 * opts.heightCm - 5 * opts.age;
  const isMale = String(opts.sex ?? "").toUpperCase().startsWith("M");
  return Math.round(base + (isMale ? 5 : -161));
}

export const ACTIVITY_FACTORS: Record<string, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  atleta: 1.9,
};

export function activityFactor(level: string | null | undefined): number {
  if (!level) return 1.55;
  const key = level.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ACTIVITY_FACTORS[key] ?? 1.55;
}

/** Gasto energético total estimado (kcal/dia) */
export function getKcal(tmb: number, factor: number): number {
  return Math.round(tmb * factor);
}

/** Aplica déficit/superávit em % (ex.: -20 = déficit de 20%) */
export function targetKcal(get: number, deltaPct: number): number {
  return Math.round(get * (1 + deltaPct / 100));
}

/** Macros em gramas com base em proteína (g/kg) e gordura (g/kg); resto = carbo */
export function macros(opts: {
  kcal: number;
  weightKg: number;
  proteinPerKg?: number; // default 2.0
  fatPerKg?: number;     // default 0.8
}) {
  const proteinG = Math.round((opts.proteinPerKg ?? 2.0) * opts.weightKg);
  const fatG = Math.round((opts.fatPerKg ?? 0.8) * opts.weightKg);
  const kcalFromPF = proteinG * 4 + fatG * 9;
  const carbsG = Math.max(0, Math.round((opts.kcal - kcalFromPF) / 4));
  return {
    proteinG, fatG, carbsG,
    kcal: proteinG * 4 + fatG * 9 + carbsG * 4,
    pctP: Math.round(((proteinG * 4) / opts.kcal) * 100),
    pctF: Math.round(((fatG * 9) / opts.kcal) * 100),
    pctC: Math.round(((carbsG * 4) / opts.kcal) * 100),
  };
}

/** US Navy body fat % — cm. Retorna null se faltar circunferência. */
export function navyBodyFat(opts: {
  sex: Sex;
  heightCm: number;
  neckCm?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
}): number | null {
  const neck = toNum(opts.neckCm);
  const waist = toNum(opts.waistCm);
  const height = toNum(opts.heightCm);
  if (!neck || !waist || !height) return null;
  const isMale = String(opts.sex ?? "").toUpperCase().startsWith("M");
  try {
    let bf: number;
    if (isMale) {
      bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    } else {
      const hip = toNum(opts.hipCm);
      if (!hip) return null;
      bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(height)) - 450;
    }
    if (!Number.isFinite(bf) || bf < 2 || bf > 60) return null;
    return Math.round(bf * 10) / 10;
  } catch { return null; }
}

/** Regressão linear simples (mínimos quadrados). */
export function linearRegression(points: Array<{ x: number; y: number }>) {
  const n = points.length;
  if (n < 2) return null;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/** Projeção de peso a partir de feedbacks semanais (até 8 semanas à frente). */
export function projectWeight(history: Array<{ week_start: string | null; weight: number | null }>, weeksAhead = 8) {
  const pts = history
    .map((h, i) => ({ x: i, y: toNum(h.weight) ?? NaN, week: h.week_start }))
    .filter((p) => Number.isFinite(p.y)) as Array<{ x: number; y: number; week: string | null }>;
  if (pts.length < 2) return null;
  // ordena por índice crescente (assumindo entrada já cronológica). Renormaliza x.
  const norm = pts.map((p, i) => ({ x: i, y: p.y }));
  const reg = linearRegression(norm);
  if (!reg) return null;
  const lastX = norm[norm.length - 1].x;
  const projection: Array<{ weekOffset: number; weight: number }> = [];
  for (let i = 1; i <= weeksAhead; i++) {
    projection.push({
      weekOffset: i,
      weight: Math.round((reg.intercept + reg.slope * (lastX + i)) * 10) / 10,
    });
  }
  return {
    slopePerWeek: Math.round(reg.slope * 100) / 100,
    projection,
    history: pts.map((p) => ({ weight: p.y, week: p.week })),
  };
}

/** Sugestão de progressão de carga por exercício a partir de workout_logs. */
export function progressionSuggestions(logs: Array<{ exercise_name: string; sets: any; session_date?: string | null }>) {
  const byEx = new Map<string, Array<{ topWeight: number; topReps: number; rpe: number | null; date: string | null }>>();
  for (const log of logs) {
    const sets = Array.isArray(log.sets) ? log.sets : [];
    if (!sets.length) continue;
    let topWeight = 0; let topReps = 0; let rpeSum = 0; let rpeN = 0;
    for (const s of sets) {
      const w = toNum((s as any)?.weight) ?? 0;
      const r = toNum((s as any)?.reps) ?? 0;
      const rpe = toNum((s as any)?.rpe);
      if (w * r > topWeight * topReps) { topWeight = w; topReps = r; }
      if (rpe != null) { rpeSum += rpe; rpeN++; }
    }
    const arr = byEx.get(log.exercise_name) ?? [];
    arr.push({ topWeight, topReps, rpe: rpeN ? rpeSum / rpeN : null, date: log.session_date ?? null });
    byEx.set(log.exercise_name, arr);
  }
  const out: Array<{
    exercise: string;
    lastWeight: number;
    lastReps: number;
    avgRpe: number | null;
    suggestion: string;
  }> = [];
  for (const [exercise, arr] of byEx) {
    const sorted = arr.slice(-4); // últimas 4 sessões
    const last = sorted[sorted.length - 1];
    const avgRpe = sorted.reduce((a, s) => a + (s.rpe ?? 0), 0) / (sorted.filter((s) => s.rpe != null).length || 1);
    const hasRpe = sorted.some((s) => s.rpe != null);
    let suggestion = "Manter carga";
    if (hasRpe) {
      if (avgRpe <= 7) suggestion = `Aumentar +2,5kg (RPE médio ${avgRpe.toFixed(1)})`;
      else if (avgRpe <= 8.5) suggestion = `Manter carga, adicionar +1 rep (RPE ${avgRpe.toFixed(1)})`;
      else suggestion = `Reduzir 5–10% ou deload (RPE ${avgRpe.toFixed(1)})`;
    } else if (sorted.length >= 2) {
      const prev = sorted[sorted.length - 2];
      if (last.topReps > prev.topReps) suggestion = "Subiu reps — tentar +2,5kg";
      else if (last.topReps < prev.topReps) suggestion = "Reps caíram — manter carga";
    }
    out.push({
      exercise,
      lastWeight: last.topWeight,
      lastReps: last.topReps,
      avgRpe: hasRpe ? Math.round(avgRpe * 10) / 10 : null,
      suggestion,
    });
  }
  return out.sort((a, b) => a.exercise.localeCompare(b.exercise));
}
