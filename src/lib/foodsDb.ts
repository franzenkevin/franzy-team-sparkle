// Base local curada com base na TBCA (FCF/USP) e TACO (Unicamp).
// Valores por 100 g de parte comestível.
export type FoodItem = {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "TBCA" | "TACO";
};

export const LOCAL_FOODS: FoodItem[] = [
  // Proteínas
  { name: "Frango, peito, sem pele, grelhado", kcal: 159, protein: 32, carbs: 0, fat: 3.2, source: "TACO" },
  { name: "Frango, sobrecoxa, sem pele, cozida", kcal: 170, protein: 27, carbs: 0, fat: 6.5, source: "TACO" },
  { name: "Carne bovina, patinho, grelhado", kcal: 219, protein: 35.9, carbs: 0, fat: 7.3, source: "TACO" },
  { name: "Carne bovina, alcatra, grelhada", kcal: 211, protein: 31.9, carbs: 0, fat: 8.2, source: "TACO" },
  { name: "Carne bovina, coxão mole, cozido", kcal: 220, protein: 35.9, carbs: 0, fat: 7.3, source: "TACO" },
  { name: "Carne suína, lombo, assado", kcal: 210, protein: 35.7, carbs: 0, fat: 6.8, source: "TACO" },
  { name: "Tilápia, filé, grelhado", kcal: 128, protein: 26.6, carbs: 0, fat: 2.4, source: "TBCA" },
  { name: "Salmão, filé, grelhado", kcal: 211, protein: 25.4, carbs: 0, fat: 12, source: "TBCA" },
  { name: "Atum em água, lata", kcal: 116, protein: 25.5, carbs: 0, fat: 1, source: "TBCA" },
  { name: "Sardinha em óleo, lata", kcal: 208, protein: 24, carbs: 0, fat: 12, source: "TBCA" },
  { name: "Ovo de galinha, inteiro, cozido", kcal: 146, protein: 13.3, carbs: 0.6, fat: 9.5, source: "TACO" },
  { name: "Clara de ovo, cozida", kcal: 52, protein: 10.9, carbs: 0.7, fat: 0.2, source: "TACO" },
  { name: "Whey protein concentrado (médio)", kcal: 390, protein: 75, carbs: 9, fat: 5, source: "TBCA" },

  // Carboidratos
  { name: "Arroz, branco, cozido", kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2, source: "TACO" },
  { name: "Arroz, integral, cozido", kcal: 124, protein: 2.6, carbs: 25.8, fat: 1, source: "TACO" },
  { name: "Feijão, carioca, cozido", kcal: 76, protein: 4.8, carbs: 13.6, fat: 0.5, source: "TACO" },
  { name: "Feijão, preto, cozido", kcal: 77, protein: 4.5, carbs: 14, fat: 0.5, source: "TACO" },
  { name: "Lentilha, cozida", kcal: 93, protein: 6.3, carbs: 16.3, fat: 0.5, source: "TACO" },
  { name: "Macarrão, cozido", kcal: 102, protein: 3.4, carbs: 19.9, fat: 1.3, source: "TACO" },
  { name: "Batata, inglesa, cozida", kcal: 52, protein: 1.2, carbs: 11.9, fat: 0, source: "TACO" },
  { name: "Batata doce, cozida", kcal: 77, protein: 0.6, carbs: 18.4, fat: 0.1, source: "TACO" },
  { name: "Mandioca, cozida", kcal: 125, protein: 0.6, carbs: 30.1, fat: 0.3, source: "TACO" },
  { name: "Aveia, flocos crus", kcal: 394, protein: 13.9, carbs: 66.6, fat: 8.5, source: "TACO" },
  { name: "Pão francês", kcal: 300, protein: 8, carbs: 58.6, fat: 3.1, source: "TACO" },
  { name: "Pão integral", kcal: 253, protein: 9.4, carbs: 49.9, fat: 3, source: "TACO" },
  { name: "Tapioca", kcal: 240, protein: 0, carbs: 60, fat: 0, source: "TBCA" },
  { name: "Cuscuz de milho cozido", kcal: 113, protein: 2.2, carbs: 25.7, fat: 0.2, source: "TACO" },

  // Frutas
  { name: "Banana, prata", kcal: 98, protein: 1.3, carbs: 26, fat: 0.1, source: "TACO" },
  { name: "Maçã, com casca", kcal: 56, protein: 0.3, carbs: 15.2, fat: 0, source: "TACO" },
  { name: "Mamão, papaia", kcal: 40, protein: 0.5, carbs: 10.4, fat: 0.1, source: "TACO" },
  { name: "Laranja, pera", kcal: 37, protein: 1, carbs: 8.9, fat: 0.1, source: "TACO" },
  { name: "Abacate", kcal: 96, protein: 1.2, carbs: 6, fat: 8.4, source: "TACO" },
  { name: "Morango", kcal: 30, protein: 0.9, carbs: 6.8, fat: 0.3, source: "TACO" },
  { name: "Uva, itália", kcal: 53, protein: 0.7, carbs: 13.6, fat: 0, source: "TACO" },
  { name: "Melancia", kcal: 33, protein: 0.9, carbs: 8.1, fat: 0.1, source: "TACO" },
  { name: "Abacaxi", kcal: 48, protein: 0.9, carbs: 12.3, fat: 0.1, source: "TACO" },

  // Vegetais / saladas
  { name: "Brócolis, cozido", kcal: 25, protein: 2.1, carbs: 4, fat: 0.4, source: "TACO" },
  { name: "Couve, manteiga, refogada", kcal: 90, protein: 3.6, carbs: 9.8, fat: 4.4, source: "TACO" },
  { name: "Alface, lisa, crua", kcal: 11, protein: 1.4, carbs: 1.7, fat: 0.2, source: "TACO" },
  { name: "Tomate, com semente, cru", kcal: 15, protein: 1.1, carbs: 3.1, fat: 0.2, source: "TACO" },
  { name: "Cenoura, crua", kcal: 34, protein: 1.3, carbs: 7.7, fat: 0.2, source: "TACO" },
  { name: "Pepino, cru", kcal: 10, protein: 0.7, carbs: 2, fat: 0.1, source: "TACO" },
  { name: "Espinafre, refogado", kcal: 25, protein: 2.5, carbs: 3.4, fat: 0.4, source: "TACO" },

  // Laticínios
  { name: "Leite, integral", kcal: 61, protein: 2.9, carbs: 4.3, fat: 3.2, source: "TACO" },
  { name: "Leite, desnatado", kcal: 35, protein: 3.3, carbs: 4.9, fat: 0.2, source: "TACO" },
  { name: "Iogurte, natural integral", kcal: 51, protein: 4.1, carbs: 1.9, fat: 3, source: "TACO" },
  { name: "Iogurte, natural desnatado", kcal: 41, protein: 4.6, carbs: 5.8, fat: 0.1, source: "TACO" },
  { name: "Queijo, minas frescal", kcal: 264, protein: 17.4, carbs: 3.2, fat: 20.2, source: "TACO" },
  { name: "Queijo, mussarela", kcal: 330, protein: 22.6, carbs: 3, fat: 25, source: "TACO" },
  { name: "Queijo, ricota", kcal: 140, protein: 12.6, carbs: 3.1, fat: 8.5, source: "TACO" },
  { name: "Requeijão cremoso", kcal: 257, protein: 9.6, carbs: 3, fat: 23.4, source: "TBCA" },

  // Gorduras / oleaginosas
  { name: "Azeite de oliva extra virgem", kcal: 884, protein: 0, carbs: 0, fat: 100, source: "TBCA" },
  { name: "Óleo de soja", kcal: 884, protein: 0, carbs: 0, fat: 100, source: "TACO" },
  { name: "Manteiga", kcal: 717, protein: 0.6, carbs: 0.1, fat: 81.1, source: "TACO" },
  { name: "Castanha do Pará", kcal: 643, protein: 14.5, carbs: 15.1, fat: 63.5, source: "TACO" },
  { name: "Castanha de caju, torrada", kcal: 570, protein: 18.5, carbs: 29.1, fat: 46.3, source: "TACO" },
  { name: "Amendoim, torrado", kcal: 544, protein: 27.4, carbs: 20.3, fat: 43.9, source: "TACO" },
  { name: "Pasta de amendoim integral", kcal: 588, protein: 25, carbs: 20, fat: 50, source: "TBCA" },
  { name: "Amêndoa", kcal: 581, protein: 18.6, carbs: 19.5, fat: 53.4, source: "TACO" },
  { name: "Chocolate 70% cacau", kcal: 539, protein: 7.8, carbs: 45.9, fat: 36, source: "TBCA" },
];

export function searchLocalFoods(query: string, limit = 12): FoodItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return LOCAL_FOODS.slice(0, limit);
  return LOCAL_FOODS.filter((f) => f.name.toLowerCase().includes(q)).slice(0, limit);
}

export type OffProduct = {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  barcode?: string;
};

// OpenFoodFacts — busca por nome (rótulos / marcas comerciais)
export async function searchOpenFoodFacts(query: string): Promise<OffProduct[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&lc=pt`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data: any = await res.json();
    const out: OffProduct[] = [];
    for (const p of data.products ?? []) {
      const n = p.nutriments ?? {};
      const kcal = Number(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0);
      if (!kcal) continue;
      out.push({
        name: p.product_name_pt || p.product_name || p.brands || "Produto",
        kcal,
        protein: Number(n.proteins_100g ?? 0),
        carbs: Number(n.carbohydrates_100g ?? 0),
        fat: Number(n.fat_100g ?? 0),
        barcode: p.code,
      });
    }
    return out;
  } catch {
    return [];
  }
}

// OpenFoodFacts — busca direta por código de barras
export async function lookupBarcode(code: string): Promise<OffProduct | null> {
  const c = code.trim();
  if (!c) return null;
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(c)}.json`);
    if (!res.ok) return null;
    const data: any = await res.json();
    const p = data.product;
    if (!p) return null;
    const n = p.nutriments ?? {};
    const kcal = Number(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0);
    return {
      name: p.product_name_pt || p.product_name || p.brands || "Produto",
      kcal,
      protein: Number(n.proteins_100g ?? 0),
      carbs: Number(n.carbohydrates_100g ?? 0),
      fat: Number(n.fat_100g ?? 0),
      barcode: c,
    };
  } catch {
    return null;
  }
}