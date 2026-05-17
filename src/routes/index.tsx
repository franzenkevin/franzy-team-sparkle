import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
    const { data: roleRow } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
    throw redirect({ to: roleRow ? "/admin" : "/dashboard" });
  },
});
