import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RankingRow = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  workouts: number;
  checkins: number;
  achievements: number;
  challenges: number;
  points: number;
};

const POINTS = { workout: 10, checkin: 25, achievement: 50, challenge: 100 };

export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const [profilesRes, workoutsRes, checkinsRes, achRes, challRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("user_id, full_name, avatar_url"),
    supabaseAdmin.from("workout_logs").select("user_id"),
    supabaseAdmin.from("checkins").select("user_id"),
    supabaseAdmin.from("achievements").select("user_id"),
    supabaseAdmin.from("challenge_participations").select("user_id, completed_at"),
  ]);

  const tally = new Map<string, RankingRow>();
  for (const p of profilesRes.data ?? []) {
    tally.set(p.user_id, {
      user_id: p.user_id,
      name: p.full_name ?? "Aluno",
      avatar_url: p.avatar_url ?? null,
      workouts: 0, checkins: 0, achievements: 0, challenges: 0, points: 0,
    });
  }
  const ensure = (uid: string) => {
    if (!tally.has(uid)) tally.set(uid, { user_id: uid, name: "Aluno", avatar_url: null, workouts: 0, checkins: 0, achievements: 0, challenges: 0, points: 0 });
    return tally.get(uid)!;
  };
  for (const r of workoutsRes.data ?? []) ensure(r.user_id).workouts++;
  for (const r of checkinsRes.data ?? []) ensure(r.user_id).checkins++;
  for (const r of achRes.data ?? []) ensure(r.user_id).achievements++;
  for (const r of challRes.data ?? []) if (r.completed_at) ensure(r.user_id).challenges++;

  const rows = Array.from(tally.values()).map((r) => ({
    ...r,
    points: r.workouts * POINTS.workout + r.checkins * POINTS.checkin + r.achievements * POINTS.achievement + r.challenges * POINTS.challenge,
  }));
  rows.sort((a, b) => b.points - a.points);
  return rows;
});