---
name: explain-route
description: Trace the full request flow for a UK registration plate through Calcar and explain the computed numbers. Good for onboarding and sanity-checking the model.
allowed-tools:
  - read
  - exec
  - grep
  - glob
triggers:
  - user
  - model
argument-hint: "[registration]"
---

# Explain a Calcar Route

Trace how a given UK registration plate flows through the app and explain the numbers that would be produced. Use this to sanity-check the model or to onboard someone onto the codebase.

The registration is passed as `$1` (or `$ARGUMENTS`). Normalise it: strip spaces, uppercase.

## Steps

1. **Routing** — confirm the URL that would be hit:
   `index.astro` form submission → `/analyse/gb/<REGISTRATION>`. See `src/pages/index.astro` and `src/pages/analyse/[country]/[registration].astro`.

2. **Vehicle lookup** — trace `getCarByRegistration(registration, apiKey)` in `src/utils/carService.ts`:
   - First checks local `src/data/cars.json`.
   - Falls back to the DVLA API via `src/utils/dvla.ts` (needs `DVLA_API_KEY`).
   Report which source would be used for this plate (search `cars.json` for the registration to determine this).

3. **VED calculation** — read `src/utils/taxCalculator.ts` and explain, for the resolved car:
   - Registration era (pre-2017 vs post-2017 vs post-April-2025).
   - First-year rate band from CO₂ (if applicable).
   - Standard rate.
   - Expensive Car Supplement eligibility (£40k threshold, or £50k for EVs registered on/after 1 April 2025), and which years of ownership it applies to (years 2–6 of the vehicle's life).

4. **Depreciation** — read `src/utils/depreciationCalculator.ts` and `src/data/depreciation_curves.json`:
   - Identify the curve source used (make+fuel → make → fuel → global).
   - Note any `specialModifiers` applied for the make.
   - Note whether `isSpecialVariant` matches (AMG/RS/M/GT/etc.).
   - Show the residual factor for a default 3-year term.

5. **Output** — present a concise trace:
   - Plate → source (local/DVLA) → car summary (make/model/year/fuel/CO₂/list price).
   - VED: year-by-year for the term, with supplement flagged.
   - Depreciation: curve used, modifiers, residual %.
   - Any caveats (e.g. vehicle not in local DB and no API key available).

Do NOT modify any files. This is a read-only explanation skill.
