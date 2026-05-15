import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENTS, type AchievementCode, computeStreak } from "@/lib/achievements";
import { Flame, Trophy } from "lucide-react";

export function AchievementsCard() {
  const [unlocked, setUnlocked] = useState<Set<AchievementCode>>(new Set());
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data }, s] = await Promise.all([
        supabase.from("achievements").select("code").eq("user_id", user.id),
        computeStreak(user.id),
      ]);
      setUnlocked(new Set((data ?? []).map((d) => d.code as AchievementCode)));
      setStreak(s);
    })();
  }, []);

  const codes = Object.keys(ACHIEVEMENTS) as AchievementCode[];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-heading font-semibold flex items-center gap-2">
          <Trophy size={16} className="text-primary" /> Conquistas
        </h3>
        <div className="flex items-center gap-1 text-sm font-medium">
          <Flame size={16} className="text-orange-500" />
          <span>{streak} {streak === 1 ? "dia" : "dias"} seguidos</span>
        </div>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {codes.map((code) => {
          const meta = ACHIEVEMENTS[code];
          const got = unlocked.has(code);
          return (
            <div
              key={code}
              title={`${meta.title} — ${meta.description}`}
              className={`aspect-square rounded-lg border flex flex-col items-center justify-center text-center p-2 transition ${
                got
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-muted/20 grayscale opacity-40"
              }`}
            >
              <span className="text-2xl">{meta.icon}</span>
              <span className="text-[10px] mt-1 leading-tight line-clamp-2">{meta.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}