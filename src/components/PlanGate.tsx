import { ReactNode } from "react";
import { Lock, Phone, MessageSquare, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { usePlanStatus } from "@/hooks/usePlanStatus";
import { COACH_WHATSAPP } from "@/components/CoachContactDialog";

const WA_URL = `https://wa.me/${COACH_WHATSAPP}?text=${encodeURIComponent(
  "Olá Kevin, meu plano na Franzen Team expirou. Gostaria de renovar."
)}`;

export function PlanGate({ children }: { children: ReactNode }) {
  const { loading, status, daysRemaining } = usePlanStatus();

  if (loading) return <>{children}</>;

  if (status === "expired") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-5">
          <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="h-7 w-7 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Seu plano expirou</h1>
            <p className="text-sm text-muted-foreground">
              Entre em contato com o coach para renovar o seu plano e voltar a acessar todos os recursos do app.
            </p>
          </div>
          <div className="grid gap-2">
            <Button asChild className="gap-2">
              <a href={WA_URL} target="_blank" rel="noopener noreferrer">
                <Phone className="h-4 w-4" /> Falar no WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/messages"><MessageSquare className="h-4 w-4" /> Mensagem no app</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      {status === "expiring" && daysRemaining !== null && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 px-3 py-2 text-xs sm:text-sm flex items-center gap-2 justify-center flex-wrap">
          <CalendarClock className="h-4 w-4" />
          <span>
            {daysRemaining <= 0
              ? "Seu plano expira hoje."
              : `Seu plano expira em ${daysRemaining} ${daysRemaining === 1 ? "dia" : "dias"}.`}
          </span>
          <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="underline font-medium">
            Renovar com o coach
          </a>
        </div>
      )}
      {children}
    </>
  );
}

export function PlanRemainingBadge() {
  const { status, daysRemaining, planEnd } = usePlanStatus();
  if (!planEnd || daysRemaining === null) return null;
  const tone =
    status === "expired" ? "bg-destructive/10 text-destructive border-destructive/30"
    : status === "expiring" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  const label =
    status === "expired" ? "Plano expirado"
    : daysRemaining === 0 ? "Expira hoje"
    : `${daysRemaining} ${daysRemaining === 1 ? "dia restante" : "dias restantes"}`;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      <CalendarClock className="h-3.5 w-3.5" /> {label}
    </span>
  );
}