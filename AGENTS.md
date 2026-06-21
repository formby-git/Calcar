# Calcar — Project Rules

UK car Total Cost of Ownership (TCO) calculator. Astro 6 SSR + Tailwind v4, deployed to Cloudflare Pages via the `@astrojs/cloudflare` v13 adapter.

## Conventions
- TypeScript strict. No React — components are `.astro` with vanilla JS in `<script>` tags.
- Components receive data via a `car-loaded` `CustomEvent` on `window`, NOT via props. Do not add prop plumbing.
- Env vars: `import { env } from "cloudflare:workers"`. Never use `Astro.locals.runtime` (removed in adapter v13).
- Build: `npm run build` (runs `astro build`, then `bundle-worker` which esbuilds `dist/server/entry.mjs` → `dist/client/_worker.js`).

## Design standards (non-negotiable)
- `1px` borders (`border`, never `border-2`).
- Data readouts `text-xl`; minimum text size `text-sm`.
- Seamless "receipt" stack between `VehicleCard` and `TCOCalculator` (no gaps).
- Currency: 0 dp for Price/Resale/Tax/Total; 2 dp only for "Monthly Cost".
- Registration plates styled as yellow UK plates (`#FCD116`, black mono text).

## Skills to invoke before relevant work
- `/calcar-architecture` — before touching routing, SSR flow, or the Cloudflare build.
- `/calcar-best-practices` — before any UI / styling work.
- `/calcar-data-pipeline` — before touching depreciation logic or `scripts/`.
- `/calcar-changelog` — read at task start; append to Change History when done.
- `/calcar-future-work` — when deferring a feature or planning work.
- `/verify-depreciation` — run after depreciation changes to check the ±5% target.
- `/ship` — build + commit + push to main (solo-dev workflow).
- `/explain-route [reg]` — trace a plate through the app to sanity-check numbers.
