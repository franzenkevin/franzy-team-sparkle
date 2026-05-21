import type { SupabaseClient } from "@supabase/supabase-js";

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Cat = { id: string; name: string; video_url: string | null; instructions: string | null; equipment: string | null };

/**
 * Walks every exercise in a training payload and attaches data from the
 * exercise catalog (id, video, instructions) when the name matches.
 * Mutates a deep-cloned copy and returns it. Safe to call client or server-side
 * as long as the supabase client can read public.exercises.
 */
export async function enrichTrainingWithCatalog(
  training: any,
  supabase: Pick<SupabaseClient, "from">,
): Promise<any> {
  if (!training || typeof training !== "object") return training;
  const cloned = JSON.parse(JSON.stringify(training));
  const days: any[] = Array.isArray(cloned?.days)
    ? cloned.days
    : Array.isArray(cloned?.workouts)
      ? cloned.workouts
      : Array.isArray(cloned?.training_days)
        ? cloned.training_days
        : [];
  if (days.length === 0) return cloned;

  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, video_url, instructions, equipment")
    .limit(2000);
  if (error || !data) return cloned;

  const catalog = data as Cat[];
  const byName = new Map<string, Cat>();
  for (const c of catalog) byName.set(normalize(c.name), c);

  const findMatch = (raw: string): Cat | null => {
    const key = normalize(raw);
    if (!key) return null;
    const direct = byName.get(key);
    if (direct) return direct;
    // token overlap fallback
    const tokens = key.split(" ").filter((t) => t.length >= 4);
    if (tokens.length === 0) return null;
    let best: { c: Cat; score: number } | null = null;
    for (const c of catalog) {
      const n = normalize(c.name);
      let score = 0;
      for (const t of tokens) if (n.includes(t)) score += 1;
      if (score > 0 && (!best || score > best.score)) best = { c, score };
    }
    return best && best.score >= Math.max(1, Math.floor(tokens.length / 2)) ? best.c : null;
  };

  for (const d of days) {
    const exs = Array.isArray(d?.exercises) ? d.exercises : [];
    for (const ex of exs) {
      const match = findMatch(ex?.name ?? "");
      if (!match) continue;
      if (!ex.id) ex.id = match.id;
      if (!ex.videoUrl && !ex.video_url && match.video_url) {
        ex.videoUrl = match.video_url;
        ex.video_url = match.video_url;
      }
      if (!ex.notes && match.instructions) ex.notes = match.instructions;
      if (!ex.equipment && match.equipment) ex.equipment = match.equipment;
    }
  }
  return cloned;
}