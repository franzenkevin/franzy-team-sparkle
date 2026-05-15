import jsPDF from "jspdf";

type Any = Record<string, any>;

export function generateProtocolPdf(opts: {
  fullName: string;
  protocol: { training: Any; diet: Any; start_date?: string; end_date?: string; version?: number };
}) {
  const { fullName, protocol } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };
  const writeLine = (text: string, size = 10, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    for (const line of lines) {
      ensureSpace(size + 4);
      doc.text(line, margin, y);
      y += size + 4;
    }
  };
  const heading = (text: string) => {
    y += 6;
    ensureSpace(20);
    writeLine(text, 14, true);
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  };

  // Header
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Franzen Team — Protocolo", margin, 38);
  doc.setTextColor(0);
  y = 80;

  writeLine(`Atleta: ${fullName || "—"}`, 11, true);
  writeLine(
    `Período: ${protocol.start_date ?? "—"} → ${protocol.end_date ?? "—"}   |   Versão: ${protocol.version ?? 1}`,
    10
  );

  // Diet
  const diet = protocol.diet ?? {};
  heading("Dieta");
  writeLine(
    `Meta: ${diet.target_kcal ?? "—"} kcal | Prot ${diet.target_protein_g ?? "—"}g | Carb ${diet.target_carbs_g ?? "—"}g | Gord ${diet.target_fat_g ?? "—"}g`,
    10
  );
  const meals: Any[] = Array.isArray(diet.meals) ? diet.meals : [];
  meals.forEach((m, i) => {
    writeLine(`Refeição ${i + 1}: ${m.name ?? m.title ?? ""}${m.time ? ` (${m.time})` : ""}`, 11, true);
    const items: Any[] = Array.isArray(m.items) ? m.items : Array.isArray(m.foods) ? m.foods : [];
    items.forEach((it) => {
      const name = it.name ?? it.food ?? "";
      const qty = it.quantity ?? it.amount ?? "";
      const unit = it.unit ?? "";
      writeLine(`  • ${name} — ${qty}${unit ? " " + unit : ""}`, 10);
    });
    if (m.notes) writeLine(`  Obs: ${m.notes}`, 9);
  });

  // Training
  const training = protocol.training ?? {};
  heading("Treino");
  writeLine(`Split: ${training.split ?? "—"}   |   Dias/sem: ${training.days_per_week ?? "—"}`, 10);
  const days: Any[] =
    (Array.isArray(training.days) && training.days) ||
    (Array.isArray(training.workouts) && training.workouts) ||
    [];
  days.forEach((d, i) => {
    writeLine(`${d.weekday ? d.weekday + " — " : ""}${d.name ?? `Treino ${i + 1}`}`, 11, true);
    const exs: Any[] = Array.isArray(d.exercises) ? d.exercises : [];
    exs.forEach((e) => {
      const sets = e.sets ?? "—";
      const reps = e.reps ?? "—";
      const rest = e.rest ? ` | desc ${e.rest}` : "";
      writeLine(`  • ${e.name ?? "Exercício"} — ${sets}x${reps}${rest}`, 10);
      if (e.notes) writeLine(`     Obs: ${e.notes}`, 9);
    });
  });

  doc.save(`protocolo-franzen-${(fullName || "atleta").toLowerCase().replace(/\s+/g, "-")}.pdf`);
}