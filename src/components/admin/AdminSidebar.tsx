import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, BookOpen, Wrench, Settings, Archive, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/admin", label: "Resumo", icon: LayoutDashboard, exact: true },
  { to: "/admin/clients", label: "Clientes", icon: Users },
  { to: "/admin/library", label: "Bibliotecas", icon: BookOpen },
  { to: "/admin/tools", label: "Ferramentas", icon: Wrench },
  { to: "/admin/legacy", label: "Painel completo", icon: Archive },
  { to: "/admin/settings", label: "Minha conta", icon: Settings },
] as const;

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : path === to || path.startsWith(to + "/");

  const signOut = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/15 text-primary grid place-items-center font-bold">F</div>
          {!collapsed && <div className="font-heading font-bold">Franzen Admin</div>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => {
                const Icon = it.icon;
                return (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton asChild isActive={isActive(it.to, (it as any).exact)}>
                      <Link to={it.to} className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {!collapsed && <span>{it.label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-2 border-t border-sidebar-border">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </div>
    </Sidebar>
  );
}
