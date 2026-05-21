import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, Phone, Send, Users } from "lucide-react";
import { notify } from "@/lib/notifications";
import { COACH_WHATSAPP } from "@/components/CoachContactDialog";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Mensagens — Franzen Team" }] }),
  component: MessagesPage,
});

type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type Contact = { user_id: string; full_name: string | null };

function MessagesPage() {
  const [me, setMe] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // bootstrap: who am I, list contacts
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMe(user.id);
      const { data: roleRow } = await supabase
        .from("user_roles").select("id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      const admin = !!roleRow;
      setIsAdmin(admin);

      if (admin) {
        // admins talk to all students
        const { data } = await supabase
          .from("profiles").select("user_id, full_name").order("full_name");
        setContacts((data ?? []).filter((p) => p.user_id !== user.id));
      } else {
        // students talk to all coaches (admins)
        const { data: admins } = await supabase
          .from("user_roles").select("user_id").eq("role", "admin");
        const ids = (admins ?? []).map((a) => a.user_id);
        if (ids.length > 0) {
          const { data: profs } = await supabase
            .from("profiles").select("user_id, full_name").in("user_id", ids);
          setContacts(profs ?? []);
          if (profs && profs[0]) setActive(profs[0].user_id);
        }
      }
      setLoading(false);
    })();
  }, []);

  // load thread + realtime
  useEffect(() => {
    if (!me || !active) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${me},recipient_id.eq.${active}),and(sender_id.eq.${active},recipient_id.eq.${me})`)
        .order("created_at", { ascending: true })
        .limit(500);
      setMessages((data ?? []) as Msg[]);

      // mark unread as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", me)
        .eq("sender_id", active)
        .is("read_at", null);

      channel = supabase
        .channel(`msg-${me}-${active}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "messages",
        }, (payload) => {
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
        sender_id: me,
        recipient_id: active,
        body,
      });
      if (error) throw error;
      setText("");
      notify({ userId: active, type: "new_message", title: "Nova mensagem", body: body.slice(0, 80), link: "/messages" }).catch(() => {});
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const activeContact = useMemo(() => contacts.find((c) => c.user_id === active), [contacts, active]);

  if (loading) {
    return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <main className="container mx-auto px-4 py-6 grid gap-4 lg:grid-cols-[280px_1fr] h-[calc(100vh-100px)]">
      <aside className="rounded-xl border border-border bg-card p-3 overflow-y-auto">
        <div className="flex items-center gap-2 text-sm font-heading font-semibold mb-3">
          <Users size={16} /> {isAdmin ? "Alunos" : "Coaches"}
        </div>
        {contacts.length === 0 && (
          <p className="text-xs text-muted-foreground px-1">Nenhum contato disponível.</p>
        )}
        <div className="space-y-1">
          {contacts.map((c) => (
            <button
              key={c.user_id}
              onClick={() => setActive(c.user_id)}
              className={`w-full text-left rounded-md border p-2 text-sm transition ${
                active === c.user_id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              {c.full_name ?? "(sem nome)"}
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-xl border border-border bg-card flex flex-col min-h-0">
        <div className="border-b border-border p-3 flex items-center gap-2 flex-wrap">
          <MessageSquare size={16} className="text-primary" />
          <span className="font-semibold text-sm flex-1 truncate">
            {activeContact?.full_name ?? "Selecione um contato"}
          </span>
          {!isAdmin && (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <a
                href={`https://wa.me/${COACH_WHATSAPP}?text=${encodeURIComponent("Olá Kevin, sou aluno da Franzen Team.")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Phone size={14} /> WhatsApp do coach
              </a>
            </Button>
          )}
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {!active && (
            <p className="text-sm text-muted-foreground text-center">Escolha um contato para começar.</p>
          )}
          {active && messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">Sem mensagens ainda. Diga oi 👋</p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}>
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
          <div className="border-t border-border p-3 flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Escreva uma mensagem…"
              maxLength={2000}
            />
            <Button onClick={send} disabled={sending || !text.trim()}>
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}