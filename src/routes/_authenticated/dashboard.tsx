import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Dumbbell, Apple, LineChart, History, Bell, Download, ShoppingCart } from "lucide-react";
import { useReminders } from "@/hooks/useReminders";
import { generateProtocolPdf } from "@/lib/protocolPdf";
import { generateShoppingListPdf } from "@/lib/shoppingList";
import { NotificationBell } from "@/components/NotificationBell";
import { AchievementsCard } from "@/components/AchievementsCard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Franzen Team" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const [name, setName] = useState<string>("");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [downloading, setDownloading] = useState(false);
  const [downloadingList, setDownloadingList] = useState(false);
  const navigate = useNavigate();

  useReminders(8, 0, "Franzen Team", "Bom dia! Hora do treino e check-in.");

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, onboarding_complete")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!p?.onboarding_complete) { navigate({ to: "/onboarding" }); return; }
      setName(p.full_name ?? user.email ?? "");
    })();
  }, [navigate]);

  const requestNotif = async () => {
    if (typeof Notification === "undefined") return;
    const r = await Notification.requestPermission();
    setPermission(r);
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profile }, { data: protocol }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("protocols").select("training, diet, start_date, end_date, version")
          .eq("user_id", user.id).eq("status", "active")
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!protocol) {
        toast.error("Nenhum protocolo ativo encontrado");
        return;
      }
      generateProtocolPdf({
        fullName: profile?.full_name ?? "",
        protocol: protocol as any,
      });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF");
    } finally {
      setDownloading(false);
    }
  };

  const downloadShoppingList = async () => {
    setDownloadingList(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profile }, { data: protocol }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("protocols").select("diet")
          .eq("user_id", user.id).eq("status", "active")
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!protocol?.diet) {
        toast.error("Nenhuma dieta ativa encontrada");
        return;
      }
      generateShoppingListPdf({
        fullName: profile?.full_name ?? "",
        diet: protocol.diet as any,
      });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar lista");
    } finally {
      setDownloadingList(false);
    }
  };

  return (
    <div>
      <main className="container mx-auto px-4 py-8 sm:py-10 max-w-5xl">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold">
            Olá, <span className="text-primary">{name || "atleta"}</span>
          </h1>
          <NotificationBell />
        </div>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">Pronto para o treino de hoje?</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {permission !== "granted" && (
            <button
              onClick={requestNotif}
              className="w-full sm:w-auto inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition px-4 py-2 text-sm"
            >
              <Bell size={16} className="text-primary" />
              Ativar lembretes diários
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={downloadPdf}
            disabled={downloading}
            className="w-full sm:w-auto"
          >
            <Download size={16} className="mr-2" />
            {downloading ? "Gerando..." : "Baixar protocolo (PDF)"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadShoppingList}
            disabled={downloadingList}
            className="w-full sm:w-auto"
          >
            <ShoppingCart size={16} className="mr-2" />
            {downloadingList ? "Gerando..." : "Lista de compras"}
          </Button>
        </div>

        <Link
          to="/generate"
          className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-5 sm:p-6 hover:border-primary transition group"
        >
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              <Sparkles size={14} /> IA
            </div>
            <h3 className="mt-2 font-heading text-base sm:text-lg font-semibold">Gerar protocolo automático</h3>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Treino e dieta personalizados a partir do seu perfil.</p>
          </div>
          <Sparkles className="text-primary group-hover:scale-110 transition shrink-0" size={28} />
        </Link>

        <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <DashCard to="/training" icon={Dumbbell} title="Treinos" desc="Protocolo e séries" />
          <DashCard to="/diet" icon={Apple} title="Nutrição" desc="Refeições e macros" />
          <DashCard to="/progress" icon={LineChart} title="Progresso" desc="Check-ins e fotos" />
          <DashCard to="/history" icon={History} title="Histórico" desc="Versões anteriores" />
        </div>

        <div className="mt-6">
          <AchievementsCard />
        </div>
      </main>
    </div>
  );
}

function DashCard({ to, icon: Icon, title, desc }: { to: string; icon: any; title: string; desc: string }) {
  return (
    <Link to={to} className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:border-primary transition flex flex-col gap-2">
      <Icon size={20} className="text-primary" />
      <h3 className="font-heading text-sm sm:text-base font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </Link>
  );
}
