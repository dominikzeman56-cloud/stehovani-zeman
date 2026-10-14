import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, ImagePlus, Loader2, Minus, Plus, Route, Search, Trash2, X } from "lucide-react";
import { CARRY_MAX_M, CARRY_M_PER_FLOOR, CATEGORIES, COMPANY, ESTIMATE_CAVEAT, FLAT_31_M3, ITEMS, LIFT_LABEL, MAX_VOLUME_M3, PAYLOAD_KG, PRICE_PER_KM, TRIP_PRICE, WEIGHT_LABEL, fold, type LiftKind, type WeightClass } from "@/data/catalog";
import { HOME_COUNTRY, SERVED_COUNTRY_CODES, abroadCountries, nominatimUrl, parseNominatim } from "@/lib/geo";
import { computeQuote, formatKc, formatKm, formatVolume, isDistanceUnknown, readManualKm, type Cart, type ExtraItem, type RouteLegs } from "@/lib/quote";
import { Button } from "@/components/ui/button";
import { AddressInput, type Point } from "@/components/address-input";
import { cn } from "@/lib/cn";
import { submitInquiry } from "@/lib/submit-inquiry";

const STORAGE_KEY = "zeman-kalkulacka-v1";
const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

type Photo = { id: string; file: File; url: string };

type Saved = {
  cart: Cart;
  floorsFrom: number;
  floorsTo: number;
  carryFrom: number;
  carryTo: number;
  liftFrom: LiftKind;
  liftTo: LiftKind;
  from: string;
  to: string;
  includeApproach: boolean;
  includeReturn: boolean;
  manual: string;
  useManual: boolean;
  name: string;
  phone: string;
  email: string;
  date: string;
  note: string;
  disassembly: boolean;
  packing: boolean;
  extras: ExtraItem[];
};

const EMPTY: Saved = {
  cart: {},
  floorsFrom: 0,
  floorsTo: 0,
  carryFrom: 0,
  carryTo: 0,
  liftFrom: "none",
  liftTo: "none",
  from: "",
  to: "",
  includeApproach: true,
  includeReturn: true,
  manual: "",
  useManual: false,
  name: "",
  phone: "",
  email: "",
  date: "",
  note: "",
  disassembly: false,
  packing: false,
  extras: [],
};

async function geocodeIn(query: string, countries: string[]): Promise<Point | null> {
  const response = await fetch(nominatimUrl(query, countries), { headers: { "Accept-Language": "cs" } });
  if (!response.ok) throw new Error("Vyhledání adresy selhalo.");
  return parseNominatim(await response.json());
}

// Napsaná adresa se hledá nejdřív v ČR a až když tam nic není, i v sousedních zemích.
async function geocode(query: string): Promise<Point | null> {
  return (await geocodeIn(query, [HOME_COUNTRY])) ?? (await geocodeIn(query, SERVED_COUNTRY_CODES));
}

async function routeLegs(from: Point, to: Point): Promise<RouteLegs> {
  const depot = COMPANY.depot;
  const coords = [depot, from, to, depot].map((point) => `${point.lon},${point.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Výpočet trasy selhal.");
  const data = (await response.json()) as {
    routes?: { legs?: { distance: number; duration: number }[] }[];
  };
  const legs = data.routes?.[0]?.legs;
  if (!legs || legs.length < 3) throw new Error("Trasu se nepodařilo spočítat.");
  const km = (meters: number) => Math.round((meters / 1000) * 10) / 10;
  const minutes = (seconds: number) => Math.round(seconds / 60);
  return {
    approachKm: km(legs[0].distance),
    moveKm: km(legs[1].distance),
    returnKm: km(legs[2].distance),
    approachMin: minutes(legs[0].duration),
    moveMin: minutes(legs[1].duration),
    returnMin: minutes(legs[2].duration),
  };
}

function mapsUrl(from: string, to: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=driving`;
}

function tripWord(count: number) {
  if (count === 1) return "1 jízdu";
  if (count >= 2 && count <= 4) return `${count} jízdy`;
  return `${count} jízd`;
}

function loadNote(volume: number, trips: number) {
  if (volume <= 0.001) return "Zatím prázdno. Do jedné jízdy se vejde i byt 3+1.";
  if (trips <= 1 && volume < FLAT_31_M3) return "Ještě je místo. Byt 3+1 se vejde najednou.";
  if (trips <= 1) return "Jedna jízda. I byt 3+1 se sem vejde.";
  return `To už je ${tripWord(trips)}. Každá další jízda je ${formatKc(TRIP_PRICE)}.`;
}

function rideFill(volume: number) {
  if (volume <= 0) return 0;
  const rest = volume % MAX_VOLUME_M3;
  if (rest < 0.001) return 1;
  return rest / MAX_VOLUME_M3;
}

function photoMailLine(count: number) {
  if (count <= 0) return "Fotky: žádné";
  const word = count === 1 ? "1 fotka" : count < 5 ? `${count} fotky` : `${count} fotek`;
  return `Fotky: ${word}. Z počítače je prohlížeč do mailu sám nedá, je potřeba je přiložit.`;
}

function canSharePhotos(files: File[]) {
  if (!files.length || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

function buildMail(saved: Saved, legs: RouteLegs | null, photoCount = 0, abroad: string[] = []) {
  const quote = computeQuote({
    cart: saved.cart,
    floorsFrom: saved.floorsFrom,
    floorsTo: saved.floorsTo,
    carryFrom: saved.carryFrom,
    carryTo: saved.carryTo,
    liftFrom: saved.liftFrom,
    liftTo: saved.liftTo,
    legs,
    includeApproach: saved.includeApproach,
    includeReturn: saved.includeReturn,
    useManual: saved.useManual,
    manualKm: readManualKm(saved.manual),
    extras: saved.extras,
  });
  const list = quote.lines.map((line) => `  • ${line.name} ×${line.qty}  (${formatVolume(line.volume)})`).join("\n");
  const distanceUnknown = isDistanceUnknown(quote, legs);
  const body = [
    "Dobrý den,",
    "",
    "posílám orientační poptávku ze webu:",
    "Soupis je podklad pro cenu a plánování vozu. Věci navíc mohou změnit cenu.",
    "",
    `Jméno: ${saved.name || "—"}`,
    `Telefon: ${saved.phone || "—"}`,
    `E-mail: ${saved.email || "—"}`,
    `Termín: ${saved.date || "dle domluvy"}`,
    "",
    "POLOŽKY",
    list || "  (žádné)",
    "",
    `Objem: ${formatVolume(quote.volume)}`,
    `Hmotnost: ${quote.weight} kg`,
    `Jízdy vozu: ${quote.trips}`,
    "",
    quote.negotiate ? "POZOR: hodně beden s knihami po schodech/donášce, cenu domluvit zvlášť." : "",
    abroad.length ? `POZOR: adresa mimo ČR (${abroad.join(", ")}), cenu jízdy potvrdit.` : "",
    distanceUnknown ? "POZOR: vzdálenost není spočítaná, odhad je bez dopravného. Dopočítat podle adres." : "",
    `Odkud: ${saved.from || "—"} · ${LIFT_LABEL[saved.liftFrom]}, pater ${saved.floorsFrom}, donáška od vozu ${saved.carryFrom} m`,
    `Kam: ${saved.to || "—"} · ${LIFT_LABEL[saved.liftTo]}, pater ${saved.floorsTo}, donáška od vozu ${saved.carryTo} m`,
    `Vzdálenost k fakturaci: ${distanceUnknown ? "nespočítáno" : `${formatKm(quote.distanceKm)}${quote.manual ? " (zadáno ručně)" : ""}`}`,
    `Demontáž nábytku: ${saved.disassembly ? "ano" : "ne"}`,
    `Zabalit křehké: ${saved.packing ? "ano" : "ne"}`,
    saved.note.trim() ? `Přístup a poznámka: ${saved.note.trim()}` : "Přístup a poznámka: neuvedeno",
    photoMailLine(photoCount),
    "",
    "ODHAD BEZ DPH",
    `Základní jízda: ${formatKc(quote.tripFee)}`,
    `Položky: ${formatKc(quote.items)}`,
    `Patra: ${formatKc(quote.floors)}`,
    `Donáška: ${formatKc(quote.carry)}`,
    `Odpojení pračky/myčky: ${formatKc(quote.handling)}`,
    `Dopravné: ${distanceUnknown ? "bude dopočteno" : formatKc(quote.transport)}`,
    `Celkem bez DPH: ${formatKc(quote.net)}`,
    `DPH 21 %: ${formatKc(quote.vat)}`,
    `Celkem s DPH: ${formatKc(quote.gross)}`,
    "",
    ESTIMATE_CAVEAT,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { quote, body };
}

export function Calculator() {
  const [saved, setSaved] = useState<Saved>(EMPTY);
  const [cat, setCat] = useState<string>(CATEGORIES[0].id);
  const [query, setQuery] = useState("");
  const [legs, setLegs] = useState<RouteLegs | null>(null);
  const [routeError, setRouteError] = useState("");
  const [routing, setRouting] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [skipPhotos, setSkipPhotos] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const submissionId = useRef(crypto.randomUUID());
  const honeypot = useRef<HTMLInputElement>(null);
  const [draftName, setDraftName] = useState("");
  const [draftQty, setDraftQty] = useState("1");
  const [draftVol, setDraftVol] = useState("");
  const [draftWeight, setDraftWeight] = useState("");
  const [draftClass, setDraftClass] = useState<WeightClass>("medium");
  const [fromPoint, setFromPoint] = useState<Point | null>(null);
  const [toPoint, setToPoint] = useState<Point | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const abroad = abroadCountries([fromPoint, toPoint]);

  useEffect(() => {
    // Dřívější verze ukládala rozdělaný soupis i kontakt do prohlížeče. Teď se nic neukládá,
    // refresh začne od nuly, takže po sobě nezůstanou jména a telefony ani na cizím počítači.
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* soukromý režim, nevadí */
    }
  }, []);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
    };
  }, []);

  const quote = useMemo(
    () =>
      computeQuote({
        cart: saved.cart,
        floorsFrom: saved.floorsFrom,
        floorsTo: saved.floorsTo,
    carryFrom: saved.carryFrom,
    carryTo: saved.carryTo,
        liftFrom: saved.liftFrom,
        liftTo: saved.liftTo,
        legs,
        includeApproach: saved.includeApproach,
        includeReturn: saved.includeReturn,
        useManual: saved.useManual,
        manualKm: readManualKm(saved.manual),
        extras: saved.extras,
      }),
    [saved, legs],
  );

  const visible = useMemo(() => {
    const q = fold(query.trim());
    if (q) return ITEMS.filter((item) => fold(item.name).includes(q));
    return ITEMS.filter((item) => item.cat === cat);
  }, [cat, query]);

  function patch(partial: Partial<Saved>) {
    setSaved((current) => ({ ...current, ...partial }));
    // Změna adresy zneplatní spočítanou trasu, jinak cena zůstane ze starých adres.
    if ("from" in partial || "to" in partial) setLegs(null);
  }

  function setQty(id: string, next: number) {
    setSaved((current) => {
      const cart = { ...current.cart };
      if (next <= 0) delete cart[id];
      else cart[id] = Math.min(99, next);
      return { ...current, cart };
    });
  }

  function addExtra() {
    const name = draftName.trim();
    if (!name) {
      setNotice("Napište název další položky.");
      return;
    }
    const qty = Math.min(99, Math.max(1, Math.round(Number(draftQty.replace(",", ".")) || 1)));
    const vol = Math.max(0, Number(draftVol.replace(",", ".")) || 0);
    const weight = Math.max(0, Number(draftWeight.replace(",", ".")) || 0);
    const extra: ExtraItem = {
      id: `extra-${Date.now()}`,
      name,
      qty,
      vol,
      weight,
      wCat: draftClass,
    };
    setSaved((current) => ({ ...current, extras: [...current.extras, extra] }));
    setDraftName("");
    setDraftQty("1");
    setDraftVol("");
    setDraftWeight("");
    setNotice("");
  }

  function setExtraQty(id: string, next: number) {
    setSaved((current) => ({
      ...current,
      extras:
        next <= 0
          ? current.extras.filter((item) => item.id !== id)
          : current.extras.map((item) => (item.id === id ? { ...item, qty: Math.min(99, next) } : item)),
    }));
  }

  async function calculateRoute() {
    setRouteError("");
    setNotice("");
    const from = saved.from.trim();
    const to = saved.to.trim();
    if (from.length < 3 || to.length < 3) {
      setRouteError("Vyplňte odkud a kam, aspoň město.");
      return;
    }
    setRouting(true);
    try {
      const [start, end] = await Promise.all([fromPoint ?? geocode(from), toPoint ?? geocode(to)]);
      if (!start || !end) {
        const missing = [!start && from, !end && to].filter(Boolean).map((address) => `„${address}“`);
        setRouteError(
          `Adresu ${missing.join(" a ")} se nepodařilo najít. Zkuste ji vybrat z nabídky, nebo kilometry zadejte ručně níže. Nejde-li ani to, pošlete poptávku i tak a dopravné vám dopočítáme podle adres.`,
        );
        return;
      }
      const next = await routeLegs(start, end);
      setFromPoint(start);
      setToPoint(end);
      setLegs(next);
      patch({ useManual: false });
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : "Trasu se nepodařilo spočítat.");
    } finally {
      setRouting(false);
    }
  }

  function addPhotos(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list);
    const images = files.filter((file) => file.type.startsWith("image/"));
    const oversized = images.filter((file) => file.size > MAX_PHOTO_BYTES);
    const ok = images.filter((file) => file.size <= MAX_PHOTO_BYTES);
    const room = MAX_PHOTOS - photos.length;
    const taken = ok.slice(0, Math.max(0, room)).map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }));
    if (taken.length) setPhotos((current) => [...current, ...taken]);
    const notes: string[] = [];
    if (images.length < files.length) notes.push("Jdou jen fotky.");
    if (oversized.length) notes.push("Fotka nad 12 MB se nevešla.");
    if (ok.length > room) notes.push(`Nejvíc ${MAX_PHOTOS} fotek.`);
    if (notes.length) setNotice(notes.join(" "));
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const hit = current.find((photo) => photo.id === id);
      if (hit) URL.revokeObjectURL(hit.url);
      return current.filter((photo) => photo.id !== id);
    });
  }

  function clearPhotos() {
    setPhotos((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.url));
      return [];
    });
  }

  function clearAll() {
    setSaved(EMPTY);
    clearPhotos();
    setLegs(null);
    setFromPoint(null);
    setToPoint(null);
    setRouteError("");
    setQuery("");
    setConfirmed(false);
    setSkipPhotos(false);
    setSent(false);
    setNotice("Kalkulačka je prázdná.");
  }

  async function send() {
    if (!quote.lines.length) return;
    if (!saved.name.trim() || !saved.phone.trim()) {
      setNotice("Doplňte jméno a telefon, ať se vám ozveme.");
      document.getElementById("poptavka-jmeno")?.focus();
      return;
    }
    if (saved.phone.replace(/\D/g, "").length < 9) {
      setNotice("Telefon vypadá krátký. Napište ho celý, ať vám můžeme zavolat.");
      document.getElementById("poptavka-telefon")?.focus();
      return;
    }
    if (!confirmed) {
      setNotice("Potvrďte, že soupis odpovídá tomu, co se bude stěhovat.");
      document.getElementById("poptavka-potvrzeni")?.focus();
      return;
    }
    if (!photos.length && !skipPhotos) {
      setSkipPhotos(true);
      setNotice("Bez fotek se vejde-nevejde posuzuje hůř. Přidejte je, nebo klepněte na Odeslat poptávku ještě jednou.");
      return;
    }
    const files = photos.map((photo) => photo.file);
    const { body } = buildMail(saved, legs, files.length, abroad);

    // Hlavní cesta: poptávka s fotkami jde na server a přijde e-mailem. Když server není
    // nastavený nebo spadne, použije se e-mail z prohlížeče jako dřív.
    setSending(true);
    const result = await submitInquiry({
      submissionId: submissionId.current,
      name: saved.name.trim(),
      phone: saved.phone.trim(),
      email: saved.email.trim(),
      body,
      gross: quote.gross,
      from: saved.from.trim(),
      to: saved.to.trim(),
      website: honeypot.current?.value ?? "",
      photos: files,
    });
    setSending(false);
    if (result.ok) {
      setSent(true);
      submissionId.current = crypto.randomUUID();
      setNotice("Poptávka je odeslaná. Ozveme se vám na uvedený telefon.");
      return;
    }
    if (!result.fallback) {
      setNotice(result.message);
      return;
    }
    if (canSharePhotos(files)) {
      try {
        await navigator.share({ files, title: "Poptávka stěhování z webu", text: body });
        setNotice("Poptávka i fotky šly do sdílení. Vyberte mail a odešlete.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const href = `mailto:${COMPANY.email}?subject=${encodeURIComponent("Poptávka stěhování z webu")}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    setNotice(
      files.length
        ? "Odeslání na server se nepovedlo, otevřel se e-mail bez fotek. Prohlížeč je k němu nepřipojí — přetáhněte je do zprávy."
        : "Otevírá se e-mail. Když se nic nestane, text poptávky zkopírujte.",
    );
  }

  async function copyQuote() {
    if (!quote.lines.length) return;
    const { body } = buildMail(saved, legs, photos.length, abroad);
    try {
      await navigator.clipboard.writeText(body);
      setNotice("Text poptávky je ve schránce.");
    } catch {
      setNotice("Schránka nejde použít. Označte text v e-mailu ručně.");
    }
  }

  const pieceCount =
    Object.values(saved.cart).reduce((sum, qty) => sum + qty, 0) +
    saved.extras.reduce((sum, item) => sum + item.qty, 0);

  const hasRoute = quote.distanceKm > 0 || saved.useManual;
  const distanceUnknown = isDistanceUnknown(quote, legs);
  const stepDone = [pieceCount > 0, hasRoute, Boolean(saved.name.trim() && saved.phone.trim())];
  const activeStep = stepDone.findIndex((done) => !done);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const steps = [
    { id: "kalk-krok-1", title: "Co stěhujete", hint: "Přidejte věci do nákladového listu." },
    { id: "kalk-krok-2", title: "Patra a trasa", hint: "Doplňte adresy, získáte orientační cenu." },
    { id: "kalk-krok-3", title: "Poptávka", hint: "Kontakt, termín a poznámka k přístupu." },
  ];

  return (
    <div className="w-full min-w-0">
      <div className="calculator-mobile-summary mb-4 lg:hidden" aria-live="polite">
        <div>
          <span className="block text-xs font-semibold tracking-widest text-paper/65 uppercase">Průběžný odhad</span>
          <strong className="mt-1 block font-display text-2xl text-paper">{formatKc(quote.gross)} s DPH</strong>
        </div>
        <a href="#souhrn" className="calculator-mobile-summary-link">Detail ceny</a>
      </div>

      <nav className="mb-6 grid gap-2 sm:grid-cols-3" aria-label="Postup kalkulace">
        {steps.map((step, index) => (
          <a
            key={step.id}
            href={`#${step.id}`}
            aria-current={index === activeStep ? "step" : undefined}
            className={cn(
              "calculator-step",
              index === activeStep && "calculator-step-active",
              stepDone[index] && "calculator-step-done",
            )}
          >
            <span className="calculator-step-number">{stepDone[index] ? <Check className="size-4" /> : index + 1}</span>
            <span>
              <strong>{step.title}</strong>
              <small>{step.hint}</small>
            </span>
          </a>
        ))}
      </nav>

      <div className="grid w-full min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 space-y-6">
          {/* 1 · Kusy */}
          <section id="kalk-krok-1" className="card card-static scroll-mt-28 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-display text-xl font-bold">1 · Co stěhujete</h3>
                <p className="text-sm text-muted">Klepnutím přidáte kus. Cenu uvidíte v součtu.</p>
              </div>
              <label className="relative block min-w-0 sm:w-64">
                <span className="sr-only">Hledat položku</span>
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Hledat, třeba klavír"
                  className={cn(FIELD, "pl-10")}
                />
              </label>
            </div>

            {!query.trim() && (
              <div className="flex gap-2 overflow-x-auto px-5 pt-4 pb-1" role="group" aria-label="Kategorie">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={cat === category.id}
                    onClick={() => setCat(category.id)}
                    className={cn(
                      "min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                      cat === category.id
                        ? "border-ink bg-ink text-paper"
                        : "border-line bg-paper text-muted hover:border-ink/30 hover:text-ink",
                    )}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}

            <ul className="grid gap-3 p-5 sm:grid-cols-2">
              {visible.length === 0 && (
                <li className="px-2 py-8 text-center text-sm text-muted sm:col-span-2">
                  V seznamu to není. Přidejte to dole jako další položku.
                </li>
              )}
              {visible.map((item) => {
                const qty = saved.cart[item.id] ?? 0;
                return (
                  <li key={item.id}>
                    <div
                      className={cn(
                        "flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                        qty > 0 ? "border-accent/60 bg-accent/5" : "border-line bg-paper hover:border-ink/25",
                      )}
                    >
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setQty(item.id, qty + 1)}>
                        <span className="block font-semibold">{item.name}</span>
                        <span className="block text-xs text-muted">
                          {formatVolume(item.vol)} · {item.weight} kg · {WEIGHT_LABEL[item.wCat]}
                          {item.bulky ? " · po schodech jako velmi těžké" : item.dense ? " · hustá bedna" : ""}
                        </span>
                      </button>
                      <Stepper
                        qty={qty}
                        name={item.name}
                        onChange={(next) => setQty(item.id, next)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <form
              className="border-t border-line bg-paper/60 p-5"
              onSubmit={(event) => {
                event.preventDefault();
                addExtra();
              }}
            >
              <h4 className="font-display text-lg font-bold">Další položka</h4>
              <p className="text-sm text-muted">
                Co v seznamu není. Objem se počítá do kapacity vozu, cenu kusu domluvíme.
              </p>
              {saved.extras.length > 0 && (
                <ul className="mt-3 grid gap-2">
                  {saved.extras.map((item) => (
                    <li
                      key={item.id}
                      className="flex min-h-16 items-center gap-3 rounded-2xl border border-accent/60 bg-accent/5 px-4 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block font-semibold">{item.name}</span>
                        <span className="block text-xs text-muted">
                          {formatVolume(item.vol)} · {item.weight} kg · {WEIGHT_LABEL[item.wCat]}
                        </span>
                      </div>
                      <Stepper qty={item.qty} name={item.name} onChange={(next) => setExtraQty(item.id, next)} />
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className={cn(LABEL, "sm:col-span-2")}>
                  Název
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder="Třeba piano křídlo, trezor, akvárium"
                    className={cn(FIELD, "mt-1")}
                  />
                </label>
                <label className={LABEL}>
                  Počet
                  <input
                    inputMode="numeric"
                    value={draftQty}
                    onChange={(event) => setDraftQty(event.target.value)}
                    className={cn(FIELD, "mt-1")}
                  />
                </label>
                <label className={LABEL}>
                  Jak těžké
                  <select
                    value={draftClass}
                    onChange={(event) => setDraftClass(event.target.value as WeightClass)}
                    className={cn(FIELD, "mt-1")}
                  >
                    {(Object.keys(WEIGHT_LABEL) as WeightClass[]).map((key) => (
                      <option key={key} value={key}>
                        {WEIGHT_LABEL[key]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={LABEL}>
                  Objem m³
                  <input
                    inputMode="decimal"
                    value={draftVol}
                    onChange={(event) => setDraftVol(event.target.value)}
                    placeholder="např. 1,5"
                    className={cn(FIELD, "mt-1")}
                  />
                </label>
                <label className={LABEL}>
                  Hmotnost kg
                  <input
                    inputMode="decimal"
                    value={draftWeight}
                    onChange={(event) => setDraftWeight(event.target.value)}
                    placeholder="např. 80"
                    className={cn(FIELD, "mt-1")}
                  />
                </label>
              </div>
              <Button type="submit" variant="ink" className="mt-4">
                <Plus className="size-4" /> Přidat položku
              </Button>
            </form>

            <div className="border-t border-line bg-accent/5 p-5 text-sm">
              <p className="font-display text-base font-bold">Než půjdete dál, projděte byt ještě jednou</p>
              <p className="mt-1 text-muted">
                Sklep, půda, garáž, balkon, zahrada, kola, koberce, lustry a závěsy, květiny, věci za skříněmi.
                Vůz plánujeme podle vašeho soupisu, proto čím je přesnější, tím líp. Fotky místností a věcí přiložte
                v poptávce, podle nich nejlíp posoudíme, co se do vozu vejde.
              </p>
            </div>
          </section>

          {/* 2 · Patra a trasa */}
          <section id="kalk-krok-2" className="card card-static scroll-mt-28 p-5">
            <h3 className="font-display text-xl font-bold">2 · Patra a trasa</h3>
            <p className="text-sm text-muted">Patra a výtah ovlivní cenu za těžké kusy, trasa dopravné.</p>

            <fieldset className="mt-4 grid gap-4 sm:grid-cols-2">
              <legend className="sr-only">Patra, výtah a donáška</legend>
              <FloorFields
                title="Odkud"
                floors={saved.floorsFrom}
                lift={saved.liftFrom}
                onFloors={(floorsFrom) => patch({ floorsFrom })}
                carry={saved.carryFrom}
                onCarry={(carryFrom) => patch({ carryFrom })}
                onLift={(liftFrom) => patch({ liftFrom })}
              />
              <FloorFields
                title="Kam"
                floors={saved.floorsTo}
                lift={saved.liftTo}
                onFloors={(floorsTo) => patch({ floorsTo })}
                carry={saved.carryTo}
                onCarry={(carryTo) => patch({ carryTo })}
                onLift={(liftTo) => patch({ liftTo })}
              />
            </fieldset>

            <div className="mt-6 border-t border-line pt-5">
              <h4 className="flex items-center gap-2 font-display text-lg font-bold">
                <Route className="size-4 text-accent" /> Trasa
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <AddressInput
                  tone="light"
                  label="Odkud"
                  value={saved.from}
                  placeholder="Ulice, město"
                  onChange={(from) => {
                    patch({ from });
                    setFromPoint(null);
                  }}
                  onPick={(from, point) => {
                    patch({ from });
                    setFromPoint(point);
                  }}
                />
                <AddressInput
                  tone="light"
                  label="Kam"
                  value={saved.to}
                  placeholder="Ulice, město"
                  onChange={(to) => {
                    patch({ to });
                    setToPoint(null);
                  }}
                  onPick={(to, point) => {
                    patch({ to });
                    setToPoint(point);
                  }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={saved.includeApproach}
                    onChange={(event) => patch({ includeApproach: event.target.checked })}
                  />
                  Nájezd ze sídla
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={saved.includeReturn}
                    onChange={(event) => patch({ includeReturn: event.target.checked })}
                  />
                  Návrat
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button type="button" variant="ink" onClick={calculateRoute} disabled={routing}>
                  {routing ? <Loader2 className="size-4 animate-spin" /> : <Route className="size-4" />}
                  Spočítat kilometry
                </Button>
                {legs && !saved.useManual && (
                  <p className="text-sm text-muted">
                    Nájezd {formatKm(legs.approachKm)}, stěhování {formatKm(legs.moveKm)}, návrat {formatKm(legs.returnKm)}.
                    {fromPoint?.label && toPoint?.label && (
                      <>
                        {" "}
                        Adresy jsme našli takto: <strong className="font-medium text-ink">{fromPoint.label}</strong> →{" "}
                        <strong className="font-medium text-ink">{toPoint.label}</strong>. Nesedí? Vyberte adresu z nabídky.
                      </>
                    )}
                    {saved.from && saved.to && (
                      <>
                        {" "}
                        <a className="underline hover:text-accent" href={mapsUrl(saved.from, saved.to)} target="_blank" rel="noreferrer">
                          Mapa
                        </a>
                      </>
                    )}
                  </p>
                )}
              </div>
              {routeError && (
                <p role="alert" className="mt-2 text-sm text-accent-deep">
                  {routeError}
                </p>
              )}
              {abroad.length > 0 && (
                <p className="mt-2 text-sm text-muted">
                  Adresa mimo Česko ({abroad.join(", ")}). Kilometry spočítáme podle mapy, dopravné za zahraniční jízdu
                  vám potvrdíme po telefonu.
                </p>
              )}
              <label className={cn(LABEL, "mt-4 block sm:max-w-xs")}>
                Kilometry ručně
                <input
                  inputMode="decimal"
                  value={saved.manual}
                  onChange={(event) => patch({ manual: event.target.value, useManual: event.target.value.trim() !== "" })}
                  placeholder="např. 85"
                  className={cn(FIELD, "mt-1")}
                />
              </label>
              <p className="mt-1 text-xs text-muted">Ruční km přepíšou mapu. Sazba je {PRICE_PER_KM} Kč/km bez DPH.</p>
            </div>
          </section>

          {/* 3 · Poptávka */}
          <section id="kalk-krok-3" className="card card-static scroll-mt-28 p-5">
            <h3 className="font-display text-xl font-bold">3 · Poptávka</h3>
            <p className="text-sm text-muted">Pošleme vám to jako nezávaznou poptávku. Cenu potvrdíme po telefonu.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className={LABEL}>
                Jméno a příjmení
                <input
                  id="poptavka-jmeno"
                  autoComplete="name"
                  value={saved.name}
                  onChange={(event) => patch({ name: event.target.value })}
                  className={cn(FIELD, "mt-1")}
                />
              </label>
              <label className={LABEL}>
                Telefon
                <input
                  id="poptavka-telefon"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={saved.phone}
                  onChange={(event) => patch({ phone: event.target.value })}
                  placeholder="+420 …"
                  className={cn(FIELD, "mt-1")}
                />
              </label>
              <label className={LABEL}>
                E-mail <span className="text-muted">(nepovinné)</span>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={saved.email}
                  onChange={(event) => patch({ email: event.target.value })}
                  className={cn(FIELD, "mt-1")}
                />
              </label>
              <label className={LABEL}>
                Termín
                <input
                  type="date"
                  min={today}
                  value={saved.date}
                  onChange={(event) => patch({ date: event.target.value })}
                  className={cn(FIELD, "mt-1")}
                />
              </label>
              <label className={cn(LABEL, "sm:col-span-2")}>
                Přístup a co kalkulačka nevidí
                <textarea
                  value={saved.note}
                  onChange={(event) => patch({ note: event.target.value })}
                  placeholder="Úzké schody na půdu, sklep, točité schodiště, parkování daleko, zatáčka na podestě."
                  rows={4}
                  className={cn(FIELD, "mt-1 py-2")}
                />
              </label>
              <div className="sm:col-span-2">
                <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink/25 px-3 text-sm text-muted transition-colors hover:border-accent hover:text-accent">
                  <ImagePlus className="size-4" />
                  Přidat fotky místností a přístupu (doporučujeme)
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      addPhotos(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
                <p className="mt-1 text-xs text-muted">
                  Podle fotek nejlíp posoudíme, co se vejde do vozu a jak se k věcem dostaneme. Nejvíc {MAX_PHOTOS}. Z počítače je do mailu přiložte ručně, telefon je umí poslat rovnou.
                </p>
                {photos.length > 0 && (
                  <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {photos.map((photo) => (
                      <li key={photo.id} className="relative">
                        <img src={photo.url} alt="" className="h-16 w-full rounded-lg object-cover" />
                        <button
                          type="button"
                          aria-label={`Odebrat fotku ${photo.file.name}`}
                          onClick={() => removePhoto(photo.id)}
                          className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-ink/80 text-paper"
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saved.disassembly}
                  onChange={(event) => patch({ disassembly: event.target.checked })}
                />
                Chci demontáž nábytku
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={saved.packing} onChange={(event) => patch({ packing: event.target.checked })} />
                Chci zabalit křehké
              </label>
            </div>
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Web (nevyplňujte)
                <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <label className="mt-5 flex items-start gap-3 rounded-xl border border-line bg-paper p-3 text-sm">
              <input
                id="poptavka-potvrzeni"
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                Soupis odpovídá tomu, co se bude stěhovat. Rozumím, že kalkulačka je orientační a věci navíc mohou
                změnit cenu.
              </span>
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={send} disabled={!quote.lines.length || sending}>
                {sending ? <Loader2 className="size-4 animate-spin" /> : null}
                {sending ? "Odesílám…" : sent ? "Odeslat znovu" : "Odeslat poptávku"}
              </Button>
              <Button type="button" variant="line" onClick={copyQuote} disabled={!quote.lines.length}>
                <Copy className="size-4" /> Kopírovat
              </Button>
              <button
                type="button"
                onClick={clearAll}
                className="ml-auto flex min-h-11 items-center gap-2 text-sm text-muted transition-colors hover:text-accent"
              >
                <Trash2 className="size-4" /> Vymazat
              </button>
            </div>
            {notice && (
              <p role="status" className="mt-3 flex items-start gap-2 text-sm text-ink">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" /> {notice}
              </p>
            )}
          </section>
        </div>

        {/* Souhrn */}
        <aside
          id="souhrn"
          className="scroll-mt-28 overflow-hidden rounded-card bg-ink text-paper shadow-lift lg:sticky lg:top-24"
        >
          <div className="p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-xl font-bold">Souhrn</h3>
              <span className="text-sm text-paper/70">{pieceCount} ks</span>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-end justify-between gap-3">
                <p className="font-display text-4xl leading-none font-bold">{formatVolume(quote.volume)}</p>
                <p className="text-xs tracking-widest text-paper/60 uppercase">
                  z {MAX_VOLUME_M3.toLocaleString("cs-CZ")} m³
                </p>
              </div>
              <div
                className="relative h-3 overflow-hidden rounded-full bg-ink-soft"
                role="meter"
                aria-label="Zaplnění aktuální jízdy"
                aria-valuemin={0}
                aria-valuemax={MAX_VOLUME_M3}
                aria-valuenow={Math.round(rideFill(quote.volume) * MAX_VOLUME_M3)}
              >
                <div className="load-fill h-full rounded-full bg-accent" style={{ width: `${rideFill(quote.volume) * 100}%` }} />
                <span
                  className="absolute inset-y-0 z-10 w-0.5 bg-sky"
                  style={{ left: `${(FLAT_31_M3 / MAX_VOLUME_M3) * 100}%` }}
                  title="Byt 3+1"
                />
              </div>
              <p className="mt-2 text-sm text-paper/80">{loadNote(quote.volume, quote.trips)}</p>
              {quote.trips > 0 && rideFill(quote.volume) >= 0.85 && (
                <p className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-paper">
                  Vůz se plní. Kalkulačka je jen orientační, jak se věci do vozu opravdu vejdou, posoudíme podle vašeho
                  soupisu a fotek.
                </p>
              )}
              {quote.negotiate && (
                <p className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-paper">
                  Hodně beden s knihami po schodech nebo přes dvůr je práce navíc. Cenu s vámi domluvíme zvlášť,
                  tohle je jen základ.
                </p>
              )}
              {abroad.length > 0 && (
                <p className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-paper">
                  Jízda mimo Česko ({abroad.join(", ")}). Dopravné vám potvrdíme po telefonu, tohle je jen orientační
                  základ.
                </p>
              )}
              <p className="text-sm text-paper/70">
                Hmotnost {quote.weight.toLocaleString("cs-CZ")} kg
                {quote.overweight
                  ? ` — nad orientačních ${PAYLOAD_KG.toLocaleString("cs-CZ")} kg na jízdu. Cenu potvrdíme, může být potřeba další jízda.`
                  : ""}
              </p>
            </div>

            <ul className="mt-4 max-h-36 space-y-1 overflow-y-auto text-sm">
              {quote.lines.length === 0 && <li className="text-paper/60">Přidejte první kus vlevo.</li>}
              {quote.lines.map((line) => (
                <li key={line.id} className="border-b border-paper/10 py-1 text-paper/85">
                  {line.name} <span className="text-sky">×{line.qty}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1 border-t border-paper/15 pt-4 text-sm">
              <Row label={quote.trips > 1 ? `Základní jízda ×${quote.trips}` : "Základní jízda"} value={quote.tripFee} />
              <Row label="Nakládka a složení" value={quote.items} />
              <Row label="Patra" value={quote.floors} />
              <Row label="Donáška od vozu" value={quote.carry} />
              <Row label="Odpojení pračky a myčky" value={quote.handling} />
              <Row label={`Dopravné ${formatKm(quote.distanceKm)}`} value={quote.transport} />
              {distanceUnknown && (
                <div className="flex justify-between gap-3">
                  <dt className="text-paper/75">Dopravné</dt>
                  <dd className="text-paper/75">dopočítáme</dd>
                </div>
              )}
              <div className="calculator-total flex items-end justify-between gap-3 border-t border-accent pt-3">
                <dt className="font-display text-lg">Bez DPH</dt>
                <dd className="font-display text-2xl font-bold text-[#ff5a5f]">{formatKc(quote.net)}</dd>
              </div>
              <div className="flex justify-between text-paper/70">
                <dt>DPH 21 %</dt>
                <dd>{formatKc(quote.vat)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>S DPH</dt>
                <dd className="font-semibold">{formatKc(quote.gross)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-paper/65">{ESTIMATE_CAVEAT}</p>

            <Button
              type="button"
              className="mt-4 w-full"
              disabled={!quote.lines.length}
              onClick={() => {
                if (stepDone[2]) void send();
                else document.getElementById("kalk-krok-3")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {stepDone[2] ? "Odeslat poptávku" : "Pokračovat k poptávce"}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

const FIELD =
  "min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink transition-colors focus:border-accent focus:bg-white";
const LABEL = "block text-sm font-medium text-ink";

function Stepper({ qty, name, onChange }: { qty: number; name: string; onChange: (next: number) => void }) {
  if (qty <= 0) {
    return (
      <button
        type="button"
        aria-label={`Přidat ${name}`}
        onClick={() => onChange(1)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-paper transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="size-4" />
      </button>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-line">
      <button
        type="button"
        aria-label={`Odebrat ${name}`}
        onClick={() => onChange(qty - 1)}
        className="flex size-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-line"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center font-display text-lg font-bold" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        aria-label={`Přidat ${name}`}
        onClick={() => onChange(qty + 1)}
        className="flex size-9 items-center justify-center rounded-full bg-accent text-paper transition-colors hover:bg-accent-deep"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function FloorFields({
  title,
  floors,
  lift,
  onFloors,
  onLift,
  carry,
  onCarry,
}: {
  title: string;
  floors: number;
  lift: LiftKind;
  onFloors: (value: number) => void;
  onLift: (value: LiftKind) => void;
  carry: number;
  onCarry: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-widest text-accent uppercase">{title}</p>
      <label className={LABEL}>
        Pater nad přízemím
        <NumberField value={floors} max={30} onChange={onFloors} className={cn(FIELD, "mt-1")} />
      </label>
      <label className={LABEL}>
        Výtah
        <select value={lift} onChange={(event) => onLift(event.target.value as LiftKind)} className={cn(FIELD, "mt-1")}>
          {(Object.keys(LIFT_LABEL) as LiftKind[]).map((key) => (
            <option key={key} value={key}>
              {LIFT_LABEL[key]}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL}>
        Donáška od vozu (m)
        <NumberField value={carry} max={CARRY_MAX_M} step={10} onChange={onCarry} className={cn(FIELD, "mt-1")} />
        <span className="mt-1 block text-xs font-normal text-muted">
          Po rovině z místa, kde zastaví vůz, ke dveřím. I přízemí může být daleko: zahrada, dvůr, pěší zóna. {CARRY_M_PER_FLOOR} m se počítá jako jedno patro.
        </span>
      </label>
    </div>
  );
}

/**
 * Celé nezáporné číslo, které jde při psaní úplně smazat. Řízený `type="number"` s `|| 0`
 * by prázdné pole hned vrátil na "0" a nešlo by přepsat. Prázdné pole se počítá jako 0,
 * po opuštění se zobrazí normalizovaná hodnota.
 */
function NumberField({
  value,
  max,
  step,
  onChange,
  className,
}: {
  value: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    // Změna zvenku (vymazání kalkulačky, načtený koncept), ne vlastní psaní.
    setText((current) => ((Number(current) || 0) === value ? current : String(value)));
  }, [value]);

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      step={step}
      placeholder="0"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChange(Math.max(0, Math.min(max, Math.floor(Number(event.target.value)) || 0)));
      }}
      onBlur={() => setText(String(value))}
      className={className}
    />
  );
}

function Row({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-paper/75">{label}</dt>
      <dd>{formatKc(value)}</dd>
    </div>
  );
}
