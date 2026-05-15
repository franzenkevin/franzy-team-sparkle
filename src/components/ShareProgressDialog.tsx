import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ShareLink = {
  id: string;
  token: string;
  title: string | null;
  include_photos: boolean;
  include_notes: boolean;
  views: number;
  expires_at: string;
  created_at: string;
};

function makeToken() {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 24);
}

export function ShareProgressDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [includePhotos, setIncludePhotos] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("share_links")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setLinks((data ?? []) as ShareLink[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const create = async () => {
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }
    const token = makeToken();
    const { error } = await supabase.from("share_links").insert({
      user_id: user.id,
      token,
      title: title.trim() || null,
      include_photos: includePhotos,
      include_notes: includeNotes,
    });
    setCreating(false);
    if (error) {
      toast.error("Erro ao criar link", { description: error.message });
      return;
    }
    setTitle("");
    toast.success("Link criado!");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("share_links").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover", { description: error.message });
      return;
    }
    setLinks((l) => l.filter((x) => x.id !== id));
  };

  const copy = async (token: string, id: string) => {
    const url = `${window.location.origin}/s/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar progresso</DialogTitle>
          <DialogDescription>
            Gere um link público com sua evolução. Expira em 30 dias.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 border border-border rounded-lg p-4">
          <div>
            <Label htmlFor="title">Título (opcional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Minha evolução em 60 dias"
              maxLength={80}
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notes-switch">Incluir anotações</Label>
              <p className="text-xs text-muted-foreground">Comentários dos check-ins</p>
            </div>
            <Switch id="notes-switch" checked={includeNotes} onCheckedChange={setIncludeNotes} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="photos-switch">Incluir fotos</Label>
              <p className="text-xs text-muted-foreground">Compartilha suas fotos de progresso</p>
            </div>
            <Switch id="photos-switch" checked={includePhotos} onCheckedChange={setIncludePhotos} />
          </div>

          <Button onClick={create} disabled={creating} className="w-full">
            {creating ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
            Gerar link
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Links ativos</h4>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-muted-foreground" size={18} />
            </div>
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Nenhum link gerado ainda.</p>
          ) : (
            links.map((l) => {
              const url = `${typeof window !== "undefined" ? window.location.origin : ""}/s/${l.token}`;
              const expired = new Date(l.expires_at) < new Date();
              return (
                <div key={l.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{l.title || "Sem título"}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.views} visualizações · expira{" "}
                        {new Date(l.expires_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove(l.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="flex gap-1">
                    <Input value={url} readOnly className="text-xs h-8" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copy(l.token, l.id)}
                      disabled={expired}
                    >
                      {copiedId === l.id ? <Check size={14} /> : <Copy size={14} />}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}