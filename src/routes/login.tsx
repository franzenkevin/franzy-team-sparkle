import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { User as UserIcon, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Franzen Team" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"client" | "admin">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resending, setResending] = useState(false);
  const { signIn, signOut, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setEmailNotConfirmed(false);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
        setEmailNotConfirmed(true);
        setErrorMsg("Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.");
      } else if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
        setErrorMsg("E-mail ou senha incorretos.");
      } else {
        setErrorMsg(error.message ?? "Erro ao entrar.");
      }
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      const isAdmin = !!roleRow;
      if (mode === "admin" && !isAdmin) {
        await signOut();
        setErrorMsg("Esta conta não tem permissão de administrador.");
        return;
      }
      navigate({ to: isAdmin ? "/admin" : "/dashboard" });
    }
  };

  const handleResend = async () => {
    if (!email) { toast.error("Informe o e-mail no campo acima."); return; }
    setResending(true);
    const { error } = await resendConfirmationEmail(email);
    setResending(false);
    if (error) toast.error(error.message);
    else toast.success("E-mail reenviado!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Franzen Team" className="w-20 h-20 mb-4" />
          <h1 className="text-3xl font-heading font-bold text-foreground">FRANZEN TEAM</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {mode === "admin" ? "Acesso do criador" : "Entre na sua conta"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 mb-5 rounded-lg bg-secondary/50 border border-border">
          <button type="button" onClick={() => { setMode("client"); setErrorMsg(""); }}
            className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${mode === "client" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <UserIcon size={14} /> Cliente
          </button>
          <button type="button" onClick={() => { setMode("admin"); setErrorMsg(""); }}
            className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${mode === "admin" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <ShieldCheck size={14} /> Admin
          </button>
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
          {emailNotConfirmed && (
            <Button type="button" variant="outline" className="w-full" disabled={resending} onClick={handleResend}>
              {resending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
            </Button>
          )}
          <Button type="submit" className="w-full glow" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-4 text-center space-y-2">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">Esqueci minha senha</Link>
          <p className="text-sm text-muted-foreground">
            Não tem conta? <Link to="/signup" className="text-primary hover:underline">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}