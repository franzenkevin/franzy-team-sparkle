import { useEffect, useRef, useState } from "react";

/**
 * Rascunho automático em localStorage para formulários do cliente.
 * - Restaura valores salvos uma única vez (após o ready ficar true).
 * - Salva a cada 600ms de inatividade enquanto o usuário digita.
 * - Use clearDraft() após o envio bem-sucedido.
 */
export function useDraftAutoSave<T extends Record<string, unknown>>(
  key: string,
  values: T,
  hydrate: (saved: Partial<T>) => void,
  options: { ready?: boolean; debounceMs?: number } = {},
) {
  const { ready = true, debounceMs = 600 } = options;
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const restored = useRef(false);

  // Restaurar rascunho salvo
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(`draft:${key}`);
      if (raw) {
        const parsed = JSON.parse(raw) as { values: Partial<T>; at?: string };
        if (parsed?.values) {
          hydrate(parsed.values);
          if (parsed.at) setSavedAt(new Date(parsed.at).toLocaleTimeString());
        }
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  // Persistir com debounce
  useEffect(() => {
    if (!ready || !restored.current) return;
    const handle = window.setTimeout(() => {
      try {
        const at = new Date().toISOString();
        localStorage.setItem(`draft:${key}`, JSON.stringify({ values, at }));
        setSavedAt(new Date(at).toLocaleTimeString());
      } catch {
        /* ignore */
      }
    }, debounceMs);
    return () => window.clearTimeout(handle);
  }, [key, ready, debounceMs, values]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(`draft:${key}`);
    } catch {
      /* ignore */
    }
    setSavedAt(null);
  };

  return { savedAt, clearDraft };
}