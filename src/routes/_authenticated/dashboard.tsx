import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, Shield, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Franzen Team" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const [name, setName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-5 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Franzen Team" className="w-9 h-9" />
          <span className="font-heading font-bold tracking-wide">FRANZEN TEAM</span>
        </Link>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <Shield size={16} className="mr-2" /> Admin
              </Button>
            </Link>
          )}
          <Link to="/profile">
            <Button variant="ghost" size="sm">
              <User size={16} className="mr-2" /> Perfil
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut size={16} className="mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-heading font-bold">
          Olá, <span className="text-primary">{name || "atleta"}</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Seu painel está pronto. Em breve, mais módulos serão liberados aqui.</p>

        <Link
          to="/generate"
          className="mt-8 flex items-center justify-between rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-6 hover:border-primary transition group"
        >
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              <Sparkles size={14} /> IA
            </div>
            <h3 className="mt-2 font-heading text-lg font-semibold">Gerar protocolo automático</h3>
            <p className="mt-1 text-sm text-muted-foreground">Treino e dieta personalizados a partir do seu perfil.</p>
          </div>
          <Sparkles className="text-primary group-hover:scale-110 transition" size={28} />
        </Link>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Link to="/training" className="rounded-xl border border-border bg-card p-6 hover:border-primary transition">
            <h3 className="font-heading text-lg font-semibold">Treinos</h3>
            <p className="mt-2 text-sm text-muted-foreground">Veja seu protocolo e registre as séries.</p>
          </Link>
          <Link to="/diet" className="rounded-xl border border-border bg-card p-6 hover:border-primary transition">
            <h3 className="font-heading text-lg font-semibold">Nutrição</h3>
            <p className="mt-2 text-sm text-muted-foreground">Refeições, macros e substituições.</p>
          </Link>
          <Link to="/progress" className="rounded-xl border border-border bg-card p-6 hover:border-primary transition">
            <h3 className="font-heading text-lg font-semibold">Progresso</h3>
            <p className="mt-2 text-sm text-muted-foreground">Check-ins, peso e fotos de evolução.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}