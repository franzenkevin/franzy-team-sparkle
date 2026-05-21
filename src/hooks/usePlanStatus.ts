import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanStatus = "none" | "active" | "expiring" | "expired";

export interface PlanInfo {
  loading: boolean;
  planEnd: string | null;
  plan: string | null;
  daysRemaining: number | null;
  status: PlanStatus;
  userId: string | null;
}

function diffDays(end: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const e = new Date(end + "T00:00:00");
  return Math.ceil((e.getTime() - today.getTime()) / 86_400_000);
}

const NOTIF_FLAG_PREFIX = "plan_expiring_notif_";

export function usePlanStatus(): PlanInfo {
  const [info, setInfo] = useState<PlanInfo>({
    loading: true, planEnd: null, plan: null, daysRemaining: null, status: "none", userId: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setInfo(s => ({ ...s, loading: false })); return; }
      const { data: p } = await supabase
        .from("profiles")
        .select("plan, plan_end")
        .eq("user_id", user.id)
        .maybeSingle();

      const planEnd = p?.plan_end ?? null;
      let daysRemaining: number | null = null;
      let status: PlanStatus = "none";
      if (planEnd) {
        daysRemaining = diffDays(planEnd);
        if (daysRemaining < 0) status = "expired";
        else if (daysRemaining <= 7) status = "expiring";
        else status = "active";
      }

      if (!cancelled) {
        setInfo({ loading: false, planEnd, plan: p?.plan ?? null, daysRemaining, status, userId: user.id });
      }

      // Idempotência diária por usuário via localStorage + checagem em BD
      if ((status === "expiring" || status === "expired") && daysRemaining !== null) {
        const todayKey = new Date().toISOString().slice(0, 10);
        const lsKey = `${NOTIF_FLAG_PREFIX}${user.id}_${todayKey}`;
        if (typeof window !== "undefined" && !localStorage.getItem(lsKey)) {
          const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", user.id)
            .eq("type", "plan_expiring")
            .gte("created_at", startOfDay.toISOString())
            .maybeSingle();
          if (!existing) {
            const title = status === "expired"
              ? "Seu plano expirou"
              : daysRemaining === 0
                ? "Seu plano expira hoje"
                : `Seu plano expira em ${daysRemaining} ${daysRemaining === 1 ? "dia" : "dias"}`;
            const body = status === "expired"
              ? "Entre em contato com o coach para renovar."
              : "Fale com o coach para renovar antes do término.";
            await supabase.from("notifications").insert({
              user_id: user.id, type: "plan_expiring", title, body, link: "/messages",
            });
          }
          try { localStorage.setItem(lsKey, "1"); } catch {}
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return info;
}