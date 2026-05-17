import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share, Plus, Download, Smartphone, MoreVertical } from "lucide-react";

const STORAGE_KEY = "franzen.installPrompt";
const MAX_SHOWS = 5;

function detectPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-ignore — iOS Safari
    window.navigator.standalone === true
  );
}

export function InstallPwaPrompt() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [deferred, setDeferred] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) { localStorage.setItem(STORAGE_KEY, JSON.stringify({ installed: true })); return; }
    const plat = detectPlatform();
    setPlatform(plat);
    if (plat === "other") return;

    const raw = localStorage.getItem(STORAGE_KEY);
    const state = raw ? JSON.parse(raw) : { count: 0, installed: false };
    if (state.installed) return;
    if ((state.count ?? 0) >= MAX_SHOWS) return;

    const onBip = (e: any) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", onBip);
    const onInstalled = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, installed: true }));
      setOpen(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    const t = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, count: (state.count ?? 0) + 1 }));
    }, 1500);

    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installNow = async () => {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ installed: true }));
      }
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="text-primary" size={20} /> Instale o app
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Tenha acesso rápido com um ícone na sua tela inicial e receba notificações.
        </p>

        {platform === "ios" ? (
          <ol className="text-sm space-y-2 mt-2">
            <li className="flex gap-2"><span className="font-bold text-primary">1.</span> Toque em <Share size={14} className="inline mx-1" /> <b>Compartilhar</b> na barra do Safari.</li>
            <li className="flex gap-2"><span className="font-bold text-primary">2.</span> Role e escolha <Plus size={14} className="inline mx-1" /> <b>Adicionar à Tela de Início</b>.</li>
            <li className="flex gap-2"><span className="font-bold text-primary">3.</span> Toque em <b>Adicionar</b> no canto superior direito.</li>
          </ol>
        ) : platform === "android" ? (
          <>
            <ol className="text-sm space-y-2 mt-2">
              <li className="flex gap-2"><span className="font-bold text-primary">1.</span> Toque no menu <MoreVertical size={14} className="inline mx-1" /> do Chrome.</li>
              <li className="flex gap-2"><span className="font-bold text-primary">2.</span> Escolha <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b>.</li>
              <li className="flex gap-2"><span className="font-bold text-primary">3.</span> Confirme <b>Instalar</b>.</li>
            </ol>
            {deferred && (
              <Button className="w-full mt-3" onClick={installNow}>
                <Download size={16} className="mr-2" /> Instalar agora
              </Button>
            )}
          </>
        ) : null}

        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="mt-1">
          Lembrar mais tarde
        </Button>
      </DialogContent>
    </Dialog>
  );
}