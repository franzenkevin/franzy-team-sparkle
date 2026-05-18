import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, ChevronRight, Camera, Dumbbell, Apple, FileText, Heart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/clients")({
  component: ClientsList,
});

type Row = {
  user_id: string; full_name: string | null; goal: string | null;
  age: number | null; sex: string | null; weight: number | null; height: number | null;
  anamnese_completed_at: string | null;
  photo_front_url: string | null; photo_back_url: string | null;
};

type ProtocolMini = { user_id: string; status: string; end_date: string; training: any; diet: any };

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}

function daysRemaining(endDate: string | null) {
  if (!endDate) return null;
  const ms = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 86400_000));
}

function ClientsList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [prots, setProts] = useState<Record<string, ProtocolMini>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "anamnese" | "no_anamnese" | "no_training" | "no_diet">("all");

  useEffect(() => {
    (async () => {
      const [{ data: profiles }, { data: protocols }] = await Promise.all([
        supabase.from("profiles")
          .select("user_id, full_name, goal, age, sex, weight, height, anamnese_completed_at, photo_front_url, photo_back_url")
          .order("created_at", { ascending: false }),
        supabase.from("protocols").select("user_id, status, end_date, training, diet").eq("status", "active"),
      ]);
      setRows((profiles ?? []) as Row[]);
      const map: Record<string, ProtocolMini> = {};
      for (const p of (protocols ?? []) as ProtocolMini[]) map[p.user_id] = p;
      setProts(map);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (q && !(r.full_name ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      const prot = prots[r.user_id];
      if (filterStatus === "anamnese" && !r.anamnese_completed_at) return false;
      if (filterStatus === "no_anamnese" && r.anamnese_completed_at) return false;
      if (filterStatus === "no_training" && prot?.training) return false;
      if (filterStatus === "no_diet" && prot?.diet) return false;
      return true;
    });
  }, [rows, q, filterStatus, prots]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">{rows.length} clientes cadastrados</p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid sm:grid-cols-[1fr_240px] gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome…" className="pl-9" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="all">Todos os status</option>
            <option value="anamnese">Com anamnese</option>
            <option value="no_anamnese">Sem anamnese</option>
            <option value="no_training">Sem treino ativo</option>
            <option value="no_diet">Sem dieta ativa</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} resultado(s)</p>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const prot = prots[r.user_id];
            const dr = daysRemaining(prot?.end_date ?? null);
            const hasTraining = !!prot?.training && Object.keys(prot.training ?? {}).length > 0;
            const hasDiet = !!prot?.diet && Object.keys(prot.diet ?? {}).length > 0;
            return (
              <Link key={r.user_id} to="/admin/clients/$id" params={{ id: r.user_id }}>
                <Card className="p-4 hover:border-primary/60 transition flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/15 text-primary font-bold">{initials(r.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{r.full_name ?? "(sem nome)"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.sex ?? "—"} · {r.age ?? "—"}a · {r.weight ?? "—"}kg · {r.goal ?? "sem objetivo"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={r.anamnese_completed_at ? "default" : "outline"} className="text-[10px]">
                        <FileText size={10} className="mr-1" />{r.anamnese_completed_at ? "Anamnese" : "Sem anamnese"}
                      </Badge>
                      <Badge variant={r.photo_front_url ? "default" : "outline"} className="text-[10px]">
                        <Camera size={10} className="mr-1" />Fotos
                      </Badge>
                      <Badge variant={hasTraining ? "default" : "outline"} className="text-[10px]">
                        <Dumbbell size={10} className="mr-1" />Treino
                      </Badge>
                      <Badge variant={hasDiet ? "default" : "outline"} className="text-[10px]">
                        <Apple size={10} className="mr-1" />Dieta
                      </Badge>
                      {dr != null && (
                        <Badge variant="outline" className="text-[10px]">
                          <Heart size={10} className="mr-1" />{dr}d restantes
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="text-muted-foreground shrink-0" size={18} />
                </Card>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <Card className="p-10 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</Card>
          )}
        </div>
      )}
    </div>
  );
}
