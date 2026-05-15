import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateProtocol } from "@/lib/protocol.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/generate")({
  head: () => ({ meta: [{ title: "Gerar protocolo — Franzen Team" }] }),
  component: GeneratePage,
});

function GeneratePage() {
  const run = useServerFn(generateProtocol);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const res = await run();
      setSummary(res.summary);
      toast.success("Protocolo gerado com sucesso");
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes("429")) toast.error("Limite de uso da IA atingido. Tente novamente em instantes.");
      else if (msg.includes("402")) toast.error("Créditos da IA esgotados. Adicione créditos no workspace.");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-5 border-b border-border">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <div className="inline-flex items-center gap-2 text-sm">
          <Sparkles size={14} className="text-primary" />
          <span className="font-heading font-semibold">IA</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-heading font-bold">
          Gerar <span className="text-primary">protocolo</span> com IA
        </h1>
        <p className="mt-3 text-muted-foreground">
          A IA usa seu perfil (objetivo, peso, dias de treino, restrições alimentares…) para criar um plano completo de treino e dieta. Uma nova versão será criada — a anterior é substituída.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <Button onClick={handleGenerate} disabled={loading} size="lg" className="glow w-full">
            {loading ? (
              <><Loader2 size={18} className="mr-2 animate-spin" /> Gerando protocolo…</>
            ) : (
              <><Sparkles size={18} className="mr-2" /> Gerar agora</>
            )}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Pode levar 20–60 segundos.
          </p>
        </div>

        {summary && (
          <div className="mt-6 rounded-xl border border-primary/40 bg-primary/5 p-6 animate-fade-in">
            <h2 className="font-heading text-lg font-semibold">Resumo</h2>
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{summary}</p>
            <div className="mt-5 flex gap-3">
              <Button onClick={() => navigate({ to: "/training" })} variant="outline" size="sm">Ver treino</Button>
              <Button onClick={() => navigate({ to: "/diet" })} variant="outline" size="sm">Ver dieta</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}