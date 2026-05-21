import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft, FileText, Upload, Loader2, Download, Trash2, FlaskConical, ListChecks,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Exames — Franzen Team" }] }),
  component: ExamsPage,
});

type Exam = {
  id: string;
  exam_name: string;
  exam_type: string | null;
  exam_date: string | null;
  notes: string | null;
  file_path: string;
  file_mime: string | null;
  created_at: string;
};

const EXAM_TYPES = [
  "Hemograma completo",
  "Glicemia em jejum",
  "Hemoglobina glicada (HbA1c)",
  "Insulina + HOMA-IR",
  "Perfil lipídico (colesterol total/HDL/LDL/triglicerídeos)",
  "TSH e T4 livre",
  "T3 total / T3 livre / T3 reverso",
  "Cortisol matinal",
  "Testosterona total e livre",
  "SHBG",
  "Estradiol",
  "Progesterona",
  "DHEA-S",
  "Prolactina",
  "FSH e LH",
  "Vitamina D (25-OH)",
  "Vitamina B12 e ácido fólico",
  "Ferritina + ferro sérico + saturação de transferrina",
  "PCR ultrassensível",
  "TGO / TGP / GGT (função hepática)",
  "Ureia e creatinina (função renal)",
  "Ácido úrico",
  "Eletrólitos (sódio/potássio/magnésio/cálcio)",
  "Urina tipo I (EAS)",
  "Bioimpedância / DEXA / Adipometria",
  "ECG / Teste ergométrico (esforço)",
];

function ExamsPage() {
  const [items, setItems] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("user_exams")
      .select("*")
      .eq("user_id", user.id)
      .order("exam_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    setItems((data as Exam[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!file) { toast.error("Selecione o arquivo do exame"); return; }
    if (!name.trim()) { toast.error("Informe o nome do exame"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${Date.now()}_${name.trim().replace(/\s+/g, "_")}.${ext}`;
    const { error: upErr } = await supabase.storage.from("exams").upload(path, file, { upsert: false });
    if (upErr) { toast.error(upErr.message); setSaving(false); return; }
    const { error } = await supabase.from("user_exams").insert({
      user_id: user.id,
      exam_name: name.trim(),
      exam_type: type || null,
      exam_date: date || null,
      notes: notes.trim() || null,
      file_path: path,
      file_mime: file.type,
      file_size: file.size,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Exame enviado");
    setName(""); setType(""); setNotes(""); setFile(null);
    load();
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("exams").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Não foi possível abrir o arquivo"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (e: Exam) => {
    if (!confirm(`Remover o exame "${e.exam_name}"?`)) return;
    await supabase.storage.from("exams").remove([e.file_path]);
    await supabase.from("user_exams").delete().eq("id", e.id);
    setItems((p) => p.filter((x) => x.id !== e.id));
  };

  return (
    <div className="min-h-screen container mx-auto px-4 py-6 max-w-3xl">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4">
        <ArrowLeft size={14}/> Dashboard
      </Link>
      <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
        <FlaskConical className="text-primary" /> Meus exames
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Suba seus exames laboratoriais e de imagem aqui. Seu coach terá acesso para revisão.
      </p>

      {/* Upload */}
      <Card className="mt-6 p-5 space-y-3">
        <h2 className="font-heading font-semibold flex items-center gap-2">
          <Upload size={16} className="text-primary" /> Novo exame
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Nome do exame</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Hemograma de 11/2025" />
          </div>
          <div>
            <Label>Tipo (opcional)</Label>
            <Input list="exam-types" value={type} onChange={(e) => setType(e.target.value)} placeholder="Categoria" />
            <datalist id="exam-types">
              {EXAM_TYPES.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div>
            <Label>Data do exame</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Arquivo (PDF ou imagem)</Label>
            <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <div>
          <Label>Observações (opcional)</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sintomas, medicações em uso, contexto..." />
        </div>
        <Button onClick={upload} disabled={saving} className="w-full">
          {saving ? <Loader2 className="animate-spin mr-2" size={14}/> : <Upload size={14} className="mr-2" />}
          {saving ? "Enviando..." : "Enviar exame"}
        </Button>
      </Card>

      {/* Lista de indicações */}
      <Card className="mt-6 p-5">
        <h2 className="font-heading font-semibold flex items-center gap-2 mb-3">
          <ListChecks size={16} className="text-primary" /> Lista completa de exames recomendados
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Use esta lista como referência ao solicitar exames com seu médico. Não é prescrição —
          serve para orientar a coleta de dados que o coach utiliza no acompanhamento.
        </p>
        <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {EXAM_TYPES.map((t) => (
            <li key={t} className="flex items-start gap-2 text-muted-foreground">
              <span className="text-primary mt-0.5">•</span> <span>{t}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Histórico */}
      <h2 className="font-heading font-semibold mt-8 mb-3">Histórico</h2>
      {loading ? (
        <div className="py-8 grid place-items-center"><Loader2 className="animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum exame enviado ainda.</p>
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <Card key={e.id} className="p-4 flex items-center gap-3">
              <FileText className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{e.exam_name}</p>
                <p className="text-xs text-muted-foreground">
                  {e.exam_type ? `${e.exam_type} • ` : ""}
                  {e.exam_date ?? new Date(e.created_at).toLocaleDateString("pt-BR")}
                </p>
                {e.notes && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{e.notes}</p>}
              </div>
              <Button size="sm" variant="outline" onClick={() => download(e.file_path)}>
                <Download size={14} />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(e)}>
                <Trash2 size={14} className="text-rose-400" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}