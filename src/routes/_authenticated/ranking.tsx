import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getLeaderboard, type RankingRow } from "@/lib/ranking.functions";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trophy, Loader2, Medal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ranking")({
  head: () => ({ meta: [{ title: "Ranking — Franzen Team" }] }),
  component: RankingPage,
});

function RankingPage() {
  const fetchBoard = useServerFn(getLeaderboard);
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMe(user?.id ?? null);
      try {
        const data = await fetchBoard();
        setRows(data);
      } finally { setLoading(false); }
    })();
  }, [fetchBoard]);

  const myRank = me ? rows.findIndex((r) => r.user_id === me) + 1 : 0;

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-5 border-b border-border">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Dashboard
        </Link>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
          <Trophy className="text-primary" /> Ranking
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pontos = 10/treino · 25/check-in · 50/conquista · 100/desafio
        </p>
        {myRank > 0 && (
          <div className="mt-5 rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
            Sua posição: <strong className="text-primary">#{myRank}</strong> de {rows.length}
          </div>
        )}
        <div className="mt-6 space-y-2">
          {rows.length === 0 && <p className="text-muted-foreground text-sm">Ainda sem dados.</p>}
          {rows.map((r, i) => {
            const isMe = r.user_id === me;
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
            return (
              <div key={r.user_id} className={`rounded-xl border p-4 flex items-center gap-3 ${isMe ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                <div className="w-8 text-center font-heading font-bold text-lg">{medal ?? `#${i + 1}`}</div>
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted grid place-items-center text-xs text-muted-foreground">{r.name.slice(0, 2).toUpperCase()}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.name}{isMe && <span className="text-xs text-primary ml-1">(você)</span>}</p>
                  <p className="text-xs text-muted-foreground">{r.workouts} treinos · {r.checkins} check-ins · {r.achievements} conquistas</p>
                </div>
                <div className="text-right">
                  <p className="font-heading font-bold text-primary flex items-center gap-1"><Medal size={14} /> {r.points}</p>
                  <p className="text-[10px] text-muted-foreground">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}