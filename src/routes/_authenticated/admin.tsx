import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Save, Shield, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Franzen Team" }] }),
  component: AdminPage,
});

type ProfileRow = { user_id: string; full_name: string | null; goal: string | null };
type ProtocolRow = { id: string; user_id: string; status: string; version: number; training: any; diet: any; start_date: string; end_date: string };

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [protocol, setProtocol] = useState<ProtocolRow | null>(null);
  const [trainingText, setTrainingText] = useState("{}");
  const [dietText, setDietText] = useState("{}");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/login" }); return; }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roles) { setChecking(false); return; }
      setIsAdmin(true);
      const { data: rows } = await supabase
        .from("profiles").select("user_id, full_name, goal").order("created_at", { ascending: false });
      setProfiles(rows ?? []);
      setChecking(false);
    })();
  }, [navigate]);

  const loadProtocol = async (u: ProfileRow) => {
    setSelectedUser(u);
    const { data } = await supabase
      .from("protocols").select("*").eq("user_id", u.user_id).eq("status", "active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data) {
      setProtocol(data as ProtocolRow);
      setTrainingText(JSON.stringify(data.training ?? {}, null, 2));
      setDietText(JSON.stringify(data.diet ?? {}, null, 2));
    } else {
      setProtocol(null);
      setTrainingText("{}");
      setDietText("{}");
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    let training: any, diet: any;
    try { training = JSON.parse(trainingText); } catch { toast.error("JSON do treino inválido"); return; }
    try { diet = JSON.parse(dietText); } catch { toast.error("JSON da dieta inválido"); return; }
    setSaving(true);
    if (protocol) {
      const { error } = await supabase
        .from("protocols")
        .update({ training, diet, version: protocol.version + 1 })
        .eq("id", protocol.id);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Protocolo atualizado");
    } else {
      const { error } = await supabase
        .from("protocols")
        .insert({ user_id: selectedUser.user_id, training, diet, status: "active" });
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Protocolo criado");
    }
    await loadProtocol(selectedUser);
  };

  if (checking) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Verificando acesso…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center max-w-md">
          <Shield className="mx-auto text-muted-foreground" size={48} />
          <h1 className="mt-4 text-2xl font-heading font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta área é apenas para administradores.</p>
          <Link to="/dashboard"><Button className="mt-6">Voltar ao dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const filtered = profiles.filter((p) =>
    !filter || (p.full_name ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-5 border-b border-border">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <div className="inline-flex items-center gap-2 text-sm">
          <Shield size={14} className="text-primary" />
          <span className="font-heading font-semibold">Admin</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-heading font-semibold">
            <Users size={16} /> Usuários ({profiles.length})
          </div>
          <Input placeholder="Buscar por nome…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p.user_id}
                onClick={() => loadProtocol(p)}
                className={`w-full text-left rounded-md border p-3 transition ${
                  selectedUser?.user_id === p.user_id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="text-sm font-medium truncate">{p.full_name ?? "(sem nome)"}</div>
                <div className="text-xs text-muted-foreground truncate">{p.goal ?? "—"}</div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground p-3">Nenhum usuário encontrado.</p>
            )}
          </div>
        </aside>

        <section>
          {!selectedUser ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
              Selecione um usuário para editar o protocolo.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-heading font-bold">{selectedUser.full_name ?? "(sem nome)"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {protocol ? `Protocolo v${protocol.version} • ${protocol.start_date} → ${protocol.end_date}` : "Sem protocolo ativo"}
                  </p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="glow">
                  <Save size={16} className="mr-2" />
                  {saving ? "Salvando…" : protocol ? "Salvar nova versão" : "Criar protocolo"}
                </Button>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm">Treino (JSON)</Label>
                  <Textarea
                    value={trainingText}
                    onChange={(e) => setTrainingText(e.target.value)}
                    rows={20}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Dieta (JSON)</Label>
                  <Textarea
                    value={dietText}
                    onChange={(e) => setDietText(e.target.value)}
                    rows={20}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}