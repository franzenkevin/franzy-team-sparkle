import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-2 border-b border-border px-3 sticky top-0 bg-background/80 backdrop-blur z-30">
            <SidebarTrigger />
          </header>
          <main className="flex-1 min-w-0">
            <Outlet />
            <div className="md:hidden h-16" aria-hidden />
          </main>
        </div>
      </div>
      <BottomNav />
    </SidebarProvider>
  );
}