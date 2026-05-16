import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, FlaskConical, ChevronUp, ChevronDown } from "lucide-react";

export type HormoneItem = {
  substance?: string;
  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  category?: string;
  notes?: string;
};

function normalize(value: unknown): HormoneItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((h: any) => ({
    substance: h?.substance ?? h?.name ?? "",
    dose: h?.dose ?? "",
    route: h?.route ?? "",
    frequency: h?.frequency ?? "",
    duration: h?.duration ?? "",
    category: h?.category ?? "",
    notes: h?.notes ?? "",
  }));
}

export function HormonesEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: HormoneItem[]) => void;
}) {
  const items = useMemo(() => normalize(value), [value]);

  const update = (next: HormoneItem[]) => onChange(next);
  const setItem = (i: number, patch: Partial<HormoneItem>) => {
    const nx = [...items];
    nx[i] = { ...nx[i], ...patch };
    update(nx);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const nx = [...items];
    [nx[i], nx[j]] = [nx[j], nx[i]];
    update(nx);
  };
  const add = () =>
    update([
      ...items,
      { substance: "", dose: "", route: "IM", frequency: "1x/sem", duration: "" },
    ]);
  const remove = (i: number) => update(items.filter((_, k) => k !== i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-2">
          <FlaskConical size={14} className="text-primary" /> Hormônios &amp; suplementação
        </div>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus size={14} className="mr-1" />
          Adicionar item
        </Button>
      </div>

      {items.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhum item. Use "Adicionar item" para incluir hormônios ou suplementos.
        </Card>
      )}

      {items.map((h, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <div className="h-9 w-9 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
              {i + 1}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
              <Input
                placeholder="Substância (ex.: Testosterona)"
                value={h.substance ?? ""}
                onChange={(e) => setItem(i, { substance: e.target.value })}
              />
              <select
                className="rounded-md border border-input bg-background px-2 text-sm h-9"
                value={h.category ?? ""}
                onChange={(e) => setItem(i, { category: e.target.value })}
              >
                <option value="">Categoria…</option>
                <option value="hormone">Hormônio</option>
                <option value="supplement">Suplemento</option>
                <option value="ancillary">Auxiliar / TPC</option>
                <option value="peptide">Peptídeo</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
                <ChevronUp size={14} />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                <ChevronDown size={14} />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(i)}>
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">Dose</Label>
              <Input
                className="h-8 mt-1 text-xs"
                placeholder="200mg"
                value={h.dose ?? ""}
                onChange={(e) => setItem(i, { dose: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Via</Label>
              <Input
                className="h-8 mt-1 text-xs"
                placeholder="IM / VO / SC"
                value={h.route ?? ""}
                onChange={(e) => setItem(i, { route: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Frequência</Label>
              <Input
                className="h-8 mt-1 text-xs"
                placeholder="1x/sem"
                value={h.frequency ?? ""}
                onChange={(e) => setItem(i, { frequency: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Duração</Label>
              <Input
                className="h-8 mt-1 text-xs"
                placeholder="12 semanas"
                value={h.duration ?? ""}
                onChange={(e) => setItem(i, { duration: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea
              className="text-xs mt-1"
              rows={2}
              placeholder="Cuidados, sinergia, exames…"
              value={h.notes ?? ""}
              onChange={(e) => setItem(i, { notes: e.target.value })}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
