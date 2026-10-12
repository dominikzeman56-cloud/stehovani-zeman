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
