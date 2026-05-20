import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Save, Search, Trash2, Apple } from "lucide-react";
import { LOCAL_FOODS } from "@/lib/foodsDb";

export const Route = createFileRoute("/_authenticated/admin/foods")({
  head: () => ({ meta: [{ title: "Alimentos — Admin Franzen" }] }),
  component: AdminFoodsPage,
});

type Food = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  serving_g: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  notes: string | null;
};

const blank = (): Food => ({
  id: "", name: "", brand: "", category: "",
  serving_g: 100, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: null, notes: "",
});

function AdminFoodsPage() {
  const [list, setList] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("custom_foods")
      .select("*")
      .order("name", { ascending: true });
    if (error) toast.error(error.message);
    setList((data as Food[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return list;
    return list.filter((f) =>
      f.name.toLowerCase().includes(n) ||
      (f.brand ?? "").toLowerCase().includes(n) ||
      (f.category ?? "").toLowerCase().includes(n),
    );
  }, [list, q]);

  const save = async () => {
    if (!selected) return;
    if (!selected.name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    const payload = {
      name: selected.name.trim(),
      brand: selected.brand || null,
      category: selected.category || null,
      serving_g: Number(selected.serving_g) || 100,
      kcal: Number(selected.kcal) || 0,
      protein: Number(selected.protein) || 0,
      carbs: Number(selected.carbs) || 0,
      fat: Number(selected.fat) || 0,
      fiber: selected.fiber == null || (selected.fiber as any) === "" ? null : Number(selected.fiber),
      notes: selected.notes || null,
    };
    const op = selected.id
      ? supabase.from("custom_foods").update(payload).eq("id", selected.id)
      : supabase.from("custom_foods").insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Alimento salvo");
    setSelected(null);
    load();
  };

  const remove = async () => {
    if (!selected?.id) { setSelected(null); return; }
    if (!confirm(`Excluir "${selected.name}"?`)) return;
    const { error } = await supabase.from("custom_foods").delete().eq("id", selected.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluído");
    setSelected(null);
    load();
  };

  const seedFromTaco = async () => {
    if (!confirm(`Importar ${LOCAL_FOODS.length} alimentos da base TACO/TBCA para edição?`)) return;
    setSeeding(true);
    const rows = LOCAL_FOODS.map((f) => ({
      name: f.name, category: f.source, brand: null, serving_g: 100,
      kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat,
    }));
    const { error } = await supabase.from("custom_foods").insert(rows);
    setSeeding(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Importado");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Apple className="text-primary" size={22}/>Alimentos
          </h1>
          <p className="text-sm text-muted-foreground">{list.length} alimentos cadastrados — valores por porção em gramas.</p>
        </div>
        <div className="flex gap-2">
          {list.length === 0 && (
            <Button variant="outline" size="sm" onClick={seedFromTaco} disabled={seeding}>
              {seeding ? <Loader2 className="animate-spin mr-1" size={14}/> : null}
              Importar base TACO/TBCA
            </Button>
          )}
          <Button size="sm" onClick={() => setSelected(blank())}>
            <Plus size={14} className="mr-1"/>Novo
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14}/>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alimento, marca, categoria…" className="pl-9"/>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-4">
        <Card className="p-2 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="grid place-items-center py-10"><Loader2 className="animate-spin text-primary"/></div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum alimento. Clique em "Novo" ou importe a base.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => setSelected({ ...f })}
                    className={`w-full text-left px-3 py-2 hover:bg-accent/40 rounded-md transition ${selected?.id === f.id ? "bg-accent/50" : ""}`}
                  >
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {f.brand ? `${f.brand} • ` : ""}{f.serving_g}g · {f.kcal} kcal · P{f.protein} C{f.carbs} G{f.fat}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          {!selected ? (
            <p className="text-sm text-muted-foreground text-center py-10">Selecione um alimento ou clique em "Novo".</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nome</Label>
                  <Input value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })}/>
                </div>
                <div>
                  <Label>Marca</Label>
                  <Input value={selected.brand ?? ""} onChange={(e) => setSelected({ ...selected, brand: e.target.value })}/>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input value={selected.category ?? ""} onChange={(e) => setSelected({ ...selected, category: e.target.value })}/>
                </div>
                <div>
                  <Label>Porção (g)</Label>
                  <Input type="number" value={selected.serving_g} onChange={(e) => setSelected({ ...selected, serving_g: Number(e.target.value) })}/>
                </div>
                <div>
                  <Label>Kcal</Label>
                  <Input type="number" value={selected.kcal} onChange={(e) => setSelected({ ...selected, kcal: Number(e.target.value) })}/>
                </div>
                <div>
                  <Label>Proteína (g)</Label>
                  <Input type="number" step="0.1" value={selected.protein} onChange={(e) => setSelected({ ...selected, protein: Number(e.target.value) })}/>
                </div>
                <div>
                  <Label>Carb (g)</Label>
                  <Input type="number" step="0.1" value={selected.carbs} onChange={(e) => setSelected({ ...selected, carbs: Number(e.target.value) })}/>
                </div>
                <div>
                  <Label>Gordura (g)</Label>
                  <Input type="number" step="0.1" value={selected.fat} onChange={(e) => setSelected({ ...selected, fat: Number(e.target.value) })}/>
                </div>
                <div>
                  <Label>Fibra (g)</Label>
                  <Input type="number" step="0.1" value={selected.fiber ?? ""} onChange={(e) => setSelected({ ...selected, fiber: e.target.value === "" ? null : Number(e.target.value) })}/>
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea rows={3} value={selected.notes ?? ""} onChange={(e) => setSelected({ ...selected, notes: e.target.value })}/>
              </div>
              <div className="flex gap-2">
                <Button onClick={save} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="animate-spin mr-1" size={14}/> : <Save className="mr-1" size={14}/>}
                  Salvar
                </Button>
                {selected.id && (
                  <Button variant="outline" onClick={remove}>
                    <Trash2 className="text-destructive" size={14}/>
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setSelected(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}