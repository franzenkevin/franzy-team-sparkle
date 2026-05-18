import { createFileRoute, Link } from "@tanstack/react-router";
import { ResumoTab } from "@/components/admin/ResumoTab";
import { Card } from "@/components/ui/card";
import { Users, BookOpen, Wrench, Archive } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminIndex,
});

function AdminIndex() {
  const quick = [
    { to: "/admin/clients", label: "Clientes", desc: "Lista e edição dos alunos", icon: Users },
    { to: "/admin/library", label: "Bibliotecas", desc: "Templates de treino e dieta", icon: BookOpen },
    { to: "/admin/tools", label: "Ferramentas", desc: "Calculadoras e IA Coach", icon: Wrench },
    { to: "/admin/legacy", label: "Painel completo", desc: "Acesso às demais abas", icon: Archive },
  ] as const;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Resumo</h1>
        <p className="text-sm text-muted-foreground">Acompanhe a operação da Franzen Team.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quick.map((q) => (
          <Link key={q.to} to={q.to}>
            <Card className="p-4 hover:border-primary/50 transition h-full">
              <q.icon className="text-primary" size={20} />
              <p className="mt-2 font-medium">{q.label}</p>
              <p className="text-xs text-muted-foreground">{q.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
      <ResumoTab />
    </div>
  );
}
