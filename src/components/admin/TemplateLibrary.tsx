import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { useServerFn } from "@tanstack/react-start";
import { adminListTemplates, adminSaveTemplate, adminDeleteTemplate } from "@/lib/admin.functions";
import { toast } from "sonner";
import { Library, Save, Trash2, Loader2 } from "lucide-react";

type Kind = "training" | "diet" | "hormones";

export function TemplateLibrary({
  kind, currentValue, onLoad,
}: {
  kind: Kind;
  currentValue: unknown;
  onLoad: (value: unknown) => void;
}) {
  const [open, setOpen] = useState<"none" | "save" | "load">("none");
  const [name, setName] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const listFn = useServerFn(adminListTemplates);
  const saveFn = useServerFn(adminSaveTemplate);
  const delFn = useServerFn(adminDeleteTemplate);

  const load = async () => {
    setLoading(true);
    try {
      const { templates } = await listFn({ data: { kind } });
      setList(templates);
    } catch (e: any) { toast.error(e?.message ?? "Erro ao listar"); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open === "load") load(); }, [open]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Dê um nome ao modelo"); return; }
    setSaving(true);
    try {
      await saveFn({ data: { name: name.trim(), kind, data: currentValue } });
      toast.success("Modelo salvo na biblioteca");
      setName(""); setOpen("none");
    } catch (e: any) { toast.error(e?.message ?? "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await delFn({ data: { id } }); toast.success("Modelo removido"); load(); }
    catch (e: any) { toast.error(e?.message ?? "Erro ao remover"); }
  };

  return (
    <div className="inline-flex gap-1">
      <Button size="sm" variant="outline" onClick={() => setOpen("save")}>
        <Save size={12} className="mr-1" /> Salvar modelo
      </Button>
      <Button size="sm" variant="outline" onClick={() => setOpen("load")}>
        <Library size={12} className="mr-1" /> Biblioteca
      </Button>

      <Dialog open={open === "save"} onOpenChange={(o) => !o && setOpen("none")}>
        <DialogContent>
          <DialogHeader><DialogTitle>Salvar modelo de {kindLabel(kind)}</DialogTitle></DialogHeader>
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="Ex.: Hipertrofia 5x — Iniciante" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen("none")}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "load"} onOpenChange={(o) => !o && setOpen("none")}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Biblioteca de {kindLabel(kind)}</DialogTitle></DialogHeader>
          {loading ? (
            <div className="py-8 flex justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum modelo salvo ainda.</p>
          ) : (
            <div className="space-y-2">
              {list.map((t) => (
                <Card key={t.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.updated_at).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" onClick={() => { onLoad(t.data); setOpen("none"); toast.success("Modelo carregado"); }}>
                      Usar
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(t.id)}>
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function kindLabel(k: Kind) {
  return k === "training" ? "Treino" : k === "diet" ? "Dieta" : "Hormônios";
}
