import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Dumbbell, Apple, FlaskConical, MessageSquare, LifeBuoy, ChevronRight, ChevronLeft, X } from "lucide-react";

const KEY = "franzen.tourSeen.v1";

const steps = [
  { icon: Dumbbell, title: "Treino", text: "Na aba Treino você encontra o treino do dia, vídeo de cada exercício e onde registrar carga e reps." },
  { icon: Apple, title: "Dieta", text: "Na aba Dieta ficam suas refeições, macros e o diário onde você adiciona o que comeu." },
  { icon: FlaskConical, title: "Hormônios", text: "Em Hormônios você acompanha a prescrição enviada pelo coach e as orientações de uso." },
  { icon: MessageSquare, title: "Feedbacks", text: "Mande seus feedbacks semanais e check-ins por aqui — é assim que o coach ajusta seu plano." },
  { icon: LifeBuoy, title: "Qualquer dúvida", text: "Qualquer dúvida, é só entrar em contato direto com o seu treinador pela aba de mensagens." },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return;
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    localStorage.setItem(KEY, "1");
    setOpen(false);
  };

  const step = steps[i];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/20 via-background to-background p-6">
          <button onClick={close} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X size={18} />
          </button>
          <div className="h-14 w-14 rounded-2xl bg-primary/15 grid place-items-center mb-4">
            <Icon className="text-primary" size={28} />
          </div>
          <h2 className="text-xl font-heading font-bold">{step.title}</h2>
          <p className="text-sm text-muted-foreground mt-2 min-h-[60px]">{step.text}</p>

          <div className="flex items-center justify-center gap-1.5 mt-5">
            {steps.map((_, idx) => (
              <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-primary" : "w-1.5 bg-muted"}`} />
            ))}
          </div>

          <div className="flex justify-between mt-5">
            <Button variant="ghost" size="sm" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0}>
              <ChevronLeft size={16} /> Voltar
            </Button>
            {i < steps.length - 1 ? (
              <Button size="sm" onClick={() => setI((n) => n + 1)}>
                Próximo <ChevronRight size={16} />
              </Button>
            ) : (
              <Button size="sm" onClick={close}>Começar</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}