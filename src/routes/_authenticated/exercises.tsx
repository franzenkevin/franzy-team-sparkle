import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dumbbell, Loader2, Plus, Trash2, Save, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/exercises")({
  head: () => ({ meta: [{ title: "Biblioteca de exercícios — Franzen Team" }] }),
  component: ExercisesPage,
});

type Exercise = {
  id: string;
  name: string;
  category: string;
  equipment?: string | null;
  instructions?: string | null;
  video_url?: string | null;
};

function ExercisesPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<Exercise[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [saving, setSaving] = useState(false);

  const empty: Exercise = { id: "", name: "", category: "", equipment: "", instructions: "", video_url: "" };

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!r);
    }
    const { data } = await supabase.from("exercises").select("*").order("category").order("name");
    setItems((data ?? []) as Exercise[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((e) =>
    !q || e.name.toLowerCase().includes(q.toLowerCase()) || e.category.toLowerCase().includes(q.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, Exercise[]>>((acc, e) => {
    (acc[e.category] ??= []).push(e);
    return acc;
  }, {});

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.category.trim()) {
      toast.error("Nome e categoria são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        const { error } = await supabase.from("exercises").update({
          name: editing.name, category: editing.category, equipment: editing.equipment,
          instructions: editing.instructions, video_url: editing.video_url,
        }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exercises").insert({
          name: editing.name, category: editing.category, equipment: editing.equipment,
          instructions: editing.instructions, video_url: editing.video_url,
        });
        if (error) throw error;
      }
      toast.success("Salvo");
      setEditing(null);
      await load();
    } catch (e) {
      toast.error("Erro ao salvar");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este exercício?")) return;
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Removido");
    setItems((s) => s.filter((e) => e.id !== id));
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <main className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
          <Dumbbell className="text-primary" /> Biblioteca de exercícios
        </h1>
        {isAdmin && (
          <Button onClick={() => setEditing(empty)}>
            <Plus size={16} className="mr-1" /> Novo
          </Button>
        )}
      </div>

      <div className="mt-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou categoria..." className="pl-9" />
      </div>

      {editing && (
        <div className="mt-4 rounded-xl border border-primary/40 bg-card p-4 space-y-3">
          <h2 className="font-heading font-semibold">{editing.id ? "Editar" : "Novo exercício"}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Nome *</Label>
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <Label>Categoria *</Label>
              <Input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Peito, Costas, Pernas..." />
            </div>
            <div>
              <Label>Equipamento</Label>
              <Input value={editing.equipment ?? ""} onChange={(e) => setEditing({ ...editing, equipment: e.target.value })} />
            </div>
            <div>
              <Label>Vídeo (URL)</Label>
              <Input value={editing.video_url ?? ""} onChange={(e) => setEditing({ ...editing, video_url: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Instruções</Label>
            <Textarea rows={3} value={editing.instructions ?? ""} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              <span className="ml-1">Salvar</span>
            </Button>
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">Nenhum exercício encontrado.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {Object.entries(grouped).map(([cat, list]) => (
            <section key={cat}>
              <h2 className="font-heading text-lg font-semibold text-primary mb-2">{cat}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {list.map((ex) => (
                  <div key={ex.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{ex.name}</h3>
                        {ex.equipment && <p className="text-xs text-muted-foreground mt-0.5">{ex.equipment}</p>}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(ex)}>Editar</Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(ex.id)}>
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {ex.instructions && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{ex.instructions}</p>}
                    {ex.video_url && (
                      <a href={ex.video_url} target="_blank" rel="noreferrer" className="text-xs text-primary mt-2 inline-block hover:underline">
                        Ver vídeo →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
