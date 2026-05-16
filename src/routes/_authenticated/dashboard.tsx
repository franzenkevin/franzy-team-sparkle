import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dumbbell, Apple, LineChart, History, Bell, Download, ShoppingCart,
  Coffee, Flame, Calendar, Pill, ChevronRight, MessageSquare,
} from "lucide-react";
import { useReminders } from "@/hooks/useReminders";
import { generateProtocolPdf } from "@/lib/protocolPdf";
import { generateShoppingListPdf } from "@/lib/shoppingList";
import { NotificationBell } from "@/components/NotificationBell";
import { AchievementsCard } from "@/components/AchievementsCard";
import { toast } from "sonner";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Franzen Team" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const [name, setName] = useState<string>("");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [downloading, setDownloading] = useState(false);
  const [downloadingList, setDownloadingList] = useState(false);
  const [protocol, setProtocol] = useState<any | null>(null);
  const [trainingDays, setTrainingDays] = useState<any[]>([]);
  const [workoutsDone, setWorkoutsDone] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [adherence, setAdherence] = useState<number | null>(null);
  const navigate = useNavigate();

  useReminders(8, 0, "Franzen Team", "Bom dia! Hora do treino e check-in.");

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, onboarding_complete")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!p?.onboarding_complete) { navigate({ to: "/onboarding" }); return; }
      setName(p.full_name ?? user.email ?? "");

      const { data: prot } = await supabase
        .from("protocols")
        .select("id, training, start_date, end_date, version, status")
        .eq("user_id", user.id).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      setProtocol(prot);
      const days = ((prot?.training as any)?.days ?? (prot?.training as any)?.workouts ?? []) as any[];
      setTrainingDays(Array.isArray(days) ? days : []);

      if (prot) {
        const { data: logs } = await supabase
          .from("workout_logs")
          .select("sets, session_date")
          .eq("user_id", user.id).eq("protocol_id", prot.id);
        const sessionDates = new Set<string>();
        let volume = 0;
        for (const l of logs ?? []) {
          sessionDates.add(l.session_date as string);
          for (const s of (l.sets ?? []) as any[]) {
            if (s?.completed) volume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
          }
        }
        setWorkoutsDone(sessionDates.size);
        setTotalVolume(Math.round(volume));

        const { data: ch } = await supabase
          .from("checkins")
          .select("adherence")
          .eq("user_id", user.id)
          .not("adherence", "is", null);
        const vals = (ch ?? []).map((c: any) => Number(c.adherence)).filter((n) => !isNaN(n));
        setAdherence(vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null);
      }
    })();
  }, [navigate]);

  const requestNotif = async () => {
    if (typeof Notification === "undefined") return;
    const r = await Notification.requestPermission();
    setPermission(r);
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profile }, { data: protocol }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("protocols").select("training, diet, start_date, end_date, version")
          .eq("user_id", user.id).eq("status", "active")
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!protocol) {
        toast.error("Nenhum protocolo ativo encontrado");
        return;
      }
      generateProtocolPdf({
        fullName: profile?.full_name ?? "",
        protocol: protocol as any,
      });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF");
    } finally {
      setDownloading(false);
    }
  };

  const downloadShoppingList = async () => {
    setDownloadingList(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profile }, { data: protocol }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("protocols").select("diet")
          .eq("user_id", user.id).eq("status", "active")
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!protocol?.diet) {
        toast.error("Nenhuma dieta ativa encontrada");
        return;
      }
      generateShoppingListPdf({
        fullName: profile?.full_name ?? "",
        diet: protocol.diet as any,
      });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar lista");
    } finally {
      setDownloadingList(false);
    }
  };

  const journey = useMemo(() => {
    if (!protocol?.start_date || !protocol?.end_date) return null;
    const start = new Date(protocol.start_date).getTime();
    const end = new Date(protocol.end_date).getTime();
    const now = Date.now();
    const total = Math.max(1, Math.round((end - start) / 86400_000));
    const elapsed = Math.max(0, Math.min(total, Math.round((now - start) / 86400_000)));
    const remaining = Math.max(0, total - elapsed);
    const pct = Math.round((elapsed / total) * 100);
    return { total, elapsed, remaining, pct };
  }, [protocol]);

  const todayName = WEEKDAYS[new Date().getDay()];
  const todayDay = trainingDays.find((d: any) => d?.weekday === todayName);
  const trainingDaysPerWeek = trainingDays.filter((d: any) => d?.weekday && (d.exercises?.length ?? 0) > 0).length;
  const nextDay = trainingDays.find((d: any) => {
    if (!d?.weekday) return false;
    const idx = WEEKDAYS.indexOf(d.weekday);
    return idx > new Date().getDay() && (d.exercises?.length ?? 0) > 0;
  }) || trainingDays.find((d: any) => (d?.exercises?.length ?? 0) > 0);

  return (
    <div>
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Bem-vindo de volta</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold mt-0.5">
              {name || "Atleta"}
            </h1>
          </div>
          <NotificationBell />
        </div>

        {protocol ? (
          <Card className="mt-5 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold">Protocolo Atual</h3>
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border border-primary/40 text-primary">
                Ativo
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <BigStat value={`${trainingDaysPerWeek}x`} label="Dias/semana" />
              <BigStat value={`${journey?.remaining ?? "—"}`} label="Dias p/ troca" />
              <BigStat value={`v${protocol.version ?? 1}`} label="Versão" />
            </div>
          </Card>
        ) : (
          <Card className="mt-5 p-5 text-center text-muted-foreground">
            Nenhum protocolo ativo. Aguarde seu coach liberar.
          </Card>
        )}

        {journey && (
          <Card className="mt-4 p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 grid place-items-center">
                  <Calendar className="text-primary" size={18} />
                </div>
                <div>
                  <h3 className="font-heading font-semibold">Sua jornada</h3>
                  <p className="text-xs text-muted-foreground">Dia {journey.elapsed} de {journey.total} • {journey.remaining} restantes</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-primary">{journey.pct}%</p>
            </div>
            <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${journey.pct}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat icon={Dumbbell} value={workoutsDone} label="Treinos feitos" />
              <MiniStat icon={Apple} value={`${totalVolume.toLocaleString("pt-BR")}kg`} label="Volume total" />
              <MiniStat icon={LineChart} value={adherence != null ? `${adherence}%` : "0%"} label="Aderência" accent="text-warning" />
            </div>
          </Card>
        )}

        <Card className="mt-4 p-5 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
              {todayDay ? <Flame className="text-primary" size={18} /> : <Coffee className="text-primary" size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold">
                {todayDay ? `Hoje — ${todayDay.name ?? "Treino"}` : "Hoje é dia de descanso"}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {todayDay
                  ? `${todayDay.exercises?.length ?? 0} exercícios programados`
                  : "Aproveite para recuperar. Veja abaixo os próximos treinos."}
              </p>
              {nextDay && !todayDay && (
                <p className="text-xs mt-2">
                  Próximo treino: <span className="text-primary font-medium">{nextDay.weekday} — {nextDay.name}</span>
                </p>
              )}
              <Link to="/training" className="inline-flex items-center gap-1 text-primary text-sm font-medium mt-3 hover:underline">
                Ir para o treino <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </Card>

        <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-4">
          <DashCard to="/training" icon={Dumbbell} title="Treinos" desc="Protocolo e séries" />
          <DashCard to="/diet" icon={Apple} title="Nutrição" desc="Refeições e macros" />
          <DashCard to="/hormones" icon={Pill} title="Hormônios" desc="Prescrição ativa" />
          <DashCard to="/progress" icon={LineChart} title="Progresso" desc="Check-ins e fotos" />
        </div>

        <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-2">
          <DashCard to="/history" icon={History} title="Histórico" desc="Versões anteriores" />
          <DashCard to="/messages" icon={MessageSquare} title="Mensagens" desc="Falar com o coach" />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {permission !== "granted" && (
            <button
              onClick={requestNotif}
              className="w-full sm:w-auto inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition px-4 py-2 text-sm"
            >
              <Bell size={16} className="text-primary" />
              Ativar lembretes diários
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={downloadPdf}
            disabled={downloading}
            className="w-full sm:w-auto"
          >
            <Download size={16} className="mr-2" />
            {downloading ? "Gerando..." : "Baixar protocolo (PDF)"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadShoppingList}
            disabled={downloadingList}
            className="w-full sm:w-auto"
          >
            <ShoppingCart size={16} className="mr-2" />
            {downloadingList ? "Gerando..." : "Lista de compras"}
          </Button>
        </div>

        <div className="mt-6">
          <AchievementsCard />
        </div>
      </main>
    </div>
  );
}

function BigStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl sm:text-3xl font-bold text-primary font-heading">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, value, label, accent }: { icon: any; value: any; label: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-secondary/30 p-3 text-center">
      <Icon className={`mx-auto mb-1 ${accent ?? "text-primary"}`} size={14} />
      <p className="font-bold text-base">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function DashCard({ to, icon: Icon, title, desc }: { to: string; icon: any; title: string; desc: string }) {
  return (
    <Link to={to} className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:border-primary transition flex flex-col gap-2">
      <Icon size={20} className="text-primary" />
      <h3 className="font-heading text-sm sm:text-base font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </Link>
  );
}
