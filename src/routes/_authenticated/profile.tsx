import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, LogOut, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Perfil — Franzen Team" }] }),
  component: ProfilePage,
});

type Profile = {
  full_name: string | null;
  age: number | null;
  sex: string | null;
  weight: number | null;
  height: number | null;
  goal: string | null;
  activity_level: string | null;
  experience: string | null;
  injuries: string | null;
  allergies: string | null;
  disliked_foods: string | null;
};

const empty: Profile = {
  full_name: "", age: null, sex: "", weight: null, height: null,
  goal: "", activity_level: "", experience: "", injuries: "", allergies: "", disliked_foods: "",
};

function ProfilePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState<Profile>(empty);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("full_name, age, sex, weight, height, goal, activity_level, experience, injuries, allergies, disliked_foods")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setP({ ...empty, ...data });
      setLoading(false);
    })();
  }, []);

  const update = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => ({ ...s, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: p.full_name,
        age: p.age,
        sex: p.sex,
        weight: p.weight,
        height: p.height,
        goal: p.goal,
        activity_level: p.activity_level,
        experience: p.experience,
        injuries: p.injuries,
        allergies: p.allergies,
        disliked_foods: p.disliked_foods,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("Perfil atualizado");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-5 border-b border-border">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut size={16} className="mr-2" /> Sair
        </Button>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-heading font-bold">Meu Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">{email}</p>

        <div className="mt-8 space-y-5">
          <Field label="Nome completo">
            <Input value={p.full_name ?? ""} onChange={(e) => update("full_name", e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Idade">
              <Input type="number" value={p.age ?? ""} onChange={(e) => update("age", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Sexo">
              <Input value={p.sex ?? ""} onChange={(e) => update("sex", e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Peso (kg)">
              <Input type="number" step="0.1" value={p.weight ?? ""} onChange={(e) => update("weight", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="Altura (cm)">
              <Input type="number" value={p.height ?? ""} onChange={(e) => update("height", e.target.value ? Number(e.target.value) : null)} />
            </Field>
          </div>

          <Field label="Objetivo">
            <Input value={p.goal ?? ""} onChange={(e) => update("goal", e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nível de atividade">
              <Input value={p.activity_level ?? ""} onChange={(e) => update("activity_level", e.target.value)} />
            </Field>
            <Field label="Experiência">
              <Input value={p.experience ?? ""} onChange={(e) => update("experience", e.target.value)} />
            </Field>
          </div>

          <Field label="Lesões / restrições">
            <Textarea rows={2} value={p.injuries ?? ""} onChange={(e) => update("injuries", e.target.value)} />
          </Field>
          <Field label="Alergias">
            <Textarea rows={2} value={p.allergies ?? ""} onChange={(e) => update("allergies", e.target.value)} />
          </Field>
          <Field label="Alimentos que não gosta">
            <Textarea rows={2} value={p.disliked_foods ?? ""} onChange={(e) => update("disliked_foods", e.target.value)} />
          </Field>

          <Button onClick={handleSave} disabled={saving} className="w-full glow">
            <Save size={16} className="mr-2" />
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}