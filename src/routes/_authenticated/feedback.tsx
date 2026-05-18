import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { CalendarDays, Apple, Activity, ArrowRight, Heart, MessageSquare, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({ meta: [{ title: "Feedback — Franzen Team" }] }),
  component: FeedbackHub,
});

const items = [
  {
    to: "/feedback/weekly",
    title: "Feedback semanal",
    desc: "Aderência, energia, sono e medidas da semana.",
    icon: CalendarDays,
  },
  {
    to: "/feedback/diet",
    title: "Feedback da dieta",
    desc: "Como foi cada refeição, fome, satisfação.",
    icon: Apple,
  },
  {
    to: "/monthly-analysis",
    title: "Análise mensal",
    desc: "Fotos + medidas para o coach revisar.",
    icon: Activity,
  },
  {
    to: "/body-analysis",
    title: "Análise corporal do coach",
    desc: "Avaliação visual liberada pelo coach.",
    icon: Sparkles,
  },
  {
    to: "/messages",
    title: "Mensagens",
    desc: "Fale direto com seu coach.",
    icon: MessageSquare,
  },
] as const;

function FeedbackHub() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
        <Heart className="text-primary" /> Feedback
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Envie informações para o coach ajustar seu plano.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map(({ to, title, desc, icon: Icon }) => (
          <Link key={to} to={to} className="block">
            <Card className="p-4 hover:border-primary transition-colors h-full">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-heading font-semibold">{title}</h3>
                    <ArrowRight size={14} className="text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}