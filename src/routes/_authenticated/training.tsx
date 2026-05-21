import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Dumbbell, Loader2, Timer, X, Star, MessageSquare, Replace, Coffee, Flame, ChevronDown, ChevronUp, Activity, Play, Info, Check, Target, Youtube } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { Textarea } from "@/components/ui/textarea";
import { evaluateWorkoutAchievements } from "@/lib/achievements";

export const Route = createFileRoute("/_authenticated/training")({
  head: () => ({ meta: [{ title: "Treino — Franzen Team" }] }),
  component: TrainingPage,
});

type WorkoutSet = {
  type: "warmup" | "valid";
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
};

type Exercise = {
  id: string;
  name: string;
  sets?: number;
  reps?: string | number;
  rest?: string;
  notes?: string;
  warmupSets?: number;
  videoUrl?: string;
  video_url?: string;
  rationale?: string;
};

type MobilityItem = { name: string; prescription?: string; corrects?: string; tag?: string };
type TrainingDay = {
  weekday?: string;
  name?: string;
  exercises: Exercise[];
  rationale?: string;
  mobility?: MobilityItem[];
  cardio?: { duration?: string; frequency?: string; notes?: string };
};

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const todayWeekday = WEEKDAYS[new Date().getDay()];
const todayISO = new Date().toISOString().split("T")[0];

function normalizeTraining(training: unknown): TrainingDay[] {
  if (!training) return [];
  const t = training as Record<string, unknown>;
  const days = (t.days ?? t.training_days ?? t.workouts) as unknown;
  if (!Array.isArray(days)) return [];
  return days.map((d: any, i: number) => ({
    weekday: d.weekday,
    name: d.name ?? d.title ?? `Treino ${i + 1}`,
    exercises: Array.isArray(d.exercises) ? d.exercises : [],
    rationale: d.rationale ?? d.why,
    mobility: Array.isArray(d.mobility) ? d.mobility : undefined,
    cardio: d.cardio,
  }));
}

function TrainingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [protocol, setProtocol] = useState<{ id: string; training: unknown } | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [exerciseSets, setExerciseSets] = useState<Record<string, WorkoutSet[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [previousSets, setPreviousSets] = useState<Record<string, WorkoutSet[]>>({});
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const restRef = useRef<number | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackNotes, setFeedbackNotes] = useState<string>("");
  const [storyPhoto, setStoryPhoto] = useState<File | null>(null);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [storyUrl, setStoryUrl] = useState<string | null>(null);
  const [storyBlob, setStoryBlob] = useState<Blob | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [showDynamics, setShowDynamics] = useState(false);
  const [expandedEx, setExpandedEx] = useState<Record<string, boolean>>({});
  const [exerciseVideos, setExerciseVideos] = useState<Record<string, string>>({});
  const [subSuggestion, setSubSuggestion] = useState<Record<string, { loading?: boolean; alt?: { id: string; name: string; category: string; equipment: string | null } | null }>>({});

  // Rest timer countdown
  useEffect(() => {
    if (restSeconds === null) return;
    if (restSeconds <= 0) {
      try { new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play().catch(() => {}); } catch { /* noop */ }
      toast.success("Descanso concluído!");
      setRestSeconds(null);
      return;
    }
    const t = window.setTimeout(() => setRestSeconds((s) => (s === null ? null : s - 1)), 1000);
    restRef.current = t;
    return () => window.clearTimeout(t);
  }, [restSeconds]);

  const parseRest = (rest?: string): number => {
    if (!rest) return 90;
    const m = String(rest).match(/(\d+)\s*(s|seg|min|m)?/i);
    if (!m) return 90;
    const n = Number(m[1]);
    const unit = (m[2] ?? "s").toLowerCase();
    return unit.startsWith("m") ? n * 60 : n;
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("protocols")
        .select("id, training")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setProtocol(data);
      setLoading(false);
    })();
  }, []);

  const days = useMemo(() => normalizeTraining(protocol?.training), [protocol]);

  // Auto-select today's day
  useEffect(() => {
    if (days.length === 0) return;
    const idx = days.findIndex((d) => d.weekday === todayWeekday);
    setSelectedDay(idx >= 0 ? idx : 0);
  }, [days.length]);

  const day = days[selectedDay];

  // Load saved logs for selected day
  useEffect(() => {
    if (!protocol || !day) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: logs } = await supabase
        .from("workout_logs")
        .select("exercise_id, sets")
        .eq("user_id", user.id)
        .eq("protocol_id", protocol.id)
        .eq("day_index", selectedDay)
        .eq("session_date", todayISO);

      const initial: Record<string, WorkoutSet[]> = {};
      for (const ex of day.exercises) {
        const saved = logs?.find((l) => l.exercise_id === ex.id);
        if (saved) {
          initial[ex.id] = saved.sets as WorkoutSet[];
        } else {
          const validCount = Math.min(Math.max(Number(ex.sets) || 3, 1), 6);
          // 2 séries de aquecimento fixas por padrão (sobrescritível pelo coach via warmupSets)
          const warmupCount = Math.min(
            Math.max(ex.warmupSets === undefined ? 2 : Number(ex.warmupSets) || 0, 0),
            3,
          );
          initial[ex.id] = Array.from({ length: warmupCount + validCount }, (_, idx) => ({
            type: (idx < warmupCount ? "warmup" : "valid") as "warmup" | "valid",
            weight: 0,
            reps: 0,
              rpe: 0,
            completed: false,
          }));
        }
      }
      setExerciseSets(initial);

      // Load today's feedback for this day, if any
      const { data: fb } = await supabase
        .from("workout_feedback")
        .select("id, rating, notes")
        .eq("user_id", user.id)
        .eq("protocol_id", protocol.id)
        .eq("day_index", selectedDay)
        .eq("session_date", todayISO)
        .maybeSingle();
      setFeedbackId(fb?.id ?? null);
      setFeedbackRating(fb?.rating ?? 0);
      setFeedbackNotes(fb?.notes ?? "");

      // Load previous session per exercise (most recent before today)
      const exerciseIds = day.exercises.map((e) => e.id);
      if (exerciseIds.length > 0) {
        const { data: prev } = await supabase
          .from("workout_logs")
          .select("exercise_id, sets, session_date")
          .eq("user_id", user.id)
          .in("exercise_id", exerciseIds)
          .lt("session_date", todayISO)
          .order("session_date", { ascending: false })
          .limit(50);
        const prevMap: Record<string, WorkoutSet[]> = {};
        for (const row of prev ?? []) {
          if (!prevMap[row.exercise_id]) prevMap[row.exercise_id] = row.sets as WorkoutSet[];
        }
        setPreviousSets(prevMap);

        // Fetch missing video URLs from exercises catalog
        const needsVideo = day.exercises.filter((e) => !e.videoUrl && !e.video_url).map((e) => e.id);
        if (needsVideo.length > 0) {
          const { data: cat } = await supabase
            .from("exercises").select("id, video_url").in("id", needsVideo);
          const map: Record<string, string> = {};
          for (const c of cat ?? []) if (c.video_url) map[c.id as string] = c.video_url as string;
          setExerciseVideos(map);
        } else {
          setExerciseVideos({});
        }
      }
    })();
  }, [protocol?.id, selectedDay, day]);

  const updateSet = (exId: string, i: number, field: keyof WorkoutSet, value: number | boolean) => {
    setExerciseSets((prev) => {
      const sets = [...(prev[exId] || [])];
      sets[i] = { ...sets[i], [field]: value as never };
      return { ...prev, [exId]: sets };
    });
  };

  const saveFeedback = async () => {
    if (!protocol) return;
    if (feedbackRating < 1 || feedbackRating > 5) {
      toast.error("Selecione de 1 a 5 estrelas");
      return;
    }
    setSavingFeedback(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not signed in");
      const notes = feedbackNotes.trim().slice(0, 1000);
      if (feedbackId) {
        const { error } = await supabase
          .from("workout_feedback")
          .update({ rating: feedbackRating, notes })
          .eq("id", feedbackId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("workout_feedback")
          .insert({
            user_id: user.id,
            protocol_id: protocol.id,
            day_index: selectedDay,
            session_date: todayISO,
            rating: feedbackRating,
            notes,
          })
          .select("id")
          .single();
        if (error) throw error;
        setFeedbackId(data.id);
      }
      toast.success("Feedback enviado!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao enviar feedback");
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleCompletedToggle = (ex: Exercise, i: number, checked: boolean) => {
    updateSet(ex.id, i, "completed", checked);
    if (checked) setRestSeconds(parseRest(ex.rest));
  };

  const totalKgLifted = useMemo(() => {
    let total = 0;
    for (const sets of Object.values(exerciseSets)) {
      for (const s of sets) {
        if (s.type === "valid" && s.completed) total += (Number(s.weight) || 0) * (Number(s.reps) || 0);
      }
    }
    return Math.round(total);
  }, [exerciseSets]);

  const generateStory = async () => {
    setGeneratingStory(true);
    try {
      const W = 1080, H = 1920;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) { toast.error("Navegador sem suporte a canvas"); return; }
      // Fundo escuro com gradiente
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#050505"); grad.addColorStop(1, "#0d0d0d");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      // Foto do usuário (se houver) como fundo
      let photoUrl: string | null = null;
      if (storyPhoto) {
        try {
          photoUrl = URL.createObjectURL(storyPhoto);
          const img = await new Promise<HTMLImageElement>((res, rej) => {
            const i = new Image();
            i.onload = () => res(i);
            i.onerror = () => rej(new Error("Não foi possível ler a imagem"));
            i.src = photoUrl!;
          });
          // cover
          const ratio = Math.max(W / img.width, H / img.height);
          const w = img.width * ratio, h = img.height * ratio;
          ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
          ctx.fillStyle = "rgba(0,0,0,0.62)"; ctx.fillRect(0, 0, W, H);
        } catch (err) {
          console.warn("Falha ao carregar foto, usando fundo padrão", err);
        }
      }
      // Estilo minimalista — Quinta — Push / KG VOLUME TOTAL / domínio
      ctx.textAlign = "center";
      const dayName = days[selectedDay]?.name ?? "Treino";
      const weekday = days[selectedDay]?.weekday ?? todayWeekday;
      ctx.font = "500 40px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.fillText(`${weekday} — ${dayName}`, W / 2, H / 2 - 140);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 360px system-ui, -apple-system, sans-serif";
      ctx.fillText(`${totalKgLifted.toLocaleString("pt-BR")}KG`, W / 2, H / 2 + 100);
      ctx.font = "700 46px system-ui, sans-serif"; ctx.fillStyle = "#2dd4a8";
      ctx.fillText("VOLUME TOTAL", W / 2, H / 2 + 190);
      ctx.font = "500 36px system-ui, sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.55)";
      const domain = typeof window !== "undefined" ? window.location.hostname : "franzenteam.app";
      ctx.fillText(domain, W / 2, H / 2 + 280);
      // Download
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob((b) => res(b), "image/jpeg", 0.92),
      );
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      if (!blob) { toast.error("Não foi possível gerar a imagem"); return; }
      const url = URL.createObjectURL(blob);
      if (storyUrl) URL.revokeObjectURL(storyUrl);
      setStoryUrl(url);
      setStoryBlob(blob);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar story. Tente sem foto de fundo.");
    } finally {
      setGeneratingStory(false);
    }
  };

  // Gera/atualiza o preview do story automaticamente quando o treino ou kg muda
  useEffect(() => {
    if (!day) return;
    const t = window.setTimeout(() => { generateStory().catch(() => {}); }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day?.name, totalKgLifted, storyPhoto]);

  const requestSubstitution = async (ex: Exercise) => {
    setSubSuggestion((p) => ({ ...p, [ex.id]: { loading: true } }));
    try {
      const { data: src } = await supabase
        .from("exercises")
        .select("category, equipment")
        .ilike("name", ex.name)
        .maybeSingle();
      let q = supabase.from("exercises").select("id, name, category, equipment").limit(8);
      if (src?.category) q = q.eq("category", src.category);
      else {
        const token = ex.name.split(" ")[0]?.slice(0, 6) ?? "";
        if (token) q = q.ilike("name", `%${token}%`);
      }
      const { data } = await q;
      const alt = (data ?? []).find((a) => a.name.toLowerCase() !== ex.name.toLowerCase()) ?? null;
      setSubSuggestion((p) => ({ ...p, [ex.id]: { loading: false, alt: alt as any } }));
      if (!alt) toast.info("Sem alternativa cadastrada para esse exercício.");
    } catch (e) {
      console.error(e);
      setSubSuggestion((p) => ({ ...p, [ex.id]: { loading: false, alt: null } }));
    }
  };

  const saveExercise = async (ex: Exercise) => {
    if (!protocol) return;
    const sets = exerciseSets[ex.id];
    if (!sets) return;
    setSavingId(ex.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not signed in");

      const { data: existing } = await supabase
        .from("workout_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("protocol_id", protocol.id)
        .eq("day_index", selectedDay)
        .eq("exercise_id", ex.id)
        .eq("session_date", todayISO)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("workout_logs")
          .update({ sets, exercise_name: ex.name })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workout_logs").insert({
          user_id: user.id,
          protocol_id: protocol.id,
          day_index: selectedDay,
          exercise_id: ex.id,
          exercise_name: ex.name,
          session_date: todayISO,
          sets,
        });
        if (error) throw error;
      }
      toast.success("Exercício salvo!");
      const { data: { user: u2 } } = await supabase.auth.getUser();
      if (u2) evaluateWorkoutAchievements(u2.id).catch(() => {});
    } catch (e) {
      toast.error("Erro ao salvar");
      console.error(e);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="container mx-auto flex items-center justify-between px-4 py-5 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Franzen Team" className="w-8 h-8" />
          <span className="font-heading font-bold tracking-wide text-sm">FRANZEN TEAM</span>
        </Link>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-heading font-bold flex items-center gap-3">
          <Dumbbell className="text-primary" /> Treino
        </h1>

        {days.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Você ainda não tem um protocolo de treino ativo. Quando seu coach liberar, ele aparecerá aqui.
            </p>
            <Button className="mt-6" onClick={() => navigate({ to: "/dashboard" })}>
              Voltar ao dashboard
            </Button>
          </div>
        ) : (
          <>
            {/* Today banner */}
            {(() => {
              const todayIdx = days.findIndex((d) => d.weekday === todayWeekday);
              const isToday = todayIdx === selectedDay && todayIdx !== -1;
              const todayDayObj = todayIdx >= 0 ? days[todayIdx] : null;
              if (todayDayObj && (todayDayObj.exercises?.length ?? 0) > 0) {
                if (!isToday) return null;
                return (
                  <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex gap-3 items-start">
                    <Flame className="text-primary shrink-0 mt-0.5" size={18} />
                    <div>
                      <h3 className="font-heading font-semibold">Hoje — {todayDayObj.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Vamos lá! {todayDayObj.exercises.length} exercícios programados.</p>
                    </div>
                  </div>
                );
              }
              return (
                <div className="mt-6 rounded-xl border border-border bg-card p-4 flex gap-3 items-start">
                  <Coffee className="text-primary shrink-0 mt-0.5" size={18} />
                  <div>
                    <h3 className="font-heading font-semibold">Hoje é dia de descanso</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Aproveite para recuperar. Veja abaixo seus treinos da semana.
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
              {days.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm transition ${
                    i === selectedDay
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  {d.weekday ?? d.name}
                </button>
              ))}
            </div>

            {day && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-heading text-xl font-semibold">{day.name}</h2>
                  <span className="text-xs text-muted-foreground">{day.exercises.length} exerc.</span>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tonelagem total hoje</p>
                    <p className="text-2xl font-heading font-bold text-primary tabular-nums">
                      {totalKgLifted.toLocaleString("pt-BR")} <span className="text-sm text-muted-foreground font-normal">kg</span>
                    </p>
                  </div>
                  <Dumbbell className="text-primary/60" size={28} />
                </div>

                {day.rationale && (
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <button
                      onClick={() => setShowWhy((s) => !s)}
                      className="w-full p-3 flex items-center justify-between text-left"
                    >
                      <span className="text-sm font-medium inline-flex items-center gap-2">
                        <Info size={14} className="text-primary" /> Por que esse treino?
                      </span>
                      {showWhy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showWhy && (
                      <div className="px-4 pb-4 border-t border-border pt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                        {day.rationale}
                      </div>
                    )}
                  </div>
                )}

                {Array.isArray(day.mobility) && day.mobility.length > 0 && (
                  <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                    <h3 className="font-heading font-semibold flex items-center gap-2 text-warning">
                      <Activity size={16} /> Mobilidade & alongamento
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">Faça antes das séries válidas.</p>
                    <div className="space-y-2">
                      {day.mobility.map((m, i) => (
                        <div key={i} className="rounded-md border border-border bg-card p-3">
                          <p className="text-sm font-medium">{m.name}</p>
                          {m.tag && <span className="inline-block mt-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-warning/40 text-warning">{m.tag}</span>}
                          {m.prescription && <p className="text-xs text-muted-foreground mt-1">{m.prescription}{m.corrects ? ` · corrige: ${m.corrects}` : ""}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {day.exercises.length === 0 && (
                  <p className="text-muted-foreground">Sem exercícios cadastrados neste dia.</p>
                )}
                {day.exercises.map((ex) => {
                  const sets = exerciseSets[ex.id] ?? [];
                  const video = ex.videoUrl || ex.video_url || exerciseVideos[ex.id];
                  const isExpanded = expandedEx[ex.id] ?? false;
                  const sub = subSuggestion[ex.id];
                  return (
                    <div key={ex.id} className="rounded-xl border border-border bg-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-heading font-semibold">{ex.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ex.sets ?? sets.filter((x) => x.type === "valid").length} séries válidas
                            {ex.reps ? ` de ${ex.reps} reps (última na falha)` : ""}
                            {ex.rest ? ` • Descanso: ${ex.rest}` : ""}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => setExpandedEx((p) => ({ ...p, [ex.id]: !isExpanded }))}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </Button>
                      </div>

                      <div className="mt-3 flex flex-col gap-2">
                        {ex.rationale && (
                          <button
                            onClick={() => setExpandedEx((p) => ({ ...p, [ex.id]: !isExpanded }))}
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline self-start"
                          >
                            <Info size={14} /> {isExpanded ? "Ocultar info" : "Por que este exercício?"}
                          </button>
                        )}
                        <button
                          onClick={() => (sub ? setSubSuggestion((p) => ({ ...p, [ex.id]: {} })) : requestSubstitution(ex))}
                          className="inline-flex items-center gap-1.5 text-sm text-warning hover:underline self-start"
                        >
                          <Replace size={14} />
                          {sub?.loading ? "Buscando alternativa…" : "Não tenho esse equipamento — sugerir substituição"}
                        </button>
                      </div>

                      {isExpanded && ex.rationale && (
                        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground/90 whitespace-pre-wrap">
                          {ex.rationale}
                        </div>
                      )}

                      {sub?.alt && (
                        <div className="mt-3 rounded-lg border border-warning/40 bg-warning/5 p-3">
                          <p className="text-sm flex items-start gap-2">
                            <Check size={14} className="text-warning mt-0.5 shrink-0" />
                            <span>
                              <span className="font-semibold">Substituir por:</span>{" "}
                              <span className="text-warning font-medium">{sub.alt.name}</span>
                              <span className="block text-xs text-muted-foreground mt-1">
                                Mesma categoria{sub.alt.equipment ? ` • ${sub.alt.equipment}` : ""}. Mantém o padrão de movimento original.
                              </span>
                            </span>
                          </p>
                          <div className="mt-3 flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => setSubSuggestion((p) => ({ ...p, [ex.id]: {} }))}>
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                toast.success(`Sugestão registrada: ${sub.alt!.name}. Avise seu coach para atualizar o protocolo.`);
                                setSubSuggestion((p) => ({ ...p, [ex.id]: {} }));
                              }}
                            >
                              Aceitar substituição
                            </Button>
                          </div>
                        </div>
                      )}

                      {video && (
                        <div className="mt-4">
                          {isExpanded ? (
                            <EmbeddedVideo url={video} />
                          ) : (
                            <Button
                              variant="default"
                              className="w-full bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30"
                              onClick={() => setExpandedEx((p) => ({ ...p, [ex.id]: true }))}
                            >
                              <Youtube size={16} className="mr-2" /> Ver vídeo de execução
                            </Button>
                          )}
                        </div>
                      )}

                      <div className="mt-4 space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
                          <span className="col-span-2">Série</span>
                          <span className="col-span-4">Carga (kg)</span>
                          <span className="col-span-4">Reps</span>
                          <span className="col-span-2 text-right">✓</span>
                        </div>
                        {sets.map((s, i) => {
                          const prev = previousSets[ex.id]?.[i];
                          const warmupCount = sets.filter((x) => x.type === "warmup").length;
                          const isWarmup = s.type === "warmup";
                          const validIdx = i - warmupCount + 1;
                          const repsPlaceholder = isWarmup
                            ? (i === 0 ? "12" : "10")
                            : (prev?.reps ? String(prev.reps) : "0");
                          return (
                          <div key={i} className="grid grid-cols-12 gap-2 items-center">
                            <span className={`col-span-2 text-xs font-semibold px-2 py-1 rounded-md text-center inline-flex items-center justify-center gap-1 ${isWarmup ? "text-warning border border-warning/40" : "text-primary border border-primary/40"}`}>
                              {isWarmup ? `AQ ${i + 1}` : (<><Target size={11} /> {validIdx}</>)}
                            </span>
                            <Input
                              type="number"
                              inputMode="decimal"
                              value={s.weight || ""}
                              placeholder={prev ? `${prev.weight || "0"}` : "0"}
                              onChange={(e) => updateSet(ex.id, i, "weight", Number(e.target.value))}
                              className="col-span-4 h-10 text-center"
                            />
                            <Input
                              type="number"
                              inputMode="numeric"
                              value={s.reps || ""}
                              placeholder={repsPlaceholder}
                              onChange={(e) => updateSet(ex.id, i, "reps", Number(e.target.value))}
                              className="col-span-4 h-10 text-center"
                            />
                            <div className="col-span-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleCompletedToggle(ex, i, !s.completed)}
                                className={`h-7 w-7 rounded-full border-2 grid place-items-center transition ${s.completed ? "border-primary bg-primary text-primary-foreground" : "border-primary/40 hover:border-primary"}`}
                                aria-label="Marcar série"
                              >
                                {s.completed && <Check size={14} />}
                              </button>
                            </div>
                          </div>
                          );
                        })}
                        {previousSets[ex.id] && (
                          <p className="pt-1 text-[11px] text-muted-foreground">
                            Última sessão: {previousSets[ex.id].map((p) => `${p.weight || "—"}×${p.reps || "—"}`).join(", ")}
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={() => saveExercise(ex)}
                        disabled={savingId === ex.id}
                        className="w-full mt-4 h-11 font-semibold"
                      >
                        {savingId === ex.id ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                        Salvar exercício
                      </Button>
                    </div>
                  );
                })}
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-heading font-semibold flex items-center gap-2">
                    <MessageSquare size={16} className="text-primary" /> Feedback do treino
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Como foi a sessão de hoje?</p>
                  <div className="mt-3 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFeedbackRating(n)}
                        className="p-1"
                        aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                      >
                        <Star
                          size={28}
                          className={n <= feedbackRating ? "fill-primary text-primary" : "text-muted-foreground"}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    placeholder="Observações (opcional, máx 1000 caracteres)"
                    maxLength={1000}
                    rows={3}
                    className="mt-3"
                  />
                  <div className="mt-3 flex justify-end">
                    <Button onClick={saveFeedback} disabled={savingFeedback || feedbackRating === 0}>
                      {savingFeedback ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                      {feedbackId ? "Atualizar feedback" : "Enviar feedback"}
                    </Button>
                  </div>
                  {/* Story do Franzen Team */}
                  <div className="mt-5 border-t border-border pt-4">
                    <h4 className="font-heading font-semibold text-sm">Compartilhar treino 📲</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gere uma imagem com a kilagem total levantada hoje ({totalKgLifted.toLocaleString("pt-BR")} kg) e o logo Franzen Team para postar no seu story.
                    </p>
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <label className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs cursor-pointer hover:border-primary">
                        <Activity size={14} />
                        {storyPhoto ? storyPhoto.name.slice(0, 24) : "Foto opcional (fundo)"}
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => setStoryPhoto(e.target.files?.[0] ?? null)} />
                      </label>
                      <Button onClick={generateStory} disabled={generatingStory} variant="outline">
                        {generatingStory ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                        Gerar story
                      </Button>
                    </div>
                    {storyUrl && (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-lg overflow-hidden border border-border bg-black flex justify-center">
                          <img
                            src={storyUrl}
                            alt="Story Franzen Team"
                            className="max-h-[420px] w-auto object-contain"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          No celular, segure a imagem para salvar na galeria, ou use os botões abaixo.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={storyUrl}
                            download={`franzen-team-${todayISO}.jpg`}
                            className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-xs hover:bg-muted"
                          >
                            Baixar imagem
                          </a>
                          {typeof navigator !== "undefined" && "share" in navigator && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (!storyBlob) return;
                                const file = new File([storyBlob], `franzen-team-${todayISO}.jpg`, { type: "image/jpeg" });
                                try {
                                  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
                                  if (nav.canShare && !nav.canShare({ files: [file] })) {
                                    await navigator.share({ title: "Franzen Team", text: `${totalKgLifted} kg levantados hoje! #FranzenTeam` });
                                  } else {
                                    await navigator.share({ files: [file], title: "Franzen Team", text: "#FranzenTeam" });
                                  }
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                            >
                              Compartilhar
                            </Button>
                          )}
                          <a
                            href="https://www.instagram.com/"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-xs hover:bg-muted"
                          >
                            Abrir Instagram
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {restSeconds !== null && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-primary/40 bg-card/95 backdrop-blur px-5 py-3 shadow-lg">
          <Timer className="text-primary" size={18} />
          <span className="font-heading text-2xl font-bold tabular-nums">
            {Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setRestSeconds((s) => (s ?? 0) + 15)}>
              +15s
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setRestSeconds(null)}>
              <X size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmbeddedVideo({ url }: { url: string }) {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (ytMatch) {
    return (
      <div className="aspect-video w-full rounded-lg overflow-hidden border border-border">
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          title="Vídeo do exercício"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
      <Play size={14} /> Abrir vídeo
    </a>
  );
}