import { useEffect } from "react";

/**
 * Solicita permissão de notificações e dispara um lembrete diário
 * (enquanto o app estiver aberto) no horário escolhido.
 */
export function useReminders(hour = 8, minute = 0, title = "Franzen Team", body = "Hora do seu treino e check-in!") {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const schedule = () => {
      const now = new Date();
      const next = new Date();
      next.setHours(hour, minute, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const ms = next.getTime() - now.getTime();
      return window.setTimeout(() => {
        if (Notification.permission === "granted") {
          try { new Notification(title, { body, icon: "/favicon.ico" }); } catch {}
        }
        schedule();
      }, ms);
    };

    const id = schedule();
    return () => window.clearTimeout(id);
  }, [hour, minute, title, body]);
}
