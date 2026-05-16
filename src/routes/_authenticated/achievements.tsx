import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ACHIEVEMENTS, type AchievementCode } from "@/lib/achievements";
import { ArrowLeft, Award, Loader2, Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({ meta: [{ title: "Conquistas — Franzen Team" }] }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("achievements").select("code, unlocked_at").eq("user_id", user.id);
      const map: Record<string, string> = {};
      for (const r of data ?? []) map[r.code] = r.unlocked_at;
      setUnlocked(map);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>;

  const all = Object.entries(ACHIEVEMENTS) as Array<[AchievementCode, typeof ACHIEVEMENTS[AchievementCode]]>;
  const total = all.length;
  const got = Object.keys(unlocked).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-5 border-b border-border">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
          <Award className="text-primary" /> Conquistas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{got} de {total} desbloqueadas</p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {all.map(([code, meta]) => {
            const on = !!unlocked[code];
            return (
              <div key={code} className={`rounded-xl border p-4 flex items-start gap-3 ${on ? "border-primary/40 bg-primary/5" : "border-border bg-card opacity-60"}`}>
                <div className="text-3xl">{on ? meta.icon : <Lock className="text-muted-foreground" />}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold">{meta.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                  {on && <p className="text-[10px] text-primary mt-2">Desbloqueada em {new Date(unlocked[code]).toLocaleDateString("pt-BR")}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}