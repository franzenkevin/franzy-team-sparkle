import jsPDF from "jspdf";

type Diet = {
  meals?: Array<{
    name?: string;
    items?: Array<{ food: string; amount?: string }>;
  }>;
};

/** Aggregate diet meals into a deduplicated, scaled grocery list (1 week). */
export function buildShoppingList(diet: Diet, days = 7): Array<{ food: string; amount: string }> {
  const map = new Map<string, { qty: number; unit: string; raw: string[] }>();

  for (const meal of diet.meals ?? []) {
    for (const item of meal.items ?? []) {
      const key = item.food.trim().toLowerCase();
      const m = (item.amount ?? "").match(/([\d.,]+)\s*(\w+)?/);
      const qty = m ? Number(m[1].replace(",", ".")) : 0;
      const unit = m?.[2] ?? "";
      const cur = map.get(key) ?? { qty: 0, unit, raw: [] };
      cur.qty += qty;
      if (!cur.unit && unit) cur.unit = unit;
      cur.raw.push(item.amount ?? "");
      map.set(key, cur);
    }
  }

  return Array.from(map.entries())
    .map(([food, { qty, unit }]) => ({
      food,
      amount: qty > 0 ? `${(qty * days).toFixed(qty < 10 ? 1 : 0)} ${unit}`.trim() : "—",
    }))
    .sort((a, b) => a.food.localeCompare(b.food, "pt"));
}

export function generateShoppingListPdf(opts: { fullName?: string; diet: Diet; days?: number }) {
  const items = buildShoppingList(opts.diet, opts.days ?? 7);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Lista de compras semanal", margin, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text(
    `${opts.fullName ?? "Atleta"} · ${opts.days ?? 7} dias · gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    margin,
    y,
  );
  y += 24;
  doc.setTextColor(0);

  doc.setFontSize(12);
  for (const it of items) {
    if (y > 780) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.text("☐", margin, y);
    doc.setFont("helvetica", "normal");
    const food = it.food.charAt(0).toUpperCase() + it.food.slice(1);
    doc.text(food, margin + 16, y);
    doc.setTextColor(120);
    doc.text(it.amount, 480, y, { align: "right" });
    doc.setTextColor(0);
    y += 20;
  }

  doc.save(`lista-compras-${new Date().toISOString().slice(0, 10)}.pdf`);
}