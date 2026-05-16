import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell, Loader2, Check, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notificações — Franzen Team" }] }),
  component: NotificationsPage,
});

type N = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<N[]>([]);
  const [me, setMe] = useState<string | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMe(user.id);
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []) as N[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const markAll = async () => {
    if (!me) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", me).is("read_at", null);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setItems((s) => s.filter((n) => n.id !== id));
  };
  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((s) => s.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>;

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-5 border-b border-border">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        {unread > 0 && <Button size="sm" variant="outline" onClick={markAll}><Check size={14} className="mr-1" /> Marcar todas</Button>}
      </header>
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
          <Bell className="text-primary" /> Notificações {unread > 0 && <span className="text-sm text-primary">({unread} nova{unread > 1 ? "s" : ""})</span>}
        </h1>
        <div className="mt-6 space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>}
          {items.map((n) => (
            <div key={n.id} className={`rounded-xl border p-4 flex items-start gap-3 ${n.read_at ? "border-border bg-card opacity-70" : "border-primary/40 bg-primary/5"}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                {n.link && <Link to={n.link} onClick={() => markOne(n.id)} className="text-xs text-primary mt-1 inline-block">Abrir →</Link>}
              </div>
              <div className="flex flex-col gap-1">
                {!n.read_at && <Button size="icon" variant="ghost" onClick={() => markOne(n.id)}><Check size={14} /></Button>}
                <Button size="icon" variant="ghost" onClick={() => remove(n.id)}><Trash2 size={14} /></Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}