import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dumbbell, Loader2, Plus, Trash2, Save, Search, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
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

const PAGE_SIZE = 12;
const empty: Exercise = { id: "", name: "", category: "", equipment: "", instructions: "", video_url: "" };

function ExercisesPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<Exercise[]>([]);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"category" | "name">("category");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!r);
    }
    const { data } = await supabase.from("exercises").select("*");
    setItems((data ?? []) as Exercise[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [q, categoryFilter, sortBy, sortDir]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((e) => e.category).filter(Boolean))).sort(),
    [items]
  );

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    const list = items.filter((e) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      if (!ql) return true;
      return e.name.toLowerCase().includes(ql) ||
             e.category.toLowerCase().includes(ql) ||
             (e.equipment ?? "").toLowerCase().includes(ql);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortBy === "category") {
        const c = a.category.localeCompare(b.category) * dir;
        if (c !== 0) return c;
        return a.name.localeCompare(b.name) * dir;
      }
      const n = a.name.localeCompare(b.name) * dir;
      if (n !== 0) return n;
      return a.category.localeCompare(b.category) * dir;
    });
  }, [items, q, categoryFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleVideoUpload = async (file: File) => {
    if (!editing) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Vídeo deve ter no máximo 50MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `exercises/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("exercise-media").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("exercise-media").getPublicUrl(path);
      setEditing({ ...editing, video_url: pub.publicUrl });
      toast.success("Vídeo enviado");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao enviar vídeo");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.category.trim()) {
      toast.error("Nome e categoria são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editing.name.trim(),
        category: editing.category.trim(),
        equipment: editing.equipment?.trim() || null,
        instructions: editing.instructions?.trim() || null,
        video_url: editing.video_url?.trim() || null,
      };
      if (editing.id) {
        const { error } = await supabase.from("exercises").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exercises").insert(payload);
        if (error) throw error;
      }
      toast.success("Salvo");
      setEditing(null);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar");
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

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as "category" | "name")}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="category">Categoria</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}>
          <ArrowUpDown size={14} className="mr-1" /> {sortDir === "asc" ? "A→Z" : "Z→A"}
        </Button>
      </div>

      {editing && (
        <div className="mt-4 rounded-xl border border-primary/40 bg-card p-4 space-y-3">
          <h2 className="font-heading font-semibold">{editing.id ? "Editar exercício" : "Novo exercício"}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Nome *</Label>
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <Label>Categoria *</Label>
              <Input list="cat-list" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Peito, Costas, Pernas..." />
              <datalist id="cat-list">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="sm:col-span-2">
              <Label>Equipamento</Label>
              <Input value={editing.equipment ?? ""} onChange={(e) => setEditing({ ...editing, equipment: e.target.value })} placeholder="Halter, Barra, Máquina..." />
            </div>
            <div className="sm:col-span-2">
              <Label>Instruções de execução</Label>
              <Textarea rows={4} value={editing.instructions ?? ""} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} placeholder="Passo a passo, postura, dicas técnicas..." />
            </div>
            <div className="sm:col-span-2">
              <Label>Vídeo</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input className="flex-1" value={editing.video_url ?? ""} onChange={(e) => setEditing({ ...editing, video_url: e.target.value })} placeholder="URL (YouTube, MP4...)" />
                <label className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background hover:bg-accent px-3 py-2 text-sm cursor-pointer">
                  {uploading ? <Loader2 className="animate-spin" size={14} /> : "Upload"}
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleVideoUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {editing.video_url && (
                <a href={editing.video_url} target="_blank" rel="noreferrer" className="text-xs text-primary mt-1 inline-block hover:underline">
                  Pré-visualizar →
                </a>
              )}
            </div>
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

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">Nenhum exercício encontrado.</p>
      ) : (
        <>
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            {pageItems.map((ex) => (
              <div key={ex.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-primary/80 font-mono">{ex.category}</p>
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

          <div className="mt-6 flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft size={14} />
              </Button>
              <span className="text-muted-foreground tabular-nums">{currentPage} / {totalPages}</span>
              <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
