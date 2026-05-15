import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({ meta: [{ title: "Coach IA — Franzen Team" }] }),
  component: CoachPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Oi! Sou seu coach virtual. Pergunte sobre treino, dieta, descanso ou ajustes do seu protocolo." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (text.length > 1500) {
      toast.error("Mensagem muito longa (máx. 1500 caracteres)");
      return;
    }
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    // placeholder for streamed response
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sessão expirada");

      const res = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: next.slice(-30) }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Erro ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
      if (!acc.trim()) {
        setMessages((m) => {
          const copy = m.slice();
          copy[copy.length - 1] = { role: "assistant", content: "Não consegui responder agora. Tente novamente." };
          return copy;
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao falar com o coach");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-6 max-w-3xl flex flex-col h-[calc(100vh-5rem)]">
      <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2 shrink-0">
        <Sparkles className="text-primary" /> Coach IA
      </h1>

      <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2"><Loader2 className="animate-spin" size={14} /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Pergunte algo ao coach..."
          disabled={loading}
        />
        <Button onClick={send} disabled={loading || !input.trim()}>
          <Send size={16} />
        </Button>
      </div>
    </main>
  );
}
