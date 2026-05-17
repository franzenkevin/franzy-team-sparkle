import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Login do criador — Franzen Team" }] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    const { data, error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      const msg = (error.message || "").toLowerCase();
      setErrorMsg(msg.includes("invalid") ? "E-mail ou senha incorretos." : (error.message ?? "Erro ao entrar."));
      return;
    }
    const user = data?.user;
    if (!user) return;
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      await signOut();
      setErrorMsg("Esta conta não tem permissão de administrador.");
      return;
    }
    navigate({ to: "/admin", replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Franzen Team" className="w-20 h-20 mb-4" />
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck size={18} />
            <span className="text-xs uppercase tracking-widest font-medium">Acesso do criador</span>
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground">FRANZEN TEAM</h1>
          <p className="text-muted-foreground mt-1 text-sm">Painel administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
          </div>
          {errorMsg && <Alert variant="destructive"><AlertDescription>{errorMsg}</AlertDescription></Alert>}
          <Button type="submit" className="w-full glow" disabled={loading}>
            {loading ? "Entrando..." : "Entrar como criador"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
            ← Voltar ao login de aluno
          </Link>
        </div>
      </div>
    </div>
  );
}