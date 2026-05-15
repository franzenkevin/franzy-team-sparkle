import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dumbbell, Apple } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Histórico — Franzen Team" }] }),
  component: HistoryPage,
});

type Protocol = {
  id: string;
  version: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  training: any;
  diet: any;
};

function HistoryPage() {
  const [items, setItems] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("protocols")
        .select("id, version, status, start_date, end_date, created_at, training, diet")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data ?? []) as Protocol[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-heading font-bold">Versões dos seus protocolos</h1>
        <p className="mt-2 text-sm text-muted-foreground">Veja todas as versões anteriores geradas para você.</p>

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            Nenhum protocolo gerado ainda.
            <div className="mt-4">
              <Link to="/generate"><Button>Gerar agora</Button></Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpenId(openId === p.id ? null : p.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/40 transition"
                >
                  <div>
                    <div className="font-heading font-semibold">
                      Protocolo v{p.version}
                      {p.status === "active" && (
                        <span className="ml-2 text-xs font-sans px-2 py-0.5 rounded bg-primary/15 text-primary">ativo</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")} • {p.start_date} → {p.end_date}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{openId === p.id ? "Fechar" : "Abrir"}</span>
                </button>
                {openId === p.id && (
                  <div className="border-t border-border p-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold mb-2"><Dumbbell size={14} /> Treino</div>
                      <pre className="text-xs bg-muted/40 p-3 rounded overflow-auto max-h-80">{JSON.stringify(p.training, null, 2)}</pre>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold mb-2"><Apple size={14} /> Dieta</div>
                      <pre className="text-xs bg-muted/40 p-3 rounded overflow-auto max-h-80">{JSON.stringify(p.diet, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
