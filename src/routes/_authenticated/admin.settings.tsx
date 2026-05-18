import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/_authenticated/admin/settings")({ component: () => (
  <div className="space-y-4">
    <h1 className="text-2xl font-heading font-bold">Minha conta</h1>
    <Card className="p-5 max-w-xl">
      <p className="text-sm text-muted-foreground">Gerencie seu perfil pessoal de coach.</p>
      <Link to="/profile"><Button className="mt-3">Abrir perfil</Button></Link>
    </Card>
  </div>
)});
