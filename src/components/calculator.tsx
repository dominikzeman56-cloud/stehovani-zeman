import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, Minus, Plus, Route, Search, Trash2 } from "lucide-react";
import { CATEGORIES, COMPANY, FLAT_31_M3, ITEMS, LIFT_LABEL, MAX_VOLUME_M3, PAYLOAD_KG, PRICE_PER_KM, TRIP_PRICE, WEIGHT_LABEL, fold, type LiftKind, type WeightClass } from "@/data/catalog";
import { computeQuote, formatKc, formatKm, formatVolume, readManualKm, type Cart, type ExtraItem, type RouteLegs } from "@/lib/quote";
import { VanLoad } from "@/components/van-load";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "zeman-kalkulacka-v1";

type Saved = {
  cart: Cart;
  floorsFrom: number;
  floorsTo: number;
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

type Point = { lat: number; lon: number };

async function geocode(query: string): Promise<Point | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1`;
  const response = await fetch(url, { headers: { "Accept-Language": "cs" } });
  if (!response.ok) throw new Error("Vyhledání adresy selhalo.");
  const data = (await response.json()) as { lat?: string; lon?: string }[];
  const hit = data[0];
  if (!hit?.lat || !hit.lon) return null;
  return { lat: Number(hit.lat), lon: Number(hit.lon) };
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
  if (volume <= 0.001) return "Prázdná dodávka. Do jedné jízdy se vejde i byt 3+1.";
  if (trips <= 1 && volume < FLAT_31_M3) return "Ještě je místo. Byt 3+1 se vejde najednou.";
  if (trips <= 1) return "Jedna jízda — i byt 3+1 se sem vejde.";
  return `To už je ${tripWord(trips)}. Každá další jízda je ${formatKc(TRIP_PRICE)}.`;
}

function buildMail(saved: Saved, legs: RouteLegs | null) {
  const quote = computeQuote({
    cart: saved.cart,
    floorsFrom: saved.floorsFrom,
    floorsTo: saved.floorsTo,
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
  const body = [
    "Dobrý den,",
    "",
    "posílám orientační poptávku ze webu:",
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
    `Odkud: ${saved.from || "—"} · ${LIFT_LABEL[saved.liftFrom]}, pater ${saved.floorsFrom}`,
    `Kam: ${saved.to || "—"} · ${LIFT_LABEL[saved.liftTo]}, pater ${saved.floorsTo}`,
    `Vzdálenost k fakturaci: ${formatKm(quote.distanceKm)}${quote.manual ? " (zadáno ručně)" : ""}`,
    `Demontáž nábytku: ${saved.disassembly ? "ano" : "ne"}`,
    `Zabalit křehké: ${saved.packing ? "ano" : "ne"}`,
    saved.note ? `Poznámka: ${saved.note}` : "",
    "",
    "ODHAD BEZ DPH",
    `Základní jízda: ${formatKc(quote.tripFee)}`,
    `Položky: ${formatKc(quote.items)}`,
    `Patra: ${formatKc(quote.floors)}`,
    `Odpojení pračky/myčky: ${formatKc(quote.handling)}`,
    `Dopravné: ${formatKc(quote.transport)}`,
    `Celkem bez DPH: ${formatKc(quote.net)}`,
    `DPH 21 %: ${formatKc(quote.vat)}`,
    `Celkem s DPH: ${formatKc(quote.gross)}`,
    "",
    "Jde o orientační výpočet. Finální cenu prosím potvrďte.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { quote, body };
}

export function Calculator() {
  const [saved, setSaved] = useState<Saved>(EMPTY);
  const [ready, setReady] = useState(false);
  const [cat, setCat] = useState<string>(CATEGORIES[0].id);
  const [query, setQuery] = useState("");
  const [legs, setLegs] = useState<RouteLegs | null>(null);
  const [routeError, setRouteError] = useState("");
  const [routing, setRouting] = useState(false);
  const [notice, setNotice] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftQty, setDraftQty] = useState("1");
  const [draftVol, setDraftVol] = useState("");
  const [draftWeight, setDraftWeight] = useState("");
  const [draftClass, setDraftClass] = useState<WeightClass>("medium");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Saved>;
        setSaved({
          ...EMPTY,
          ...parsed,
          cart: parsed.cart ?? {},
          extras: Array.isArray(parsed.extras) ? parsed.extras : [],
        });
      }
    } catch {
      /* starý draft nevadí */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }, [saved, ready]);

  const quote = useMemo(
    () =>
      computeQuote({
        cart: saved.cart,
        floorsFrom: saved.floorsFrom,
        floorsTo: saved.floorsTo,
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
      const start = await geocode(`${from}, Česko`);
      const end = await geocode(`${to}, Česko`);
      if (!start || !end) {
        setRouteError("Adresu se nepodařilo najít. Kilometry můžete zadat ručně.");
        return;
      }
      const next = await routeLegs(start, end);
      setLegs(next);
      patch({ useManual: false });
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : "Trasu se nepodařilo spočítat.");
    } finally {
      setRouting(false);
    }
  }

  function clearAll() {
    setSaved(EMPTY);
    setLegs(null);
    setRouteError("");
    setQuery("");
    setNotice("Kalkulačka je prázdná.");
    localStorage.removeItem(STORAGE_KEY);
  }

  async function send() {
    if (!quote.lines.length) return;
    if (!saved.name.trim() || !saved.phone.trim()) {
      setNotice("Doplňte jméno a telefon, ať se vám ozveme.");
      document.getElementById("poptavka-jmeno")?.focus();
      return;
    }
    const { body } = buildMail(saved, legs);
    const href = `mailto:${COMPANY.email}?subject=${encodeURIComponent("Poptávka stěhování z webu")}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    setNotice("Otevírá se e-mail. Když se nic nestane, text poptávky zkopírujte.");
  }

  async function copyQuote() {
    if (!quote.lines.length) return;
    const { body } = buildMail(saved, legs);
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

  return (
    <div className="grid w-full min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0 overflow-hidden border border-line bg-sheet">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-sm uppercase tracking-widest text-accent">Kusy</p>
            <p className="text-sm text-muted">Klepnutím přidáte kus. Cenu uvidíte až v součtu.</p>
          </div>
          <label className="relative block min-w-0 sm:w-64">
            <span className="sr-only">Hledat položku</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Hledat, třeba klavír"
              className="min-h-11 w-full rounded-md border border-line bg-paper pr-3 pl-10 text-ink"
            />
          </label>
        </div>

        {!query.trim() && (
          <div className="flex gap-1 overflow-x-auto px-3 pt-3" role="tablist" aria-label="Kategorie">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={cat === category.id}
                onClick={() => setCat(category.id)}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-2 font-display text-sm uppercase tracking-wide",
                  cat === category.id ? "border-accent text-accent" : "border-transparent text-muted",
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        <ul className="grid gap-2 p-3 sm:grid-cols-2">
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
                    "flex min-h-20 items-center gap-3 rounded-lg border px-3 py-2",
                    qty > 0 ? "border-accent bg-accent/5" : "border-line bg-paper",
                  )}
                >
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setQty(item.id, qty + 1)}>
                    <span className="block font-semibold">{item.name}</span>
                    <span className="block text-xs text-muted">
                      {formatVolume(item.vol)} · {item.weight} kg · {WEIGHT_LABEL[item.wCat]}
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Odebrat ${item.name}`}
                      onClick={() => setQty(item.id, qty - 1)}
                      className="flex size-11 items-center justify-center rounded-md bg-line text-ink"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-6 text-center font-display text-lg">{qty}</span>
                    <button
                      type="button"
                      aria-label={`Přidat ${item.name}`}
                      onClick={() => setQty(item.id, qty + 1)}
                      className="flex size-11 items-center justify-center rounded-md bg-accent text-paper"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <form
          className="border-t border-line p-3"
          onSubmit={(event) => {
            event.preventDefault();
            addExtra();
          }}
        >
          <p className="font-display text-sm uppercase tracking-widest text-accent">Další položka</p>
          <p className="text-sm text-muted">
            Co v seznamu není. Objem se počítá do kapacity vozu, cenu kusu domluvíme.
          </p>
          {saved.extras.length > 0 && (
            <ul className="mt-3 grid gap-2">
              {saved.extras.map((item) => (
                <li key={item.id} className="flex min-h-16 items-center gap-3 border border-accent bg-accent/5 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <span className="block font-semibold">{item.name}</span>
                    <span className="block text-xs text-muted">
                      {formatVolume(item.vol)} · {item.weight} kg · {WEIGHT_LABEL[item.wCat]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Odebrat ${item.name}`}
                      onClick={() => setExtraQty(item.id, item.qty - 1)}
                      className="flex size-11 items-center justify-center rounded-md bg-line text-ink"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-6 text-center font-display text-lg">{item.qty}</span>
                    <button
                      type="button"
                      aria-label={`Přidat ${item.name}`}
                      onClick={() => setExtraQty(item.id, item.qty + 1)}
                      className="flex size-11 items-center justify-center rounded-md bg-accent text-paper"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              Název
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Třeba piano křídlo, trezor, akvárium"
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-ink"
              />
            </label>
            <label className="block text-sm">
              Počet
              <input
                inputMode="numeric"
                value={draftQty}
                onChange={(event) => setDraftQty(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-ink"
              />
            </label>
            <label className="block text-sm">
              Jak těžké
              <select
                value={draftClass}
                onChange={(event) => setDraftClass(event.target.value as WeightClass)}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-2 text-ink"
              >
                {(Object.keys(WEIGHT_LABEL) as WeightClass[]).map((key) => (
                  <option key={key} value={key}>
                    {WEIGHT_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Objem m³
              <input
                inputMode="decimal"
                value={draftVol}
                onChange={(event) => setDraftVol(event.target.value)}
                placeholder="např. 1,5"
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-ink"
              />
            </label>
            <label className="block text-sm">
              Hmotnost kg
              <input
                inputMode="decimal"
                value={draftWeight}
                onChange={(event) => setDraftWeight(event.target.value)}
                placeholder="např. 80"
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-ink"
              />
            </label>
          </div>
          <Button type="submit" className="mt-3">
            <Plus className="size-4" /> Přidat položku
          </Button>
        </form>
      </div>

      <aside id="souhrn" className="scroll-mt-24 overflow-hidden bg-ink text-paper lg:sticky lg:top-20">
        <VanLoad volume={quote.volume} />
        <div className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-xl uppercase tracking-wide">Nákladový list</h3>
          <span className="text-sm text-paper/70">{pieceCount} ks</span>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs uppercase tracking-widest text-paper/70">
            <span>{formatVolume(quote.volume)}</span>
            <span>{MAX_VOLUME_M3.toLocaleString("cs-CZ")} m³</span>
          </div>
          <div
            className="h-1.5 overflow-hidden bg-ink-soft"
            role="meter"
            aria-label="Zaplnění aktuální jízdy"
            aria-valuemin={0}
            aria-valuemax={MAX_VOLUME_M3}
            aria-valuenow={Math.round(quote.volume <= 0 ? 0 : quote.volume % MAX_VOLUME_M3 < 0.001 && quote.volume > 0 ? MAX_VOLUME_M3 : quote.volume % MAX_VOLUME_M3)}
          >
            <div
              className="h-full bg-accent transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.min(100, ((quote.volume <= 0 ? 0 : quote.volume % MAX_VOLUME_M3 < 0.001 && quote.volume > 0 ? MAX_VOLUME_M3 : quote.volume % MAX_VOLUME_M3) / MAX_VOLUME_M3) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-sm text-paper/80">{loadNote(quote.volume, quote.trips)}</p>
          <p className="text-sm text-paper/70">
            Hmotnost {quote.weight.toLocaleString("cs-CZ")} kg
            {quote.overweight
              ? ` — nad orientačních ${PAYLOAD_KG.toLocaleString("cs-CZ")} kg na jízdu. Cenu potvrdíme, může být potřeba další jízda.`
              : ""}
          </p>
        </div>

        <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto text-sm">
          {quote.lines.length === 0 && <li className="text-paper/60">Přidejte první kus vlevo.</li>}
          {quote.lines.map((line) => (
            <li key={line.id} className="border-b border-paper/10 py-1 text-paper/85">
              {line.name} <span className="text-kraft">×{line.qty}</span>
            </li>
          ))}
        </ul>

        <fieldset className="mt-4 grid grid-cols-2 gap-3">
          <legend className="sr-only">Patra a výtah</legend>
          <FloorFields
            title="Odkud"
            floors={saved.floorsFrom}
            lift={saved.liftFrom}
            onFloors={(floorsFrom) => patch({ floorsFrom })}
            onLift={(liftFrom) => patch({ liftFrom })}
          />
          <FloorFields
            title="Kam"
            floors={saved.floorsTo}
            lift={saved.liftTo}
            onFloors={(floorsTo) => patch({ floorsTo })}
            onLift={(liftTo) => patch({ liftTo })}
          />
        </fieldset>

        <div className="mt-4 border-t border-paper/15 pt-4">
          <h4 className="flex items-center gap-2 font-display uppercase tracking-wide">
            <Route className="size-4 text-accent" /> Trasa
          </h4>
          <label className="mt-3 block text-xs uppercase tracking-widest text-paper/60">
            Odkud
            <input
              value={saved.from}
              onChange={(event) => patch({ from: event.target.value })}
              placeholder="Ulice, město"
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink normal-case"
            />
          </label>
          <label className="mt-2 block text-xs uppercase tracking-widest text-paper/60">
            Kam
            <input
              value={saved.to}
              onChange={(event) => patch({ to: event.target.value })}
              placeholder="Ulice, město"
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink normal-case"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
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
          <Button type="button" variant="line" className="mt-3 w-full" onClick={calculateRoute} disabled={routing}>
            {routing ? <Loader2 className="size-4 animate-spin" /> : <Route className="size-4" />}
            Spočítat kilometry
          </Button>
          {routeError && <p className="mt-2 text-sm text-accent">{routeError}</p>}
          {legs && !saved.useManual && (
            <p className="mt-2 text-sm text-paper/80">
              Nájezd {formatKm(legs.approachKm)}, stěhování {formatKm(legs.moveKm)}, návrat {formatKm(legs.returnKm)}.
              {saved.from && saved.to && (
                <>
                  {" "}
                  <a className="underline" href={mapsUrl(saved.from, saved.to)} target="_blank" rel="noreferrer">
                    Mapa
                  </a>
                </>
              )}
            </p>
          )}
          <label className="mt-3 block text-xs uppercase tracking-widest text-paper/60">
            Kilometry ručně
            <input
              inputMode="decimal"
              value={saved.manual}
              onChange={(event) => patch({ manual: event.target.value, useManual: event.target.value.trim() !== "" })}
              placeholder="např. 85"
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink normal-case"
            />
          </label>
          <p className="mt-1 text-xs text-paper/50">Ruční km přepíšou mapu. Sazba je {PRICE_PER_KM} Kč/km bez DPH.</p>
        </div>

        <dl className="mt-4 space-y-1 border-t border-paper/15 pt-4 text-sm">
          <Row label={quote.trips > 1 ? `Základní jízda ×${quote.trips}` : "Základní jízda"} value={quote.tripFee} />
          <Row label="Nakládka a složení" value={quote.items} />
          <Row label="Patra" value={quote.floors} />
          <Row label="Odpojení pračky a myčky" value={quote.handling} />
          <Row label={`Dopravné ${formatKm(quote.distanceKm)}`} value={quote.transport} />
          <div className="flex items-end justify-between gap-3 border-t border-accent pt-3">
            <dt className="font-display text-lg uppercase">Bez DPH</dt>
            <dd className="font-display text-2xl text-accent">{formatKc(quote.net)}</dd>
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

        <div id="poptavka" className="mt-4 scroll-mt-24 border-t border-paper/15 pt-4">
          <h4 className="font-display uppercase tracking-wide">Poptávka</h4>
          <div className="mt-3 grid gap-2">
            <input
              id="poptavka-jmeno"
              value={saved.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="Jméno a příjmení"
              className="min-h-11 rounded-md border border-line bg-paper px-3 text-sm text-ink"
            />
            <input
              value={saved.phone}
              onChange={(event) => patch({ phone: event.target.value })}
              placeholder="Telefon"
              inputMode="tel"
              className="min-h-11 rounded-md border border-line bg-paper px-3 text-sm text-ink"
            />
            <input
              value={saved.email}
              onChange={(event) => patch({ email: event.target.value })}
              placeholder="E-mail (nepovinné)"
              inputMode="email"
              className="min-h-11 rounded-md border border-line bg-paper px-3 text-sm text-ink"
            />
            <input
              type="date"
              value={saved.date}
              onChange={(event) => patch({ date: event.target.value })}
              aria-label="Termín"
              className="min-h-11 rounded-md border border-line bg-paper px-3 text-sm text-ink"
            />
            <textarea
              value={saved.note}
              onChange={(event) => patch({ note: event.target.value })}
              placeholder="Poznámka: přístup, parkování, co v seznamu není"
              rows={3}
              className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink"
            />
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
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button type="button" onClick={send} disabled={!quote.lines.length}>
              Odeslat poptávku
            </Button>
            <Button type="button" variant="line" onClick={copyQuote} disabled={!quote.lines.length}>
              <Copy className="size-4" /> Kopírovat
            </Button>
          </div>
          <button
            type="button"
            onClick={clearAll}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 text-sm text-paper/60"
          >
            <Trash2 className="size-4" /> Vymazat
          </button>
          {notice && (
            <p className="mt-2 flex items-start gap-2 text-sm text-kraft">
              <Check className="mt-0.5 size-4 shrink-0" /> {notice}
            </p>
          )}
        </div>
        </div>
      </aside>
    </div>
  );
}

function FloorFields({
  title,
  floors,
  lift,
  onFloors,
  onLift,
}: {
  title: string;
  floors: number;
  lift: LiftKind;
  onFloors: (value: number) => void;
  onLift: (value: LiftKind) => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-paper/60">{title}</p>
      <label className="mt-1 block text-xs text-paper/50">
        Pater nad přízemím
        <input
          type="number"
          min={0}
          max={30}
          value={floors}
          onChange={(event) => onFloors(Math.max(0, Math.min(30, Number(event.target.value) || 0)))}
          className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink"
        />
      </label>
      <label className="mt-2 block text-xs text-paper/50">
        Výtah
        <select
          value={lift}
          onChange={(event) => onLift(event.target.value as LiftKind)}
          className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-2 text-sm text-ink"
        >
          {(Object.keys(LIFT_LABEL) as LiftKind[]).map((key) => (
            <option key={key} value={key}>
              {LIFT_LABEL[key]}
            </option>
          ))}
        </select>
      </label>
    </div>
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
