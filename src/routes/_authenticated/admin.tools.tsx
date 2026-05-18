import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calculators } from "@/components/admin/Calculators";
import { CoachChat } from "@/components/admin/CoachChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/tools")({ component: ToolsPage });

function ToolsPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").order("full_name");
      setProfiles(data ?? []);
    })();
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-heading font-bold">Ferramentas</h1>
      <Tabs defaultValue="calc">
        <TabsList>
          <TabsTrigger value="calc">Calculadoras</TabsTrigger>
          <TabsTrigger value="coach">IA Coach</TabsTrigger>
        </TabsList>
        <TabsContent value="calc" className="mt-4"><Calculators profiles={profiles as any} /></TabsContent>
        <TabsContent value="coach" className="mt-4"><CoachChat profiles={profiles as any} /></TabsContent>
      </Tabs>
    </div>
  );
}
