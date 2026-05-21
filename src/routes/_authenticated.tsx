import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { InstallPwaPrompt } from "@/components/InstallPwaPrompt";
import { OnboardingTour } from "@/components/OnboardingTour";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    // Admin contas só usam o painel administrativo — fora de /admin, redireciona.
    const { data: roleRow } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
    const isAdmin = !!roleRow;
    const isAdminRoute = location.pathname === "/admin" || location.pathname.startsWith("/admin/");
    if (isAdmin && !isAdminRoute) {
      throw redirect({ to: "/admin" });
    }
    if (!isAdmin && isAdminRoute) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  // Don't render the student shell (sidebar/bottomnav/PWA/onboarding) on admin pages.
  const { pathname } = useLocation();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 border-b border-border px-3 sticky top-0 bg-background/80 backdrop-blur z-30">
            <MenuButton />
          </header>
          <main className="flex-1 min-w-0">
            <Outlet />
            <div className="h-16" aria-hidden />
          </main>
        </div>
      </div>
      <BottomNav />
      <InstallPwaPrompt />
      <OnboardingTour />
    </SidebarProvider>
  );
}

function MenuButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card/50 hover:bg-accent hover:text-accent-foreground transition px-3 py-2 text-sm font-medium"
      aria-label="Abrir menu"
    >
      <Menu size={20} />
      <span>Menu</span>
    </button>
  );
}