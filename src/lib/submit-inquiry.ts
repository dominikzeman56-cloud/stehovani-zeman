/** Klientská část odeslání poptávky na /api/poptavka. Zmenšení fotek a volání serveru. */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.8;

export type SubmitResult =
  | { ok: true }
  /** `fallback`: server není nastavený nebo spadl, má se použít e-mail z prohlížeče. */
  | { ok: false; code: "not_configured" | "send_failed" | "network"; fallback: true }
  | { ok: false; code: "invalid" | "too_large" | "rate_limited"; fallback: false; message: string };

/** Zmenší fotku na delší stranu 1600 px jako JPEG. Když to nejde, vrátí původní soubor. */
export async function shrinkImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export type InquiryPayload = {
  submissionId: string;
  name: string;
  phone: string;
  email: string;
  body: string;
  gross: number;
  from: string;
  to: string;
  /** Skryté pole proti robotům, člověk ho nevyplní. */
  website: string;
  photos: File[];
};

const MESSAGES: Record<string, string> = {
  too_large: "Fotky jsou dohromady moc velké. Zkuste jich méně.",
  rate_limited: "Poptávek z jedné adresy bylo moc najednou. Zkuste to za chvíli, nebo nám zavolejte.",
};

export async function submitInquiry(payload: InquiryPayload): Promise<SubmitResult> {
  const form = new FormData();
  for (const key of ["submissionId", "name", "phone", "email", "body", "from", "to", "website"] as const) {
    form.set(key, payload[key]);
  }
  form.set("gross", String(payload.gross));
  const shrunk = await Promise.all(payload.photos.map(shrinkImage));
  shrunk.forEach((blob, index) => {
    const original = payload.photos[index];
    form.append("photos", blob, blob === original ? original.name : `fotka-${index + 1}.jpg`);
  });

  let response: Response;
  try {
    response = await fetch("/api/poptavka", { method: "POST", body: form });
  } catch {
    return { ok: false, code: "network", fallback: true };
  }
  if (response.ok) return { ok: true };

  const data = (await response.json().catch(() => ({}))) as { code?: string; error?: string };
  if (data.code === "invalid" || data.code === "too_large" || data.code === "rate_limited") {
    return {
      ok: false,
      code: data.code,
      fallback: false,
      message: data.error ?? MESSAGES[data.code] ?? "Poptávku se nepodařilo odeslat.",
    };
  }
  return { ok: false, code: data.code === "not_configured" ? "not_configured" : "send_failed", fallback: true };
}
