import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Sparkles, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { adminCoachChat } from "@/lib/adminCoach.functions";
import { adminSaveProtocol } from "@/lib/admin.functions";
import { ProtocolPreviewTabs } from "@/components/ProtocolPreview";

type Msg = { role: "user" | "assistant"; content: string };

export function CoachChat({ profiles }: { profiles: Array<{ user_id: string; full_name?: string | null }> }) {
  const [userId, setUserId] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Olá! Selecione um aluno e descreva o que precisa. Posso analisar feedbacks, calcular macros e gerar um rascunho de protocolo completo com justificativa." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const chatFn = useServerFn(adminCoachChat);
  const saveFn = useServerFn(adminSaveProtocol);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async () => {
    if (!userId) { toast.error("Selecione um aluno"); return; }
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const r = await chatFn({ data: { targetUserId: userId, messages: next } });
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
      if (r.proposal) setProposal(r.proposal);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro no chat");
      setMessages((m) => [...m, { role: "assistant", content: `⚠ Erro: ${e?.message ?? "falha"}` }]);
    } finally { setBusy(false); }
  };

  const applyDraft = async () => {
    if (!proposal || !userId) return;
    setApplying(true);
    try {
      await saveFn({ data: {
        targetUserId: userId,
        protocolId: null,
        training: proposal.training,
        diet: proposal.diet,
        hormones: proposal.hormones ?? [],
        status: "pending_review",
        notify: false,
      } });
      toast.success("Rascunho criado. Edite/aprove na aba Usuários → Protocolo.");
      setProposal(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar rascunho");
    } finally { setApplying(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <Card className="p-4 flex flex-col h-[70vh]">
        <div className="mb-3">
          <Label className="text-xs">Aluno</Label>
          <Select value={userId} onValueChange={(v) => { setUserId(v); setProposal(null); }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {profiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>{p.full_name ?? "(sem nome)"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50 border border-border"
              }`}>{m.content}</div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> pensando…</div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ex.: analise esse exame / monta treino PPL 4x / coloca 25mg de proviron…"
            rows={2}
            className="resize-none text-sm"
          />
          <Button onClick={send} disabled={busy || !input.trim() || !userId}><Send size={14} /></Button>
        </div>
      </Card>

      <Card className="p-4 h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Sparkles size={16} /><h3 className="font-heading font-semibold text-sm">Proposta de protocolo</h3></div>
          {proposal && (
            <Button size="sm" onClick={applyDraft} disabled={applying} className="gap-1">
              {applying ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
              Aplicar como rascunho
            </Button>
          )}
        </div>
        {!proposal ? (
          <div className="text-sm text-muted-foreground">A proposta aparece aqui quando a IA gerar um protocolo. Você pode editar livremente após "Aplicar como rascunho".</div>
        ) : (
          <div className="space-y-3">
            {proposal.summary && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                <div className="text-xs font-semibold text-primary mb-1">Raciocínio</div>
                <p className="whitespace-pre-wrap">{proposal.summary}</p>
              </div>
            )}
            <ProtocolPreviewTabs training={proposal.training} diet={proposal.diet} hormones={proposal.hormones ?? []} />
          </div>
        )}
      </Card>
    </div>
  );
}
