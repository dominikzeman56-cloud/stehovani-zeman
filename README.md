# Stěhování V. Zeman — web

Prezentace stěhovací firmy **Stěhování V. Zeman** (Jindřichův Hradec) s online
kalkulačkou ceny stěhování, sekcí realizací a kontaktní mapou.

## Spuštění

```bash
npm install
npm run dev        # http://localhost:8080
```

## Kontroly

```bash
npm run typecheck  # TypeScript
npm run build      # produkční build (+ migrace)
npm run db:migrate # databázové migrace (PGLite fallback lokálně stačí)
```

## Technologie

TanStack Start/Router/Query · React 19 · Tailwind v4 · Vite · PGLite/Postgres

## Odesílání poptávek (Resend)

Poptávka z kalkulačky jde na `POST /api/poptavka` a přijde e-mailem i s fotkami jako přílohami.

Proměnné prostředí (ve Vercelu: Project → Settings → Environment Variables):

| Proměnná | Význam |
|---|---|
| `RESEND_API_KEY` | API klíč z resend.com |
| `INQUIRY_TO` | kam poptávky chodí, čárkou oddělený seznam |
| `INQUIRY_FROM` | odesílatel, např. `Poptávky <poptavky@vase-domena.cz>`. Bez vlastní ověřené domény zůstává `onboarding@resend.dev`, což Resend pouští jen na e-mail účtu, ze kterého byl klíč vytvořen |

Když `RESEND_API_KEY` nebo `INQUIRY_TO` chybí, endpoint vrací 503 a kalkulačka spadne zpět na `mailto:`. Fotky se v prohlížeči zmenšují na 1600 px, aby se vešly do limitu Vercelu (4,5 MB).
