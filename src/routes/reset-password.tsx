import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nova senha — Franzen Team" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [ready, setReady] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (password.length < 6) { setErrorMsg("A senha deve ter ao menos 6 caracteres."); return; }
    if (password !== confirm) { setErrorMsg("As senhas não coincidem."); return; }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) { setErrorMsg(error.message); return; }
    toast.success("Senha atualizada!");
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Franzen Team" className="w-20 h-20 mb-4" />
          <h1 className="text-3xl font-heading font-bold text-foreground">Nova senha</h1>
          <p className="text-muted-foreground mt-1 text-sm">Defina sua nova senha</p>
        </div>
        {!ready ? (
          <Alert><AlertDescription>Validando link de recuperação...</AlertDescription></Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="mt-1" />
            </div>
            {errorMsg && <Alert variant="destructive"><AlertDescription>{errorMsg}</AlertDescription></Alert>}
            <Button type="submit" className="w-full glow" disabled={loading}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}