import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { COMPANY } from "@/data/catalog";
import { cn } from "@/lib/cn";
import { SEARCH_BBOX, countryName, isAbroad, isServedCountry, normalizeCountry, type Point } from "@/lib/geo";

export type { Point };

type Suggestion = { label: string; detail: string; point: Point };

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    district?: string;
    county?: string;
    countrycode?: string;
  };
};

function toSuggestion(feature: PhotonFeature): Suggestion | null {
  const p = feature.properties;
  const coords = feature.geometry?.coordinates;
  if (!p || !coords || !isServedCountry(p.countrycode)) return null;
  const country = normalizeCountry(p.countrycode);
  const place = p.city ?? p.town ?? p.village ?? p.district ?? p.county ?? "";
  const street = p.street ? `${p.street}${p.housenumber ? ` ${p.housenumber}` : ""}` : "";
  const label = street || p.name || place;
  if (!label) return null;
  // Zemi píšeme jen u adres mimo ČR. Do poptávky tak jde "Kienberg, Gaming, Rakousko", ne jen "Kienberg".
  const abroad = isAbroad(country) ? countryName(country) : "";
  const detail = [
    street && p.name && p.name !== street ? p.name : "",
    place !== label ? place : "",
    p.postcode ?? "",
    abroad,
  ]
    .filter(Boolean)
    .join(", ");
  const full = [label, place && place !== label ? place : "", abroad].filter(Boolean).join(", ");
  const point: Point = country
    ? { lat: coords[1], lon: coords[0], country, label: full }
    : { lat: coords[1], lon: coords[0], label: full };
  return { label: full, detail, point };
}

async function search(query: string, signal: AbortSignal): Promise<Suggestion[]> {
  const params = new URLSearchParams({
    q: query,
    limit: "6",
    bbox: SEARCH_BBOX,
    lat: String(COMPANY.depot.lat),
    lon: String(COMPANY.depot.lon),
  });
  const response = await fetch(`https://photon.komoot.io/api/?${params}`, { signal });
  if (!response.ok) throw new Error("Našeptávač není dostupný.");
  const data = (await response.json()) as { features?: PhotonFeature[] };
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const feature of data.features ?? []) {
    const item = toSuggestion(feature);
    if (!item || seen.has(item.label)) continue;
    seen.add(item.label);
    out.push(item);
  }
  return out;
}

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Volá se po výběru návrhu, aby se nemuselo znovu geokódovat. */
  onPick: (value: string, point: Point) => void;
  placeholder?: string;
  className?: string;
  /** `dark` pro tmavé pozadí, `light` pro karty. */
  tone?: "dark" | "light";
};

export function AddressInput({ label, value, onChange, onPick, placeholder, className, tone = "dark" }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const picked = useRef<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3 || picked.current === value) {
      setItems([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const found = await search(query, controller.signal);
        setItems(found);
        setActive(-1);
        setOpen(found.length > 0);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function choose(item: Suggestion) {
    picked.current = item.label;
    onPick(item.label, item.point);
    setItems([]);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !items.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? items.length - 1 : index - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(items[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={box} className={cn("relative", className)}>
      <label
        className={cn(
          "block",
          tone === "dark" ? "text-xs tracking-widest text-paper/60 uppercase" : "text-sm font-medium text-ink",
        )}
      >
        {label}
        <div className="relative mt-1">
          <input
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
            autoComplete="off"
            value={value}
            onChange={(event) => {
              picked.current = null;
              onChange(event.target.value);
            }}
            onFocus={() => items.length && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="min-h-11 w-full rounded-xl border border-line bg-paper pr-9 pl-3 text-sm font-normal tracking-normal text-ink normal-case transition-colors focus:border-accent focus:bg-white"
          />
          {loading && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted" />}
        </div>
      </label>
      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-white p-1 text-ink normal-case shadow-lift"
        >
          {items.map((item, index) => (
            <li
              key={item.label}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(item);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-sm tracking-normal",
                index === active && "bg-accent/10",
              )}
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.label}</span>
                {item.detail && <span className="block truncate text-xs text-muted">{item.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
