import { useEffect, useState } from "react";
import { Mail, MapPin, Menu, Phone, X } from "lucide-react";
import { CARRY_M_PER_FLOOR, DENSE_NEGOTIATE_COUNT, CARRY_STEP_M, COMPANY, ESTIMATE_CAVEAT, FLOOR_RATES, MAX_VOLUME_M3, PRICE_PER_KM, TRIP_PRICE } from "@/data/catalog";
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
    src: "/photos/vuz-1535.webp",
    srcSet: "/photos/vuz-800.webp 800w, /photos/vuz-1535.webp 1535w",
    alt: "Bílé IVECO Daily Stěhování Zeman před žlutou historickou budovou",
    title: "Výjezd k zámku",
    text: "IVECO Daily do 3,5 t, náklad 18,73 m³.",
  },
  {
    src: "/photos/naklad-1200.webp",
    srcSet: "/photos/naklad-700.webp 700w, /photos/naklad-1200.webp 1200w",
    alt: "Nakladač zvedá kamennou desku, vedle stojí posádka",
    title: "Těžký kus",
    text: "Když se věc nevejde do rukou, přijede technika.",
  },
  {
    src: "/photos/poliklinika.webp",
    srcSet: "/photos/poliklinika.webp 651w",
    alt: "Dva muži u zabalené vysoké zásilky před vchodem do polikliniky",
    title: "Poliklinika",
    text: "Citlivá zásilka zabalená a dovezená až ke dveřím.",
  },
];

const TRUST_POINTS = [
  ["Přímá domluva", "Bez call centra. Termín, přístup i cenu řešíte rovnou s člověkem, který zakázku zná."],
  ["Citlivé věci", "Zámky, obrazy, nástroje i zdravotnická technika. Věci chráníme, jako by byly naše."],
  ["Dlouhá praxe", "Od roku 1987 stěhujeme byty, firmy i těžké kusy po celé republice i za hranice."],
] as const;

export function HomePage() {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<(typeof PHOTOS)[number] | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [inCalculator, setInCalculator] = useState(false);
  const phone = COMPANY.phones[0];

  useEffect(() => {
    const target = document.getElementById("kalkulacka");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setInCalculator(entry.isIntersecting), { threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

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
          "sticky top-3 z-30 mx-3 mt-3 rounded-full border border-line/80 bg-white/75 text-ink backdrop-blur-xl transition-shadow duration-300 md:mx-auto md:max-w-6xl",
          scrolled ? "shadow-[0_10px_30px_-10px_rgb(20_24_29/0.25)]" : "shadow-soft",
        )}
      >
        <div className="flex items-center justify-between gap-4 py-1.5 pr-2 pl-5">
          <a href="#obsah" className="min-w-0">
            <img
              src="/logo.png"
              alt="Stěhování, nákladní doprava, V. Zeman, Jindřichův Hradec"
              className="h-10 w-auto max-w-[14rem] md:h-11 md:max-w-none"
            />
          </a>
          <nav className="hidden items-center gap-6 md:flex" aria-label="Hlavní">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="nav-link text-sm font-medium text-muted transition-colors hover:text-ink">
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
            className="absolute inset-x-0 top-full mt-2 flex animate-in fade-in-0 slide-in-from-top-2 flex-col gap-1 rounded-3xl border border-line bg-white/95 px-5 py-4 shadow-lift backdrop-blur-xl duration-200 md:hidden"
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
        <section className="px-3 pt-3 md:px-4">
          <div className="hero-intro mx-auto max-w-[88rem]">
            <img
              src="/photos/vuz-1535.webp"
              srcSet="/photos/vuz-800.webp 800w, /photos/vuz-1535.webp 1535w"
              sizes="100vw"
              width={1535}
              height={2048}
              fetchPriority="high"
              alt="Bílé IVECO Daily před žlutou historickou budovou"
              className="hero-intro-photo"
            />
            <div className="hero-intro-shade" aria-hidden="true" />
            <Reveal className="hero-intro-content mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-28">
              <p className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-paper">
                <span className="size-2 rounded-full bg-accent shadow-[0_0_0_4px_rgb(208_18_26/0.3)]" aria-hidden="true" />
                Jindřichův Hradec · celá ČR
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.98] font-bold text-balance text-paper md:text-7xl lg:text-8xl">
                S námi je vše lehké.
                <span className="mt-2 block bg-gradient-to-r from-[#ff5a5f] to-accent bg-clip-text text-transparent">Od roku {COMPANY.since}.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg text-paper/80 md:text-xl">
                Byty, firmy, zámky i těžké kusy. Přímá domluva, pojištěná přeprava, celá ČR.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#kalkulacka" className={buttonVariants({ variant: "primary" })}>Spočítat cenu</a>
                <a href={`tel:${phone.tel}`} className={buttonVariants({ variant: "glass" })}><Phone className="size-4" /> {phone.label}</a>
              </div>
              <div className="mt-8 flex flex-wrap gap-2 text-sm font-medium text-paper">
                {["Pojištěná přeprava", "Víkendy bez příplatku", "Vůz 18,73 m³"].map((t) => (
                  <span key={t} className="glass rounded-full px-3.5 py-1.5">
                    ✓ {t}
                  </span>
                ))}
              </div>
            </Reveal>
            <p className="hero-intro-caption mx-auto max-w-6xl px-6 py-4 md:px-10 text-sm text-paper/65">IVECO Daily · SPZ 8C7 8206</p>
          </div>
          <dl className="mx-auto mt-4 grid max-w-6xl grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["1987", "bez přestávky"],
              ["18,73 m³", "změřený náklad"],
              ["0 Kč", "za víkend navíc"],
              ["ČP", "pojištění cesty"],
            ].map(([value, label], index) => (
              <Reveal
                key={label}
                delay={index * 70}
                className="card px-5 py-5"
              >
                <dt className="font-display text-3xl font-bold">{value}</dt>
                <dd className="mt-0.5 text-sm text-muted">{label}</dd>
              </Reveal>
            ))}
          </dl>
        </section>

        <section id="sluzby" className="scroll-mt-24 px-4 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionTitle kicker="Co vozíme" title="Šest věcí, které umíme" />
            <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.map((service, index) => (
                <Reveal
                  as="li"
                  key={service.title}
                  delay={index * 60}
                  className="card flex flex-col gap-3 p-6"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-accent/10 font-display text-base font-bold text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-2xl font-bold">{service.title}</h3>
                  <p className="text-muted">
                    {service.text}
                    {service.note && <span className="mt-1 block text-accent-deep">{service.note}</span>}
                  </p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section id="kalkulacka" className="scroll-mt-24 overflow-x-clip border-y border-line bg-sheet px-4 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionTitle
              kicker="Orientační ceník"
              title="Kalkulačka"
              text="Sestavte náklad, patra a trasu. Číslo je odhad bez DPH. Čekání na odemčení objektu, balení a demontáž v částce nejsou, dokud je nenapíšete do poptávky. Přístup, který kalkulačka nevidí, popište dole a klidně ho vyfoťte."
            />
            <Reveal className="mt-8" delay={80}>
              <Calculator />
            </Reveal>
            <details className="card card-static mt-6 p-6">
              <summary className="cursor-pointer font-display text-xl">Jak se cena skládá</summary>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                <li>
                  Základní jízda {formatKc(TRIP_PRICE)} bez DPH je přistavení vozu a posádky. Další jízda začíná, jakmile
                  objem přesáhne {MAX_VOLUME_M3.toLocaleString("cs-CZ")} m³. Když je věcí málo, cenu po telefonu srovnáme.
                </li>
                <li>
                  Každý kus má sazbu za naložení a složení. Patro navíc: lehké {formatKc(FLOOR_RATES.light)}, střední{" "}
                  {formatKc(FLOOR_RATES.medium)}, těžké {formatKc(FLOOR_RATES.heavy)}, velmi těžké{" "}
                  {formatKc(FLOOR_RATES.very_heavy)} za patro a kus. Krabice po schodech skoro nic nestojí. Piano a trezor
                  ano. Posuvná skříň a křídlo jsou dlouhé: v paneláku se s nimi na podestě neotočí, takže patra mají
                  sazbu velmi těžkého kusu, i když skříň nemá kila piana. Přízemí je nula.
                </li>
                <li>
                  Donáška od vozu ke dveřím po rovině se počítá jako patra: {CARRY_M_PER_FLOOR} m jsou jedno patro, tedy
                  40 m jsou dvě. Pod {CARRY_STEP_M} m se neúčtuje nic. Platí pro nakládku i vykládku zvlášť a výtah ji
                  neovlivní. Pár beden s knihami se do sazby vejde. Když jich je hodně (od {DENSE_NEGOTIATE_COUNT} kusů)
                  a nosí se po schodech nebo přes dvůr, cenu domluvíme zvlášť.
                </li>
                <li>
                  Osobní výtah: příplatek jen u těžkých a velmi těžkých kusů a u dlouhých, co se do něj nevejdou.
                  Nákladní výtah patra neúčtuje.
                </li>
                <li>Pračka a myčka mají 200 Kč za odpojení a fixaci, patra se k tomu počítají zvlášť.</li>
                <li>
                  Dopravné {PRICE_PER_KM} Kč/km. Trasa umí nájezd ze sídla, cestu stěhování krát počet jízd a návrat.
                  Kilometry jdou zadat i ručně.
                </li>
                <li>K ceně se připočte DPH 21 %. Pojištění je u České pojišťovny. Montáž polic a regálů nenabízíme.</li>
                <li>{ESTIMATE_CAVEAT}</li>
              </ul>
            </details>
          </div>
        </section>

        <section id="realizace" className="scroll-mt-24 px-4 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionTitle kicker="Z akcí" title="Tři věci, které se opravdu stěhovaly" />
            <div className="mt-8 grid gap-8 md:grid-cols-[1.35fr_1fr_1fr]">
              {PHOTOS.map((item, index) => (
                <Reveal as="figure" key={item.src} delay={index * 90}>
                  <button type="button" onClick={() => setPhoto(item)} className="group block w-full text-left">
                    <span className="block overflow-hidden rounded-card border border-line shadow-soft transition-shadow duration-300 group-hover:shadow-lift">
                      <img
                        src={item.src}
                        srcSet={item.srcSet}
                        sizes="(min-width: 768px) 40vw, 100vw"
                        loading="lazy"
                        decoding="async"
                        alt={item.alt}
                        className={cn(
                          "w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105",
                          index === 0 ? "h-80" : "h-64",
                        )}
                      />
                    </span>
                    <figcaption className="mt-4 px-1">
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

        <section className="border-y border-line bg-sheet px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <SectionTitle kicker="Proč Zeman" title="Zkušenosti, které jsou na zakázce znát" text="Nechceme si psát vymyšlené hvězdičky. Důvěru stavíme na konkrétní práci, přímé domluvě a věcech, které po nás zůstanou v pořádku." />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {TRUST_POINTS.map(([title, text], index) => (
                <Reveal key={title} delay={index * 80} className="card p-6">
                  <p className="font-display text-2xl">{title}</p>
                  <p className="mt-2 text-sm text-muted">{text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="o-nas" className="scroll-mt-24 px-4 py-20 md:py-28">
          <Reveal className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[auto_1fr] md:items-start">
            <p className="font-display text-8xl leading-none font-extrabold text-accent/90 md:text-9xl">{COMPANY.since}</p>
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

        <section id="kontakt" className="scroll-mt-24 px-4 pb-20 md:pb-28">
          <Reveal className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
            <div>
              <SectionTitle kicker="Sídlo" title="Kontakt" />
              <div className="mt-7 rounded-card bg-ink p-6 text-paper shadow-lift">
                <p className="font-display text-2xl">Domluvme termín po telefonu</p>
                <p className="mt-2 text-sm text-paper/75">Krátce popište, co stěhujete a odkud kam. Řekneme si, co bude potřeba a kdy můžeme přijet.</p>
                <a href={`tel:${phone.tel}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-6 font-semibold text-paper transition-colors hover:bg-accent-deep">
                  <Phone className="size-4" /> {phone.label}
                </a>
              </div>
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
              className="h-96 w-full rounded-card border border-line shadow-soft md:h-full md:min-h-[28rem]"
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

      <a href={`tel:${phone.tel}`} className={cn("desktop-contact-cta hidden transition-opacity duration-200 md:flex", inCalculator && "pointer-events-none opacity-0")}
        tabIndex={inCalculator ? -1 : undefined}
        aria-hidden={inCalculator || undefined} aria-label={`Zavolat na číslo ${phone.label}`}>
        <Phone className="size-4" />
        <span>
          <strong>Zavolat</strong>
          <small>{phone.label}</small>
        </span>
      </a>

      <div className="fixed inset-x-2 bottom-2 z-20 rounded-2xl border border-white/10 bg-ink/95 p-2 text-paper shadow-lift backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-3 gap-2">
          <a
            href={`tel:${phone.tel}`}
            className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-accent text-sm font-semibold text-paper"
          >
            <Phone className="size-4" /> Volat
          </a>
          <a href="#kalkulacka" className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-paper text-sm font-semibold text-ink">
            Cena
          </a>
          <a
            href={`mailto:${COMPANY.email}`}
            className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-ink-soft text-sm font-semibold"
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
      <p className="inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold tracking-widest text-accent uppercase">{kicker}</p>
      <h2 className="mt-4 font-display text-4xl leading-[1.05] font-bold text-balance md:text-5xl">{title}</h2>
      {text && <p className="mt-4 text-muted">{text}</p>}
    </Reveal>
  );
}
