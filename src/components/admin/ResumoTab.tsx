import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, MessageSquare, Clock, CheckCircle2, FileText,
  TrendingDown, BarChart3, ChevronRight, CalendarDays, Bell, ImageIcon,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

type ProfileMini = {
  user_id: string;
  full_name: string | null;
  sex: string | null;
  created_at: string;
};

type Counts = {
  activeClients: number;
  menCount: number;
  womenCount: number;
  pendingApprovals: number;
  pendingFeedbacks: number;
  unreadMessages: number;
  dropouts30d: number;
  renewalRate: number; // %
};

function greeting(name?: string | null) {
  const h = new Date().getHours();
  const part = h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return `${part}, ${name?.split(" ")[0] ?? "Coach"}!`;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function ResumoTab() {
  const [coachName, setCoachName] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [profiles, setProfiles] = useState<ProfileMini[]>([]);
  const [recentFeedbacks, setRecentFeedbacks] = useState<
    { user_id: string; full_name: string | null; status: "Pendente" | "Respondido"; created_at: string }[]
  >([]);
  const [pendingAnalyses, setPendingAnalyses] = useState<
    { id: string; user_id: string; full_name: string | null; kind: string; created_at: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const me = session?.user;
      if (me) {
        const { data: p } = await supabase
          .from("profiles").select("full_name").eq("user_id", me.id).maybeSingle();
        if (!cancelled) setCoachName(p?.full_name ?? me.email ?? null);
      }

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const thirtyAgo = new Date(Date.now() - 30 * 86400_000).toISOString();

      const [
        { data: profs },
        { count: activeCount },
        { count: pendingApprovals },
        { data: pendingFb },
        { count: unreadMessages },
        { data: protocols },
        { data: pendingAn },
      ] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, sex, created_at").order("created_at", { ascending: false }),
        supabase.from("protocols").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("protocols").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("weekly_feedbacks").select("id, user_id, created_at, notes").order("created_at", { ascending: false }).limit(20),
        supabase.from("messages").select("id", { count: "exact", head: true }).is("read_at", null),
        supabase.from("protocols").select("user_id, status, created_at, end_date"),
        supabase.from("ai_analyses").select("id, user_id, kind, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(10),
      ]);
      if (cancelled) return;

      const profList = (profs ?? []) as ProfileMini[];
      setProfiles(profList);
      const nameById = new Map(profList.map((p) => [p.user_id, p.full_name]));

      const men = profList.filter((p) => (p.sex ?? "").toLowerCase().startsWith("m")).length;
      const women = profList.filter((p) => (p.sex ?? "").toLowerCase().startsWith("f")).length;

      // dropouts: ended protocols in last 30d with no active protocol after
      const byUser = new Map<string, { active: boolean; endedRecent: boolean }>();
      for (const r of (protocols ?? []) as any[]) {
        const cur = byUser.get(r.user_id) ?? { active: false, endedRecent: false };
        if (r.status === "active") cur.active = true;
        if (r.end_date && new Date(r.end_date) > new Date(Date.now() - 30 * 86400_000) && new Date(r.end_date) < new Date()) {
          cur.endedRecent = true;
        }
        byUser.set(r.user_id, cur);
      }
      const dropouts = Array.from(byUser.values()).filter((v) => v.endedRecent && !v.active).length;

      // renewal rate: users with >= 2 protocols / total users with any protocol
      const usersWithProtos = new Map<string, number>();
      for (const r of (protocols ?? []) as any[]) {
        usersWithProtos.set(r.user_id, (usersWithProtos.get(r.user_id) ?? 0) + 1);
      }
      const renewed = Array.from(usersWithProtos.values()).filter((n) => n >= 2).length;
      const totalWith = usersWithProtos.size;
      const renewalRate = totalWith ? Math.round((renewed / totalWith) * 100) : 0;

      setCounts({
        activeClients: activeCount ?? 0,
        menCount: men,
        womenCount: women,
        pendingApprovals: pendingApprovals ?? 0,
        pendingFeedbacks: (pendingFb ?? []).length,
        unreadMessages: unreadMessages ?? 0,
        dropouts30d: dropouts,
        renewalRate,
      });

      setRecentFeedbacks(
        (pendingFb ?? []).slice(0, 6).map((f: any) => ({
          user_id: f.user_id,
          full_name: nameById.get(f.user_id) ?? "(sem nome)",
          status: f.notes ? "Respondido" : "Pendente",
          created_at: f.created_at,
        })),
      );

      setPendingAnalyses(
        (pendingAn ?? []).map((a: any) => ({
          id: a.id,
          user_id: a.user_id,
          full_name: nameById.get(a.user_id) ?? "(sem nome)",
          kind: a.kind,
          created_at: a.created_at,
        })),
      );
    })();
    return () => { cancelled = true; };
  }, []);

  const semester = useMemo(() => {
    const now = new Date();
    const arr: { label: string; novos: number; renovacoes: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
      arr.push({ label, novos: 0, renovacoes: 0 });
    }
    for (const p of profiles) {
      const d = new Date(p.created_at);
      const idx = arr.findIndex((m) => m.label === `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`);
      if (idx >= 0) arr[idx].novos += 1;
    }
    return arr;
  }, [profiles]);

  const total = (counts?.menCount ?? 0) + (counts?.womenCount ?? 0);
  const menPct = total ? Math.round(((counts?.menCount ?? 0) / total) * 100) : 0;
  const womenPct = total ? 100 - menPct : 0;

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold">{greeting(coachName)} 👋</h2>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe o desempenho do seu negócio</p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-full"><Bell size={16} /></Button>
          <div className="size-10 rounded-full bg-primary text-primary-foreground grid place-items-center font-semibold">
            {initials(coachName)}
          </div>
        </div>
      </div>

      {/* Agendamentos / Feedbacks pendentes */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="size-8 rounded-md bg-primary/15 grid place-items-center text-primary">
            <CalendarDays size={16} />
          </div>
          <h3 className="font-heading font-semibold">Agendamentos & Feedbacks</h3>
        </div>
        {recentFeedbacks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum feedback recente.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentFeedbacks.map((f) => (
              <li key={`${f.user_id}-${f.created_at}`} className="py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">{f.full_name}</p>
                  <p className="text-xs text-muted-foreground">Feedback semanal</p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    f.status === "Pendente"
                      ? "bg-primary/15 text-primary"
                      : "bg-success/15 text-success"
                  }`}
                >
                  {f.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Análises pendentes */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="size-8 rounded-md bg-primary/15 grid place-items-center text-primary">
            <ImageIcon size={16} />
          </div>
          <h3 className="font-heading font-semibold">Análises pendentes</h3>
        </div>
        {pendingAnalyses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma análise aguardando revisão.</p>
        ) : (
          <ul className="divide-y divide-border">
            {pendingAnalyses.map((a) => (
              <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{a.kind.replace(/_/g, " ")}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary">Revisar</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Dashboard KPIs */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-8 rounded-md bg-primary/15 grid place-items-center text-primary">
            <BarChart3 size={16} />
          </div>
          <h3 className="font-heading font-semibold">Dashboard</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <KpiCard icon={<Clock size={16} />} label="Aprovações pendentes" value={counts?.pendingApprovals ?? 0} href="#approvals" />
          <KpiCard icon={<CheckCircle2 size={16} />} label="Atendimentos ativos" value={counts?.activeClients ?? 0} />
          <KpiCard icon={<FileText size={16} />} label="Feedbacks pendentes" value={counts?.pendingFeedbacks ?? 0} highlight />
          <KpiCard icon={<MessageSquare size={16} />} label="Conversas não lidas" value={counts?.unreadMessages ?? 0} />
          <KpiCard icon={<TrendingDown size={16} />} label="Desistências (30d)" value={counts?.dropouts30d ?? 0} />
          <KpiCard icon={<Users size={16} />} label="Taxa de renovação" value={`${counts?.renewalRate ?? 0}%`} />
        </div>
      </Card>

      {/* Active clients gender split */}
      <Card className="p-5">
        <div className="flex flex-col items-center text-center">
          <div className="size-12 rounded-xl bg-primary/15 grid place-items-center text-primary">
            <Users size={22} />
          </div>
          <p className="text-4xl font-heading font-bold mt-3">{counts?.activeClients ?? 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Clientes ativos</p>
        </div>
        <div className="mt-5">
          <div className="flex h-7 w-full rounded-full overflow-hidden bg-muted text-xs font-semibold">
            <div
              className="bg-primary text-primary-foreground grid place-items-center"
              style={{ width: `${menPct}%` }}
            >
              {menPct > 8 ? `${menPct}%` : ""}
            </div>
            <div
              className="bg-foreground text-background grid place-items-center"
              style={{ width: `${womenPct}%` }}
            >
              {womenPct > 8 ? `${womenPct}%` : ""}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-primary" />
              <span>Homens ({counts?.menCount ?? 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-foreground" />
              <span>Mulheres ({counts?.womenCount ?? 0})</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Semester chart */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="size-8 rounded-md bg-primary/15 grid place-items-center text-primary">
            <BarChart3 size={16} />
          </div>
          <h3 className="font-heading font-semibold">Último semestre</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Novos clientes por mês</p>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={semester} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-novos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="novos" stroke="var(--primary)" strokeWidth={2} fill="url(#grad-novos)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="flex justify-end">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
            Ir para o app do aluno <ChevronRight size={14} />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, value, href, highlight,
}: { icon: React.ReactNode; label: string; value: number | string; href?: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-heading font-bold mt-1">{value}</p>
        </div>
        <div className="size-9 rounded-lg bg-primary/15 grid place-items-center text-primary">
          {icon}
        </div>
      </div>
      {href && (
        <a href={href} className="mt-3 inline-flex items-center text-xs text-primary hover:underline">
          ver detalhes <ChevronRight size={12} />
        </a>
      )}
    </div>
  );
}