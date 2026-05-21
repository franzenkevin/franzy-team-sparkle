import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { adminGetStudent, adminUpdateStudent, adminDeleteStudent } from "@/lib/adminStudents.functions";

export function EditStudentDialog({
  open,
  onOpenChange,
  userId,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const getStudent = useServerFn(adminGetStudent);
  const updateStudent = useServerFn(adminUpdateStudent);
  const deleteStudent = useServerFn(adminDeleteStudent);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("");
  const [planStart, setPlanStart] = useState("");
  const [planEnd, setPlanEnd] = useState("");

  useEffect(() => {
    if (!open || !userId) return;
    (async () => {
      setLoading(true);
      try {
        const r: any = await getStudent({ data: { userId } });
        setFullName(r.fullName ?? "");
        setEmail(r.email ?? "");
        setPassword("");
        setPlan(r.plan ?? "");
        setPlanStart(r.planStart ?? "");
        setPlanEnd(r.planEnd ?? "");
      } catch (e: any) {
        toast.error(e.message ?? "Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, userId]);

  const submit = async () => {
    if (!fullName.trim()) return toast.error("Nome obrigatório");
    if (!email.trim()) return toast.error("E-mail obrigatório");
    if (password && password.length < 6) return toast.error("Senha mínima de 6 caracteres");
    setSaving(true);
    try {
      await updateStudent({
        data: {
          userId,
          fullName,
          email,
          password: password || null,
          plan: plan || null,
          planStart: planStart || null,
          planEnd: planEnd || null,
        },
      });
      toast.success("Dados atualizados!");
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deleteStudent({ data: { userId } });
      toast.success("Aluno excluído");
      setConfirmDelete(false);
      onOpenChange(false);
      onDeleted();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar aluno</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-6 flex items-center justify-center text-muted-foreground">
              <Loader2 className="animate-spin" size={18} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome completo</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Nova senha <span className="text-muted-foreground text-xs">(deixe vazio para manter)</span></Label>
                <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nova senha (mín. 6)" />
              </div>
              <div className="space-y-1.5">
                <Label>Plano contratado</Label>
                <Input value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Ex: Premium 60 dias" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Início do plano</Label>
                  <Input type="date" value={planStart ?? ""} onChange={(e) => setPlanStart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fim do plano</Label>
                  <Input type="date" value={planEnd ?? ""} onChange={(e) => setPlanEnd(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex sm:justify-between gap-2">
            <Button variant="destructive" onClick={() => setConfirmDelete(true)} disabled={loading || saving} className="gap-1">
              <Trash2 size={14} /> Excluir aluno
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={loading || saving}>{saving ? "Salvando…" : "Salvar"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aluno permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o login, perfil, prescrições, feedbacks, mensagens e demais dados deste aluno. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo…" : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}