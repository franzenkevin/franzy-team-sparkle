import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Replace } from "lucide-react";

type Alt = { id: string; name: string; category: string; equipment: string | null };

export function SubstitutionDialog({
  open,
  onOpenChange,
  exerciseName,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  exerciseName: string;
  onPick: (alt: Alt) => void;
}) {
  const [alts, setAlts] = useState<Alt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      // 1) try to find the source exercise to grab its category/equipment
      const { data: src } = await supabase
        .from("exercises")
        .select("category, equipment")
        .ilike("name", exerciseName)
        .maybeSingle();

      let q = supabase.from("exercises").select("id, name, category, equipment").limit(20);
      if (src?.category) q = q.eq("category", src.category);
      else {
        // fallback: token match on name
        const token = exerciseName.split(" ")[0]?.slice(0, 6) ?? "";
        if (token) q = q.ilike("name", `%${token}%`);
      }
      const { data } = await q;
      setAlts((data ?? []).filter((e) => e.name.toLowerCase() !== exerciseName.toLowerCase()) as Alt[]);
      setLoading(false);
    })();
  }, [open, exerciseName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Replace size={18} className="text-primary" /> Trocar exercício
          </DialogTitle>
          <DialogDescription>
            Sugestões da mesma categoria de <strong>{exerciseName}</strong>.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : alts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma alternativa cadastrada na biblioteca.
          </p>
        ) : (
          <div className="space-y-2">
            {alts.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  onPick(a);
                  onOpenChange(false);
                }}
                className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-primary transition"
              >
                <p className="font-medium text-sm">{a.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.category}
                  {a.equipment ? ` · ${a.equipment}` : ""}
                </p>
              </button>
            ))}
          </div>
        )}
        <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-2">
          Cancelar
        </Button>
      </DialogContent>
    </Dialog>
  );
}