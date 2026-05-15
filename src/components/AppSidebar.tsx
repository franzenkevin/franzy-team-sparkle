import { useEffect, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Dumbbell, Apple, LineChart, History, User, Sparkles,
  Shield, Users, ClipboardList, MessageSquare, LogOut, Library,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import logo from "@/assets/logo.png";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Treinos", url: "/training", icon: Dumbbell },
  { title: "Nutrição", url: "/diet", icon: Apple },
  { title: "Progresso", url: "/progress", icon: LineChart },
  { title: "Histórico", url: "/history", icon: History },
  { title: "Exercícios", url: "/exercises", icon: Library },
  { title: "Gerar (IA)", url: "/generate", icon: Sparkles },
  { title: "Perfil", url: "/profile", icon: User },
] as const;

const adminItems = [
  { title: "Painel admin", url: "/admin", icon: Shield, hash: "" },
  { title: "Usuários", url: "/admin", icon: Users, hash: "users" },
  { title: "Protocolos", url: "/admin", icon: ClipboardList, hash: "protocol" },
  { title: "Check-ins", url: "/admin", icon: ClipboardList, hash: "checkins" },
  { title: "Feedback", url: "/admin", icon: MessageSquare, hash: "feedback" },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setName(user.email ?? "");
      const { data } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
    })();
  }, []);

  const isActive = (url: string) => currentPath === url;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2 min-w-0">
          <img src={logo} alt="Franzen Team" className="w-7 h-7 shrink-0" />
          {!collapsed && <span className="font-heading font-bold text-sm tracking-wide truncate">FRANZEN TEAM</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url) && (typeof window === "undefined" || window.location.hash.replace("#", "") === item.hash)} tooltip={item.title}>
                      <Link
                        to={item.url}
                        hash={item.hash || undefined}
                        className="flex items-center gap-2"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && name && (
          <p className="px-2 pb-2 text-[10px] text-muted-foreground truncate">{name}</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
