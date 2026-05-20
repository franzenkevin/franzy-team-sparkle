import { Link } from "@tanstack/react-router";
import { MessageSquare, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Número do coach Kevin Franzen. Edite aqui se mudar.
export const COACH_WHATSAPP = "5551982056512";

export function CoachContactDialog({ trigger }: { trigger: React.ReactNode }) {
  const waUrl = `https://wa.me/${COACH_WHATSAPP}?text=${encodeURIComponent("Olá Kevin, sou aluno da Franzen Team e queria falar com você.")}`;
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Falar com o coach</DialogTitle>
          <DialogDescription>Como você prefere conversar com o Kevin?</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 pt-2">
          <Button asChild className="justify-start gap-2">
            <Link to="/messages"><MessageSquare className="h-4 w-4" /> Mensagens no app</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start gap-2">
            <a href={waUrl} target="_blank" rel="noopener noreferrer"><Phone className="h-4 w-4" /> WhatsApp</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}