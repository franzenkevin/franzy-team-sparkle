/**
 * Comprime/redimensiona uma imagem no navegador antes de enviar ao storage.
 * - Aceita qualquer formato suportado pelo browser (JPEG, PNG, HEIC via decode nativo iOS, WebP).
 * - Reduz o lado maior para `maxSize` (default 1920px) mantendo proporção.
 * - Reencoda como JPEG com qualidade adaptativa para ficar abaixo de `targetBytes`.
 */
export async function compressImage(
  file: File,
  opts: { maxSize?: number; targetBytes?: number; minQuality?: number } = {},
): Promise<File> {
  const maxSize = opts.maxSize ?? 1920;
  const targetBytes = opts.targetBytes ?? 1_500_000; // 1.5MB
  const minQuality = opts.minQuality ?? 0.6;

  // Se já é pequeno e é JPEG, devolve direto
  if (file.size <= targetBytes && /jpe?g$/i.test(file.type)) return file;

  const bitmap = await loadBitmap(file);
  const { width, height } = fitInside(bitmap.width, bitmap.height, maxSize);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(bitmap as any, 0, 0, width, height);
  if ("close" in bitmap) (bitmap as ImageBitmap).close?.();

  let quality = 0.85;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > targetBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.1);
    blob = await canvasToBlob(canvas, quality);
  }

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}

function fitInside(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w > h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" } as any);
    } catch {
      // fallback abaixo
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))), "image/jpeg", quality);
  });
}