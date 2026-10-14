import { env } from "./env.server.ts";
import { buildSubject, singleLine, type ImageKind, type InquiryFields } from "./inquiry.ts";

export type InquiryPhoto = { name: string; kind: ImageKind; bytes: Uint8Array };

export type InquiryConfig = { apiKey: string; to: string[]; from: string };

/** Bez klíče a příjemce se poptávka neodesílá, klient spadne zpět na mailto. */
export function readInquiryConfig(): InquiryConfig | null {
  const apiKey = env("RESEND_API_KEY");
  const to = (env("INQUIRY_TO") ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  if (!apiKey || to.length === 0) return null;
  return { apiKey, to, from: env("INQUIRY_FROM") ?? "Poptávky z webu <onboarding@resend.dev>" };
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/** Odešle poptávku přes Resend REST API. Vyhodí chybu bez textu odpovědi, ať se osobní údaje nelogují. */
export async function sendInquiryEmail(
  config: InquiryConfig,
  data: InquiryFields,
  photos: InquiryPhoto[],
): Promise<void> {
  const payload = {
    from: config.from,
    to: config.to,
    subject: buildSubject(data),
    text: data.body,
    ...(data.email ? { reply_to: data.email } : {}),
    ...(photos.length
      ? {
          attachments: photos.map((photo, index) => ({
            filename: singleLine(`fotka-${index + 1}.${photo.kind.ext}`),
            content: toBase64(photo.bytes),
          })),
        }
      : {}),
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      // Dvojklik nebo opakované odeslání stejné poptávky nepošle e-mail dvakrát.
      "Idempotency-Key": `poptavka-${data.submissionId}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Resend odmítl odeslání (HTTP ${response.status}).`);
  }
}
