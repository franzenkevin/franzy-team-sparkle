import { supabase } from "@/integrations/supabase/client";
import { notify } from "./notifications";

export type AchievementCode =
  | "first_checkin"
  | "first_workout"
  | "10_workouts"
  | "30_workouts"
  | "streak_7"
  | "streak_30"
  | "first_share";

export const ACHIEVEMENTS: Record<AchievementCode, { title: string; description: string; icon: string }> = {
  first_checkin: { title: "Primeiro check-in", description: "Você registrou seu primeiro check-in.", icon: "🎯" },
  first_workout: { title: "Primeiro treino", description: "Bem-vindo ao time. Continue assim!", icon: "💪" },
  "10_workouts": { title: "10 treinos", description: "Consistência começa a aparecer.", icon: "🔥" },
  "30_workouts": { title: "30 treinos", description: "Disciplina de elite.", icon: "🏆" },
  streak_7: { title: "7 dias seguidos", description: "Uma semana sem falhar.", icon: "⚡" },
  streak_30: { title: "30 dias seguidos", description: "Mentalidade vencedora.", icon: "👑" },
  first_share: { title: "Compartilhou progresso", description: "Mostrou sua evolução pro mundo.", icon: "📣" },
};

async function unlock(userId: string, code: AchievementCode) {
  const { data: existing } = await supabase
    .from("achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("code", code)
    .maybeSingle();
  if (existing) return false;
  const { error } = await supabase
    .from("achievements")
    .insert({ user_id: userId, code });
  if (error) {
    if (!error.message?.includes("duplicate")) console.error(error);
    return false;
  }
  const meta = ACHIEVEMENTS[code];
  await notify({
    userId,
    type: "achievement_unlocked",
    title: `${meta.icon} ${meta.title}`,
    body: meta.description,
    link: "/dashboard",
  });
  return true;
}

/** Calculate current streak (consecutive days with at least one workout log). */
export async function computeStreak(userId: string): Promise<number> {
  const { data } = await supabase
    .from("workout_logs")
    .select("session_date")
    .eq("user_id", userId)
    .order("session_date", { ascending: false })
    .limit(365);
  const dates = new Set((data ?? []).map((r) => r.session_date as string));
  let streak = 0;
  const cur = new Date();
  for (let i = 0; i < 365; i++) {
    const iso = cur.toISOString().slice(0, 10);
    if (dates.has(iso)) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else if (i === 0) {
      // allow today missing — start from yesterday
      cur.setDate(cur.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Run after a workout log save. Unlocks workout-based achievements. */
export async function evaluateWorkoutAchievements(userId: string) {
  const { count } = await supabase
    .from("workout_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const total = count ?? 0;
  if (total >= 1) await unlock(userId, "first_workout");
  if (total >= 10) await unlock(userId, "10_workouts");
  if (total >= 30) await unlock(userId, "30_workouts");
  const streak = await computeStreak(userId);
  if (streak >= 7) await unlock(userId, "streak_7");
  if (streak >= 30) await unlock(userId, "streak_30");
  return { total, streak };
}

/** Run after a check-in save. */
export async function evaluateCheckinAchievements(userId: string) {
  const { count } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((count ?? 0) >= 1) await unlock(userId, "first_checkin");
}

export async function unlockShareAchievement(userId: string) {
  await unlock(userId, "first_share");
}