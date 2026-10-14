import { createFileRoute } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { Calculator } from "@/components/calculator";
import { buttonVariants } from "@/components/ui/button";
import { COMPANY, ESTIMATE_CAVEAT } from "@/data/catalog";

/**
 * Samostatná stránka jen s kalkulačkou. Dá se poslat zákazníkovi odkazem,
 * ať soupis vyplní bez zbytku webu.
 */
export const Route = createFileRoute("/kalkulacka")({
  head: () => ({
    meta: [
      { title: "Kalkulačka stěhování | Stěhování Zeman" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalculatorPage,
});

function CalculatorPage() {
  const phone = COMPANY.phones[0];
  return (
    <div className="px-4 py-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <a href="/" aria-label="Stěhování Zeman, úvodní stránka">
            <img src="/logo.png" alt="Stěhování, nákladní doprava, V. Zeman, Jindřichův Hradec" className="h-12 w-auto" />
          </a>
          <a href={`tel:${phone.tel}`} className={buttonVariants({ variant: "primary" })}>
            <Phone className="size-4" /> <span className="hidden sm:inline">{phone.label}</span>
            <span className="sm:hidden">Zavolat</span>
          </a>
        </header>
        <div className="mt-8 max-w-2xl">
          <h1 className="font-display text-4xl leading-tight font-bold text-balance md:text-5xl">Kalkulačka stěhování</h1>
          <p className="mt-3 text-muted">
            Projděte byt a přidejte všechno, co se bude stěhovat, včetně sklepa, půdy a garáže. Čím přesnější soupis,
            tím přesnější cena. Na konci přiložte fotky místností a pošlete poptávku, ozveme se vám.
          </p>
        </div>
        <div className="mt-8">
          <Calculator />
        </div>
        <p className="mt-8 max-w-3xl text-xs text-muted">{ESTIMATE_CAVEAT}</p>
      </div>
    </div>
  );
}
