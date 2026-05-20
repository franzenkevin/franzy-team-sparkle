import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, Send, Users, Sparkles } from "lucide-react";
import { notify } from "@/lib/notifications";
import { useServerFn } from "@tanstack/react-start";
import { adminSuggestReply } from "@/lib/adminMessage.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  head: () => ({ meta: [{ title: "Mensagens dos alunos — Admin" }] }),
  component: AdminMessagesPage,
});

type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type Contact = {
  user_id: string;
  full_name: string | null;
  unread: number;
  last_at: string | null;
};

function AdminMessagesPage() {
  const [me, setMe] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [extra, setExtra] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestFn = useServerFn(adminSuggestReply);

  const loadContacts = async (uid: string) => {
    const { data: profs } = await supabase
      .from("profiles").select("user_id, full_name").order("full_name");
    const list = (profs ?? []).filter((p) => p.user_id !== uid);

    // unread per sender
    const { data: unreadRows } = await supabase
      .from("messages").select("sender_id, created_at")
      .eq("recipient_id", uid).is("read_at", null);
    const unreadMap = new Map<string, number>();
    for (const r of unreadRows ?? []) unreadMap.set(r.sender_id, (unreadMap.get(r.sender_id) ?? 0) + 1);

    // last message timestamp per contact
    const { data: lastRows } = await supabase
      .from("messages").select("sender_id, recipient_id, created_at")
      .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
      .order("created_at", { ascending: false }).limit(500);
    const lastMap = new Map<string, string>();
    for (const r of lastRows ?? []) {
      const other = r.sender_id === uid ? r.recipient_id : r.sender_id;
      if (!lastMap.has(other)) lastMap.set(other, r.created_at);
    }

    const enriched: Contact[] = list.map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      unread: unreadMap.get(p.user_id) ?? 0,
      last_at: lastMap.get(p.user_id) ?? null,
    }));
    enriched.sort((a, b) => {
      if (a.unread !== b.unread) return b.unread - a.unread;
      const la = a.last_at ? new Date(a.last_at).getTime() : 0;
      const lb = b.last_at ? new Date(b.last_at).getTime() : 0;
      return lb - la;
    });
    setContacts(enriched);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMe(user.id);
      await loadContacts(user.id);
      setLoading(false);

      const ch = supabase.channel(`admin-msg-${user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => loadContacts(user.id))
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    })();
  }, []);

  useEffect(() => {
    if (!me || !active) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase
        .from("messages").select("*")
        .or(`and(sender_id.eq.${me},recipient_id.eq.${active}),and(sender_id.eq.${active},recipient_id.eq.${me})`)
        .order("created_at", { ascending: true }).limit(500);
      setMessages((data ?? []) as Msg[]);

      await supabase.from("messages").update({ read_at: new Date().toISOString() })
        .eq("recipient_id", me).eq("sender_id", active).is("read_at", null);
      loadContacts(me);

      channel = supabase
        .channel(`adm-thread-${me}-${active}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
          const m = payload.new as Msg;
          const involved = (m.sender_id === me && m.recipient_id === active) ||
                           (m.sender_id === active && m.recipient_id === me);
          if (involved) setMessages((prev) => [...prev, m]);
        })
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [me, active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim().slice(0, 2000);
    if (!body || !me || !active) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: me, recipient_id: active, body,
      });
      if (error) throw error;
      setText("");
      notify({ userId: active, type: "new_message", title: "Coach respondeu", body: body.slice(0, 80), link: "/messages" }).catch(() => {});
    } catch (e) {
      console.error(e);
    } finally { setSending(false); }
  };

  const activeContact = useMemo(() => contacts.find((c) => c.user_id === active), [contacts, active]);

  const suggest = async () => {
    if (!active) return;
    setSuggesting(true);
    try {
      const r = await suggestFn({ data: { targetUserId: active, thread: messages, extra: extra.trim() || undefined } });
      if (r.suggestion) setText(r.suggestion);
      else toast.error("IA não gerou sugestão");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro IA");
    } finally { setSuggesting(false); }
  };

  if (loading) {
    return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <main className="container mx-auto px-4 py-6 grid gap-4 lg:grid-cols-[300px_1fr] h-[calc(100vh-100px)]">
      <aside className="rounded-xl border border-border bg-card p-3 overflow-y-auto">
        <div className="flex items-center gap-2 text-sm font-heading font-semibold mb-3">
          <Users size={16} /> Alunos
        </div>
        {contacts.length === 0 && <p className="text-xs text-muted-foreground px-1">Nenhum aluno.</p>}
        <div className="space-y-1">
          {contacts.map((c) => (
            <button
              key={c.user_id}
              onClick={() => setActive(c.user_id)}
              className={`w-full text-left rounded-md border p-2 text-sm transition flex items-center gap-2 ${
                active === c.user_id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <span className="flex-1 truncate">{c.full_name ?? "(sem nome)"}</span>
              {c.unread > 0 && (
                <span className="rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 min-w-5 text-center">{c.unread}</span>
              )}
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-xl border border-border bg-card flex flex-col min-h-0">
        <div className="border-b border-border p-3 flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" />
          <span className="font-semibold text-sm">{activeContact?.full_name ?? "Selecione um aluno"}</span>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {!active && <p className="text-sm text-muted-foreground text-center">Escolha um aluno.</p>}
          {active && messages.length === 0 && <p className="text-sm text-muted-foreground text-center">Sem mensagens ainda.</p>}
          {messages.map((m) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {active && (
          <div className="border-t border-border p-3 space-y-2">
            <div className="flex gap-2">
              <Input
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="Direção para IA (opcional): 'explica o ajuste de kcal', 'pede foto', etc."
                className="text-xs"
                maxLength={300}
              />
              <Button variant="outline" size="sm" onClick={suggest} disabled={suggesting}>
                {suggesting ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} className="mr-1"/>}
                Sugerir IA
              </Button>
            </div>
            <div className="flex gap-2 items-end">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
                placeholder="Edite o rascunho ou escreva sua resposta… (Ctrl/Cmd+Enter envia)"
                maxLength={2000}
                rows={3}
                className="text-sm resize-none"
              />
              <Button onClick={send} disabled={sending || !text.trim()}>
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}