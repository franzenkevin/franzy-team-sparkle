import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, Search, Youtube } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/exercises")({
  head: () => ({ meta: [{ title: "Exercícios — Admin Franzen" }] }),
  component: AdminExercisesPage,
});

type Exercise = {
  id: string;
  name: string;
  category: string;
  equipment: string | null;
  video_url: string | null;
  instructions: string | null;
};

function AdminExercisesPage() {
  const [list, setList] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("exercises")
      .select("id,name,category,equipment,video_url,instructions")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (error) toast.error(error.message);
    setList((data as Exercise[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => Array.from(new Set(list.map((e) => e.category))).sort(), [list]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter((e) =>
      (!cat || e.category === cat) &&
      (!needle || e.name.toLowerCase().includes(needle) || (e.equipment ?? "").toLowerCase().includes(needle)),
    );
  }, [list, q, cat]);

  const withVideo = list.filter((e) => !!e.video_url).length;

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from("exercises")
      .update({
        name: selected.name,
        category: selected.category,
        equipment: selected.equipment,
        video_url: selected.video_url || null,
        instructions: selected.instructions || null,
      })
      .eq("id", selected.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Exercício atualizado");
    setList((prev) => prev.map((e) => (e.id === selected.id ? selected : e)));
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <h1 className="text-2xl font-heading font-bold">Biblioteca de Exercícios</h1>
      <p className="text-sm text-muted-foreground mt-1">
        {list.length} exercícios • {withVideo} com vídeo do YouTube
      </p>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome ou equipamento…" className="pl-9" />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todas categorias</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="mt-4 grid lg:grid-cols-[1fr_1.2fr] gap-4">
        <Card className="p-2 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="grid place-items-center py-10"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(e)}
                    className={`w-full text-left px-3 py-2 hover:bg-accent/40 transition rounded-md flex items-center justify-between gap-2 cursor-pointer ${selected?.id === e.id ? "bg-accent/50" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {e.category}{e.equipment ? ` • ${e.equipment}` : ""}
                      </p>
                    </div>
                    {e.video_url && <Youtube className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">Nada encontrado.</li>}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          {!selected ? (
            <div className="text-sm text-muted-foreground text-center py-10">
              Selecione um exercício para editar.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nome</Label>
                  <Input value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input value={selected.category} onChange={(e) => setSelected({ ...selected, category: e.target.value })} />
                </div>
                <div>
                  <Label>Equipamento</Label>
                  <Input value={selected.equipment ?? ""} onChange={(e) => setSelected({ ...selected, equipment: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-1"><Youtube className="h-3 w-3" /> Link do YouTube</Label>
                <Input
                  placeholder="https://youtu.be/…"
                  value={selected.video_url ?? ""}
                  onChange={(e) => setSelected({ ...selected, video_url: e.target.value })}
                />
                {selected.video_url && (
                  <a href={selected.video_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                    Abrir vídeo
                  </a>
                )}
              </div>
              <div>
                <Label>Instruções / observações</Label>
                <Textarea
                  rows={4}
                  value={selected.instructions ?? ""}
                  onChange={(e) => setSelected({ ...selected, instructions: e.target.value })}
                />
              </div>
              <Button onClick={save} disabled={saving} className="w-full">
                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}