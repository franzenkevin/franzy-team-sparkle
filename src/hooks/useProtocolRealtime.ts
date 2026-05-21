import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Assina mudanças em `protocols` para o usuário logado e dispara `onChange`
 * sempre que o admin atualizar/inserir/arquivar um protocolo.
 */
export function useProtocolRealtime(onChange: () => void) {
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      channel = supabase
        .channel(`protocols-rt-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "protocols", filter: `user_id=eq.${user.id}` },
          () => { onChange(); },
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
