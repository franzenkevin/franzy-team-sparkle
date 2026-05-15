import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, Shield, Sparkles, Dumbbell, Apple, LineChart, History, Bell } from "lucide-react";
import { useReminders } from "@/hooks/useReminders";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Franzen Team" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const [name, setName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
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
      const { data: role } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!role);
    })();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const requestNotif = async () => {
    if (typeof Notification === "undefined") return;
    const r = await Notification.requestPermission();
    setPermission(r);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between gap-2 px-4 py-4 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
          <img src={logo} alt="Franzen Team" className="w-8 h-8 shrink-0" />
          <span className="font-heading font-bold tracking-wide text-sm sm:text-base truncate">FRANZEN TEAM</span>
        </Link>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="px-2 sm:px-3">
                <Shield size={16} className="sm:mr-2" /> <span className="hidden sm:inline">Admin</span>
              </Button>
            </Link>
          )}
          <Link to="/profile">
            <Button variant="ghost" size="sm" className="px-2 sm:px-3">
              <User size={16} className="sm:mr-2" /> <span className="hidden sm:inline">Perfil</span>
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="px-2 sm:px-3" onClick={handleLogout}>
            <LogOut size={16} className="sm:mr-2" /> <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-10 max-w-5xl">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold">
          Olá, <span className="text-primary">{name || "atleta"}</span>
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">Pronto para o treino de hoje?</p>

        {permission !== "granted" && (
          <button
            onClick={requestNotif}
            className="mt-5 w-full sm:w-auto inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition px-4 py-2 text-sm"
          >
            <Bell size={16} className="text-primary" />
            Ativar lembretes diários de treino
          </button>
        )}

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
