import { useEffect, useState } from "react";
import { Mail, MapPin, Menu, Phone, X } from "lucide-react";
import { COMPANY, FLOOR_RATES, MAX_VOLUME_M3, PRICE_PER_KM, TRIP_PRICE } from "@/data/catalog";
import { formatKc } from "@/lib/quote";
import { Calculator } from "@/components/calculator";
import { Reveal } from "@/components/reveal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "#sluzby", label: "Služby" },
  { href: "#kalkulacka", label: "Kalkulačka" },
  { href: "#realizace", label: "Realizace" },
  { href: "#o-nas", label: "O nás" },
  { href: "#kontakt", label: "Kontakt" },
];

const SERVICES = [
  {
    title: "Byty a domy",
    text: "Od garsonky po rodinný dům. Demontáž nábytku, ochrana podlah a balení křehkého, když o něj požádáte.",
  },
  {
    title: "Firmy, banky, úřady",
    text: "Kanceláře i mimo pracovní dobu. Skartace a předání dokumentů podle zadání, ať provoz stojí co nejkratší dobu.",
  },
  {
    title: "Zámky a citlivé věci",
    text: "Obrazy, antikvity, nástroje, výstavy. Hrady, zámky a památky, kde se nespěchá a nic se neodře.",
  },
  {
    title: "Vyklízení",
    text: "Byty, sklepy, pozůstalosti i objekty po exekuci. Odvoz podle toho, co se má zachovat.",
  },
  {
    title: "Víkendy bez příplatku",
    text: "Termín po telefonu, včetně sobot, nedělí a svátků. Za víkend se nepřiplácí.",
  },
  {
    title: "Těžké a nadrozměrné",
    text: "Klavíry, trezory, kameny, zdravotnická technika. Když nestačí dodávka, bereme k tomu stroj.",
    note: "Montáž polic a regálů neděláme.",
  },
];

const PHOTOS = [
  {
    src: "/photos/vuz.jpg",
    alt: "Bílé IVECO Daily Stěhování Zeman před žlutou historickou budovou",
    title: "Výjezd k zámku",
    text: "IVECO Daily do 3,5 t, náklad 18,73 m³.",
  },
  {
    src: "/photos/naklad.jpg",
    alt: "Nakladač zvedá kamennou desku, vedle stojí posádka",
    title: "Těžký kus",
    text: "Když se věc nevejde do rukou, přijede technika.",
  },
  {
    src: "/photos/poliklinika.png",
    alt: "Dva muži u zabalené vysoké zásilky před vchodem do polikliniky",
    title: "Poliklinika",
    text: "Citlivá zásilka zabalená a dovezená až ke dveřím.",
  },
];

export function HomePage() {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<(typeof PHOTOS)[number] | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const phone = COMPANY.phones[0];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!photo) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPhoto(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photo]);

  return (
    <>
      <a
        href="#obsah"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-paper focus:px-3 focus:py-2"
      >
        Přeskočit na obsah
      </a>
      <header
        className={cn(
          "sticky top-0 z-30 border-b border-line bg-paper/95 text-ink backdrop-blur-sm transition-shadow duration-300",
          scrolled && "shadow-[0_12px_30px_-20px_rgba(28,20,16,0.6)]",
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
          <a href="#obsah" className="min-w-0">
            <img
              src="/logo.png"
              alt="Stěhování, nákladní doprava, V. Zeman, Jindřichův Hradec"
              className="h-12 w-auto max-w-[16rem] md:h-14 md:max-w-none"
            />
          </a>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Hlavní">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="nav-link text-sm text-muted transition-colors hover:text-accent">
                {item.label}
              </a>
            ))}
            <a href={`tel:${phone.tel}`} className={buttonVariants({ variant: "primary" })}>
              <Phone className="size-4" /> Zavolat
            </a>
          </nav>
          <button
            type="button"
            className="flex size-11 items-center justify-center md:hidden"
            aria-label={open ? "Zavřít menu" : "Otevřít menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav
            className="flex animate-in fade-in-0 flex-col gap-1 border-t border-line px-4 py-3 duration-150 md:hidden"
            aria-label="Mobilní"
          >
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="nav-link min-h-11 py-2 transition-colors hover:text-accent"
              >
                {item.label}
              </a>
            ))}
            <a href={`tel:${phone.tel}`} className={cn(buttonVariants({ variant: "primary" }), "mt-2")}>
              <Phone className="size-4" /> {phone.label}
            </a>
          </nav>
        )}
      </header>

      <main id="obsah">
        <section className="border-b border-line">
          <Reveal className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <h1>
              <img
                src="/logo.png"
                alt="Stěhování, nákladní doprava, V. Zeman, Jindřichův Hradec. S námi je vše lehké."
                className="h-auto w-full max-w-xl"
              />
            </h1>
            <p className="mt-8 max-w-xl text-lg text-muted">
              Malá firma, žádné call centrum. Byty, kanceláře, zámky a věci, se kterými se nespěchá. Vůz IVECO Daily
              do 3,5 t, od roku {COMPANY.since}, majetek na cestě pojištěný u České pojišťovny.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#kalkulacka" className={buttonVariants({ variant: "primary" })}>
                Spočítat cenu
              </a>
              <a href={`tel:${phone.tel}`} className={buttonVariants({ variant: "line" })}>
                <Phone className="size-4" /> {phone.label}
              </a>
            </div>
          </Reveal>
          <dl className="mx-auto grid max-w-6xl grid-cols-2 border-t border-line md:grid-cols-4">
            {[
              ["1987", "bez přestávky"],
              ["18,73 m³", "změřený náklad"],
              ["0 Kč", "za víkend navíc"],
              ["ČP", "pojištění cesty"],
            ].map(([value, label], index) => (
              <Reveal
                key={label}
                delay={index * 70}
                className={cn("border-line px-4 py-4", index % 2 === 1 && "border-l", index > 0 && "md:border-l")}
              >
                <dt className="font-display text-2xl">{value}</dt>
                <dd className="text-sm text-muted">{label}</dd>
              </Reveal>
            ))}
          </dl>
        </section>

        <Reveal as="figure" className="border-b border-line">
          <img
            src="/photos/vuz.jpg"
            alt="Bílé IVECO Daily před žlutou historickou budovou"
            className="h-72 w-full object-cover sm:h-96"
          />
          <figcaption className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 py-3 text-sm text-muted">
            <span>Výjezd. IVECO Daily, SPZ 8C7 8206.</span>
            <span className="font-script text-2xl text-accent">S námi je vše lehké</span>
          </figcaption>
        </Reveal>

        <section id="sluzby" className="scroll-mt-24 px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <SectionTitle kicker="Co vozíme" title="Šest věcí, které umíme" />
            <ol className="mt-10 border-t border-ink">
              {SERVICES.map((service, index) => (
                <Reveal
                  as="li"
                  key={service.title}
                  delay={index * 60}
                  className="grid gap-2 border-b border-line py-5 md:grid-cols-[4rem_14rem_1fr] md:gap-6"
                >
                  <span className="font-display text-2xl text-accent">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="font-display text-2xl">{service.title}</h3>
                  <p className="text-muted">
                    {service.text}
                    {service.note && <span className="mt-1 block text-accent-deep">{service.note}</span>}
                  </p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section id="kalkulacka" className="scroll-mt-24 overflow-x-clip border-y border-line bg-sheet px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <SectionTitle
              kicker="Orientační ceník"
              title="Kalkulačka"
              text="Sestavte náklad, patra a trasu. Číslo je odhad bez DPH — konečnou cenu potvrdíme po telefonu nebo prohlídce. Čekání na odemčení objektu, balení a demontáž v částce nejsou, dokud je nenapíšete do poptávky."
            />
            <Reveal className="mt-8" delay={80}>
              <Calculator />
            </Reveal>
            <details className="mt-6 border border-line bg-paper p-5">
              <summary className="cursor-pointer font-display text-xl">Jak se cena skládá</summary>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                <li>
                  Základní jízda {formatKc(TRIP_PRICE)} bez DPH. Další jízda začíná, jakmile objem přesáhne{" "}
                  {MAX_VOLUME_M3.toLocaleString("cs-CZ")} m³.
                </li>
                <li>
                  Každý kus má sazbu za naložení a složení. Patro navíc: lehké {formatKc(FLOOR_RATES.light)}, střední{" "}
                  {formatKc(FLOOR_RATES.medium)}, těžké {formatKc(FLOOR_RATES.heavy)}, velmi těžké{" "}
                  {formatKc(FLOOR_RATES.very_heavy)} za patro a kus. Přízemí je nula.
                </li>
                <li>Osobní výtah: příplatek jen u těžkých a velmi těžkých kusů. Nákladní výtah patra neúčtuje.</li>
                <li>Pračka a myčka mají 200 Kč za odpojení a fixaci, patra se k tomu počítají zvlášť.</li>
                <li>
                  Dopravné {PRICE_PER_KM} Kč/km. Trasa umí nájezd ze sídla, cestu stěhování krát počet jízd a návrat.
                  Kilometry jdou zadat i ručně.
                </li>
                <li>K ceně se připočte DPH 21 %. Pojištění je u České pojišťovny. Montáž polic a regálů nenabízíme.</li>
              </ul>
            </details>
          </div>
        </section>

        <section id="realizace" className="scroll-mt-24 px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <SectionTitle kicker="Z akcí" title="Tři věci, které se opravdu stěhovaly" />
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {PHOTOS.map((item, index) => (
                <Reveal as="figure" key={item.src} delay={index * 90}>
                  <button type="button" onClick={() => setPhoto(item)} className="group block w-full text-left">
                    <span className="block overflow-hidden border border-line">
                      <img
                        src={item.src}
                        alt={item.alt}
                        className="h-64 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    </span>
                    <figcaption className="mt-3 border-t-2 border-accent pt-2 transition-colors group-hover:border-accent-deep">
                      <span className="block font-display text-xl transition-colors group-hover:text-accent-deep">
                        {item.title}
                      </span>
                      <span className="text-sm text-muted">{item.text}</span>
                    </figcaption>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="o-nas" className="scroll-mt-24 border-y border-line bg-sheet px-4 py-16">
          <Reveal className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[auto_1fr] md:items-start">
            <p className="font-display text-8xl leading-none text-accent">{COMPANY.since}</p>
            <div>
              <h2 className="font-display text-4xl">Malá firma, dlouhá praxe</h2>
              <p className="mt-4 max-w-2xl text-muted">
                {COMPANY.name}, IČO {COMPANY.ico}, stěhuje z Jindřichova Hradce od roku 1987. Přímé jednání a
                ohleduplné zacházení s věcmi, které nejsou naše. Přeprava je pojištěná u České pojišťovny. Jezdíme po
                republice i za hranice.
              </p>
              <dl className="mt-8 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                {[
                  ["Délka nákladu", "512,5 cm"],
                  ["Šířka", "174 cm"],
                  ["Mezi podběhy", "131,7 cm"],
                  ["Výška H3", "210 cm"],
                  ["Objem", "18,73 m³"],
                  ["Vůz", "IVECO Daily 3.0, 131 kW, 2019"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-line pb-2">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-right font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </section>

        <section id="kontakt" className="scroll-mt-24 px-4 py-16">
          <Reveal className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
            <div>
              <SectionTitle kicker="Sídlo" title="Kontakt" />
              <ul className="mt-8 space-y-5">
                <li className="flex gap-3">
                  <Phone className="mt-1 size-5 text-accent" />
                  <div>
                    <p className="font-display text-xl">Telefon</p>
                    {COMPANY.phones.map((item) => (
                      <a key={item.tel} href={`tel:${item.tel}`} className="block text-muted hover:text-accent">
                        {item.label}
                      </a>
                    ))}
                    <p className="text-sm text-muted">Termín podle telefonické domluvy.</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Mail className="mt-1 size-5 text-accent" />
                  <div>
                    <p className="font-display text-xl">E-mail</p>
                    <a href={`mailto:${COMPANY.email}`} className="text-muted hover:text-accent">
                      {COMPANY.email}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <MapPin className="mt-1 size-5 text-accent" />
                  <div>
                    <p className="font-display text-xl">Adresa</p>
                    <p className="text-muted">
                      {COMPANY.name}
                      <br />
                      {COMPANY.street}
                      <br />
                      {COMPANY.city}
                      <br />
                      IČO {COMPANY.ico} · DIČ {COMPANY.dic}
                      <br />
                      Datová schránka {COMPANY.databox}
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <iframe
              title="Mapa sídla, Claudiusova 413, Jindřichův Hradec"
              className="h-96 w-full border border-line"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${(COMPANY.depot.lon - 0.008).toFixed(3)}%2C${(COMPANY.depot.lat - 0.005).toFixed(3)}%2C${(COMPANY.depot.lon + 0.008).toFixed(3)}%2C${(COMPANY.depot.lat + 0.005).toFixed(3)}&layer=mapnik&marker=${COMPANY.depot.lat}%2C${COMPANY.depot.lon}`}
            />
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line px-4 py-10 pb-28 md:pb-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <img src="/logo.png" alt="" className="h-16 w-auto" />
            <p className="mt-2 text-sm text-muted">Nákladní doprava · Jindřichův Hradec</p>
          </div>
          <p className="max-w-sm text-sm text-muted">
            © {new Date().getFullYear()} {COMPANY.name} · IČO {COMPANY.ico} · {COMPANY.street}, {COMPANY.city}
          </p>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink p-2 text-paper md:hidden">
        <div className="grid grid-cols-3 gap-2">
          <a
            href={`tel:${phone.tel}`}
            className="flex min-h-11 items-center justify-center gap-1 bg-accent text-sm font-semibold text-paper"
          >
            <Phone className="size-4" /> Volat
          </a>
          <a href="#kalkulacka" className="flex min-h-11 items-center justify-center gap-1 bg-paper text-sm font-semibold text-ink">
            Cena
          </a>
          <a
            href={`mailto:${COMPANY.email}`}
            className="flex min-h-11 items-center justify-center gap-1 bg-ink-soft text-sm font-semibold"
          >
            <Mail className="size-4" /> E-mail
          </a>
        </div>
      </div>

      {photo && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/90 p-4 animate-in fade-in-0 duration-200"
          role="dialog"
          aria-modal="true"
          aria-label={photo.title}
          onClick={() => setPhoto(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 flex size-11 items-center justify-center bg-paper text-ink transition-colors hover:bg-accent hover:text-paper"
            aria-label="Zavřít"
            onClick={() => setPhoto(null)}
          >
            <X />
          </button>
          <figure
            className="max-h-full max-w-4xl animate-in zoom-in-95 fade-in-0 duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <img src={photo.src} alt={photo.alt} className="max-h-[70vh] w-full object-contain" />
            <figcaption className="mt-3 text-paper">
              <span className="font-display text-2xl">{photo.title}</span>
              <span className="mt-1 block text-sm text-paper/70">{photo.text}</span>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}

function SectionTitle({ kicker, title, text }: { kicker: string; title: string; text?: string }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="text-sm tracking-widest text-accent uppercase">{kicker}</p>
      <span className="mt-2 block h-0.5 w-12 bg-accent" aria-hidden="true" />
      <h2 className="mt-3 font-display text-4xl leading-tight">{title}</h2>
      {text && <p className="mt-4 text-muted">{text}</p>}
    </Reveal>
  );
}
