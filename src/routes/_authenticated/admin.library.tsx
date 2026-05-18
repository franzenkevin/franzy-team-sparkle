import { createFileRoute } from "@tanstack/react-router";
import { TemplateLibrary } from "@/components/admin/TemplateLibrary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/library")({ component: LibraryPage });

function LibraryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-heading font-bold">Bibliotecas</h1>
      <p className="text-sm text-muted-foreground">Templates reutilizáveis de protocolos.</p>
      <Tabs defaultValue="training">
        <TabsList>
          <TabsTrigger value="training">Treinos</TabsTrigger>
          <TabsTrigger value="diet">Dietas</TabsTrigger>
          <TabsTrigger value="hormones">Hormônios</TabsTrigger>
        </TabsList>
        <TabsContent value="training" className="mt-4"><TemplateLibrary kind="training" currentValue={{}} onLoad={() => {}} /></TabsContent>
        <TabsContent value="diet" className="mt-4"><TemplateLibrary kind="diet" currentValue={{}} onLoad={() => {}} /></TabsContent>
        <TabsContent value="hormones" className="mt-4"><TemplateLibrary kind="hormones" currentValue={[]} onLoad={() => {}} /></TabsContent>
      </Tabs>
    </div>
  );
}
