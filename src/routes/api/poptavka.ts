import { createFileRoute } from "@tanstack/react-router";
import {
  MAX_PHOTOS,
  MAX_TOTAL_PHOTO_BYTES,
  createRateLimiter,
  sniffImage,
  validateInquiry,
} from "@/lib/inquiry";

/** Hrubá pojistka na jednu instanci: 5 poptávek za 10 minut z jedné adresy. */
const allowed = createRateLimiter(5, 10 * 60_000);
/** Tělo požadavku nad limit Vercelu (4,5 MB) se ani nečte. */
const MAX_REQUEST_BYTES = 4_400_000;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export const Route = createFileRoute("/api/poptavka")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const length = Number(request.headers.get("content-length") ?? 0);
        if (length > MAX_REQUEST_BYTES) return json({ ok: false, code: "too_large" }, 413);

        const { readInquiryConfig, sendInquiryEmail } = await import("@/lib/inquiry.server");
        const config = readInquiryConfig();
        if (!config) return json({ ok: false, code: "not_configured" }, 503);

        if (!allowed(clientKey(request))) return json({ ok: false, code: "rate_limited" }, 429);

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return json({ ok: false, code: "invalid", error: "Nečitelný formulář." }, 400);
        }

        // Pole "website" je skryté. Člověk ho nevyplní, bot ano. Tvářit se, že vše prošlo.
        if (typeof form.get("website") === "string" && String(form.get("website")).trim() !== "") {
          return json({ ok: true });
        }

        const checked = validateInquiry(form);
        if (!checked.ok) return json({ ok: false, code: "invalid", error: checked.error }, 400);

        const files = form.getAll("photos").filter((entry): entry is File => entry instanceof File && entry.size > 0);
        if (files.length > MAX_PHOTOS) return json({ ok: false, code: "invalid", error: "Příliš mnoho fotek." }, 400);
        const total = files.reduce((sum, file) => sum + file.size, 0);
        if (total > MAX_TOTAL_PHOTO_BYTES) return json({ ok: false, code: "too_large" }, 413);

        const photos = [];
        for (const file of files) {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const kind = sniffImage(bytes);
          if (!kind) return json({ ok: false, code: "invalid", error: "Příloha není obrázek." }, 400);
          photos.push({ name: file.name, kind, bytes });
        }

        try {
          await sendInquiryEmail(config, checked.data, photos);
        } catch (error) {
          // Bez těla poptávky v logu, jsou v něm osobní údaje.
          console.error("[poptavka] odeslání selhalo:", error instanceof Error ? error.message : "neznámá chyba");
          return json({ ok: false, code: "send_failed" }, 502);
        }
        return json({ ok: true });
      },
    },
  },
});
