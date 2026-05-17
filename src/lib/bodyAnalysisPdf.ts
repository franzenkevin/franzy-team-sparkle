import jsPDF from "jspdf";

type Any = Record<string, any>;

export function generateBodyAnalysisPdf(opts: {
  fullName: string;
  createdAt: string | Date;
  analysis: Any;
  meta?: Any;
}) {
  const { fullName, createdAt, analysis, meta } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensure = (h: number) => {
    if (y + h > pageH - margin) { doc.addPage(); y = margin; }
  };
  const line = (text: string, size = 10, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    for (const ln of lines) { ensure(size + 4); doc.text(ln, margin, y); y += size + 4; }
  };
  const heading = (text: string) => {
    y += 8; ensure(22); line(text, 14, true);
    doc.setDrawColor(255, 106, 0); doc.setLineWidth(1.2);
    doc.line(margin, y, pageW - margin, y); y += 6;
    doc.setDrawColor(0); doc.setLineWidth(0.5);
  };
  const bullets = (label: string, arr: any) => {
    if (!Array.isArray(arr) || arr.length === 0) return;
    line(label, 11, true);
    for (const item of arr) line("• " + String(item), 10);
    y += 4;
  };

  // Header bar
  doc.setFillColor(255, 106, 0);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("FRANZEN TEAM — Análise Corporal IA", margin, 21);
  doc.setTextColor(0, 0, 0);
  y = 56;

  line(fullName || "Aluno", 16, true);
  line(`Emitido em ${new Date(createdAt).toLocaleDateString("pt-BR")}`, 9);
  if (meta?.weight || meta?.height) {
    line(`Peso: ${meta.weight ?? "—"}kg · Altura: ${meta.height ?? "—"}cm`, 9);
  }

  if (analysis?.overall_summary) {
    heading("Resumo");
    line(String(analysis.overall_summary));
  }

  heading("Composição estimada");
  if (analysis?.body_fat_estimate) line(`% gordura estimada: ${analysis.body_fat_estimate}`, 11, true);
  if (analysis?.lean_mass_estimate) line(`Massa magra estimada: ${analysis.lean_mass_estimate}`, 11, true);
  if (analysis?.symmetry) line(`Simetria: ${typeof analysis.symmetry === "string" ? analysis.symmetry : JSON.stringify(analysis.symmetry)}`);

  if (analysis?.muscle_development) {
    heading("Desenvolvimento muscular");
    const md = analysis.muscle_development;
    if (typeof md === "object" && !Array.isArray(md)) {
      for (const [k, v] of Object.entries(md)) line(`${k}: ${String(v)}`);
    } else {
      line(String(md));
    }
  }

  heading("Pontos fortes e a melhorar");
  bullets("Pontos fortes:", analysis?.strong_points);
  bullets("Pontos a melhorar:", analysis?.weak_points);

  if (Array.isArray(analysis?.posture_deviations) && analysis.posture_deviations.length) {
    heading("Postura");
    bullets("Desvios identificados:", analysis.posture_deviations);
  }

  if (Array.isArray(analysis?.recommendations) && analysis.recommendations.length) {
    heading("Recomendações");
    bullets("Coach IA recomenda:", analysis.recommendations);
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Franzen Team · Análise corporal · pág ${i}/${totalPages}`, margin, pageH - 18);
    doc.setTextColor(0);
  }

  const safeName = (fullName || "aluno").replace(/[^\w\-]+/g, "_").slice(0, 40);
  doc.save(`analise-corporal-${safeName}.pdf`);
}