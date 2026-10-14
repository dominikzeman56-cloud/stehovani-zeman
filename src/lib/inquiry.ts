/**
 * Čistá logika poptávky: limity, ověření vstupu, hlavičky e-mailu a omezení počtu požadavků.
 * Žádné závislosti na serveru, ať jde testovat a použít i v prohlížeči.
 */

export const MAX_PHOTOS = 6;
/** Vercel pouští tělo požadavku do 4,5 MB, fotky se proto v prohlížeči zmenšují. */
export const MAX_TOTAL_PHOTO_BYTES = 3_800_000;
export const MAX_BODY_CHARS = 12_000;

export type InquiryFields = {
  submissionId: string;
  name: string;
  phone: string;
  email: string;
  body: string;
  /** Orientační cena s DPH, jen do předmětu e-mailu. */
  gross: number;
  from: string;
  to: string;
};

export type InquiryCheck = { ok: true; data: InquiryFields } | { ok: false; error: string };

function text(value: FormDataEntryValue | null | undefined, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Nový řádek v hlavičce e-mailu by dovolil podstrčit další hlavičky. */
export function singleLine(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/.test(value);
}

export function digitsOf(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function validateInquiry(form: FormData): InquiryCheck {
  const name = singleLine(text(form.get("name"), 120));
  const phone = singleLine(text(form.get("phone"), 40));
  const email = singleLine(text(form.get("email"), 254));
  const body = text(form.get("body"), MAX_BODY_CHARS + 1);
  const submissionId = singleLine(text(form.get("submissionId"), 64));

  if (!name) return { ok: false, error: "Chybí jméno." };
  if (digitsOf(phone).length < 9) return { ok: false, error: "Telefon je příliš krátký." };
  if (email && !isValidEmail(email)) return { ok: false, error: "E-mail nevypadá správně." };
  if (!body) return { ok: false, error: "Chybí obsah poptávky." };
  if (body.length > MAX_BODY_CHARS) return { ok: false, error: "Poptávka je příliš dlouhá." };
  if (!/^[A-Za-z0-9-]{8,64}$/.test(submissionId)) return { ok: false, error: "Chybí identifikátor odeslání." };

  const gross = Number(text(form.get("gross"), 20));
  return {
    ok: true,
    data: {
      submissionId,
      name,
      phone,
      email,
      body,
      gross: Number.isFinite(gross) && gross >= 0 ? Math.round(gross) : 0,
      from: singleLine(text(form.get("from"), 120)),
      to: singleLine(text(form.get("to"), 120)),
    },
  };
}

/** Předmět e-mailu, jedna řádka, ať se poptávka dá najít v schránce. */
export function buildSubject(data: Pick<InquiryFields, "name" | "gross" | "from" | "to">): string {
  const route = data.from || data.to ? ` · ${data.from || "?"} → ${data.to || "?"}` : "";
  const price = data.gross > 0 ? ` · cca ${data.gross.toLocaleString("cs-CZ")} Kč s DPH` : "";
  return singleLine(`Poptávka z webu: ${data.name}${price}${route}`).slice(0, 200);
}

export type ImageKind = { mime: string; ext: string };

/** Typ obrázku podle prvních bajtů, ne podle jména ani hlavičky od klienta. */
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  const startsWith = (...sig: number[]) => sig.every((byte, index) => bytes[index] === byte);
  if (startsWith(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", ext: "jpg" };
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return { mime: "image/png", ext: "png" };
  if (startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export type RateLimiter = (key: string, now?: number) => boolean;

/**
 * Okénkový limit v paměti procesu. Na serverless je jen hrubá pojistka proti spamu
 * (každá instance má vlastní počítadlo), ne záruka. Vrací true, když se smí.
 */
export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const hits = new Map<string, number[]>();
  return (key, now = Date.now()) => {
    const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) {
      for (const [k, times] of hits) {
        if (times.every((time) => now - time >= windowMs)) hits.delete(k);
      }
    }
    return true;
  };
}
