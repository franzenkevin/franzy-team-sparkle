import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Dumbbell, Apple, Pill, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/training", label: "Treino", icon: Dumbbell },
  { to: "/diet", label: "Dieta", icon: Apple },
  { to: "/hormones", label: "Hormônios", icon: Pill },
  { to: "/feedback", label: "Feedback", icon: Heart },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegação inferior"
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
                <span className="leading-none">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
