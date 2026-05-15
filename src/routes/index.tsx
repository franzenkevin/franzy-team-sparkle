import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Dumbbell, Brain, Activity } from "lucide-react";
import logo from "@/assets/logo.png";
import hero from "@/assets/hero-athlete.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Franzen Team — Hipertrofia inteligente" },
      { name: "description", content: "Treinos e nutrição personalizados com IA para acelerar seus resultados na hipertrofia." },
      { property: "og:title", content: "Franzen Team — Hipertrofia inteligente" },
      { property: "og:description", content: "Treinos e nutrição personalizados com IA." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="container mx-auto flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Franzen Team" className="w-9 h-9" />
          <span className="font-heading font-bold tracking-wide">FRANZEN TEAM</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
          <Link to="/signup"><Button size="sm" className="glow">Começar</Button></Link>
        </nav>
      </header>

      <section className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-2 md:py-20 items-center">
        <div className="animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-heading font-bold leading-tight">
            Hipertrofia <span className="text-primary">inteligente</span> com IA
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Treinos e dietas personalizados que evoluem com você. Construa o físico que você sempre quis.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup">
              <Button size="lg" className="glow">
                Começar agora <ArrowRight className="ml-2" size={18} />
              </Button>
            </Link>
            <Link to="/login"><Button size="lg" variant="outline">Já sou cliente</Button></Link>
          </div>
        </div>
        <div className="relative">
          <img src={hero} alt="Atleta em treino" className="rounded-2xl shadow-2xl w-full object-cover" />
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 grid gap-6 md:grid-cols-3">
        {[
          { icon: Dumbbell, title: "Treinos personalizados", desc: "Planos de hipertrofia adaptados ao seu nível e objetivo." },
          { icon: Brain, title: "IA que aprende", desc: "Ajustes automáticos baseados no seu progresso real." },
          { icon: Activity, title: "Nutrição precisa", desc: "Cálculo de macros e cardápios alinhados ao seu corpo." },
        ].map((f, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <f.icon className="text-primary mb-4" size={28} />
            <h3 className="font-heading text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Franzen Team. Todos os direitos reservados.
      </footer>
    </div>
  );
}
