import { useEffect, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Dumbbell, Apple, LineChart, User,
  MessageSquare, LogOut, Pill,
  Trophy, Flame, Award, Bell, CalendarDays, Activity, FlaskConical, ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import logo from "@/assets/logo.png";
import { useServerFn } from "@tanstack/react-start";
import { getLeaderboard, type RankingRow } from "@/lib/ranking.functions";

const mainItems = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Treino", url: "/training", icon: Dumbbell },
  { title: "Dieta", url: "/diet", icon: Apple },
  { title: "Hormônios", url: "/hormones", icon: Pill },
  { title: "Exames", url: "/exams", icon: FlaskConical },
  { title: "Progresso", url: "/progress", icon: LineChart },
  { title: "Feedback", url: "/feedback", icon: ClipboardList },
  { title: "Avaliação postural", url: "/monthly-analysis", icon: Activity },
  { title: "Conquistas", url: "/achievements", icon: Award },
  { title: "Ranking", url: "/ranking", icon: Trophy },
  { title: "Desafios", url: "/challenges", icon: Flame },
  { title: "Mensagens", url: "/messages", icon: MessageSquare },
  { title: "Notificações", url: "/notifications", icon: Bell },
  { title: "Perfil", url: "/profile", icon: User },
] as const;


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");
  const [unread, setUnread] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [top3, setTop3] = useState<RankingRow[]>([]);
  const fetchBoard = useServerFn(getLeaderboard);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setName(user.email ?? "");
      const { data } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      const refreshCounts = async () => {
        const [{ count: n }, { count: m }] = await Promise.all([
          supabase.from("notifications").select("id", { count: "exact", head: true })
            .eq("user_id", user.id).is("read_at", null),
          supabase.from("messages").select("id", { count: "exact", head: true })
            .eq("recipient_id", user.id).is("read_at", null),
        ]);
        if (!mounted) return;
        setUnread(n ?? 0);
        setUnreadMsgs(m ?? 0);
      };
      await refreshCounts();
      try {
        const board = await fetchBoard();
        if (mounted) setTop3(board.slice(0, 3));
      } catch {}
      const chNotif = supabase.channel(`notif-${user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, refreshCounts)
        .subscribe();
      const chMsg = supabase.channel(`msg-recv-${user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` }, refreshCounts)
        .subscribe();
      return () => { supabase.removeChannel(chNotif); supabase.removeChannel(chMsg); };
    })();
    return () => { mounted = false; };
  }, [fetchBoard]);

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
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                      {!collapsed && item.url === "/notifications" && unread > 0 && (
                        <span className="ml-auto rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 min-w-5 text-center">{unread}</span>
                      )}
                      {!collapsed && item.url === "/messages" && unreadMsgs > 0 && (
                        <span className="ml-auto rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 min-w-5 text-center">{unreadMsgs}</span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && top3.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Top 3 ranking</SidebarGroupLabel>
            <SidebarGroupContent>
              <Link to="/ranking" className="block px-2 pt-1 pb-2 space-y-1">
                {top3.map((r, i) => {
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
                  return (
                    <div key={r.user_id} className="flex items-center gap-2 text-xs">
                      <span className="w-5 text-center">{medal}</span>
                      <span className="flex-1 truncate">{r.name}</span>
                      <span className="text-primary font-semibold">{r.points}</span>
                    </div>
                  );
                })}
              </Link>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admins são redirecionados para /admin — não há grupo admin aqui */}
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
