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

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Franzen Team" }] }),
  component: LoginPage,
});

function LoginPage() {
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
      if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
        setErrorMsg("E-mail ou senha incorretos.");
      } else {
        setErrorMsg(error.message ?? "Erro ao entrar.");
      }
      return;
    }
    const user = data?.user;
    if (user) {
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      const isAdmin = !!roleRow;
      if (isAdmin) {
        await signOut();
        setErrorMsg("Esta conta é de administrador. Acesse pelo login do criador.");
        return;
      }
      navigate({ to: "/dashboard", replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Franzen Team" className="w-20 h-20 mb-4" />
          <h1 className="text-3xl font-heading font-bold text-foreground">FRANZEN TEAM</h1>
          <p className="text-muted-foreground mt-1 text-sm">Entre na sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="mt-1" />
          </div>
          {errorMsg && <Alert variant="destructive"><AlertDescription>{errorMsg}</AlertDescription></Alert>}
          <Button type="submit" className="w-full glow" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-4 text-center space-y-2">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">Esqueci minha senha</Link>
          <p className="text-sm text-muted-foreground">
            Não tem conta? <Link to="/signup" className="text-primary hover:underline">Criar conta</Link>
          </p>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border mt-3">
            É administrador? <Link to="/admin/login" className="text-primary hover:underline inline-flex items-center gap-1"><ShieldCheck size={12} />Login do criador</Link>
          </p>
        </div>
      </div>
    </div>
  );
}