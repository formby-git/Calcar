---
name: verify-depreciation
description: Run the depreciation verifier scripts and summarise the delta vs the +/-5% target. Cheap, fast way to catch model regressions.
model: swe
allowed-tools:
  - read
  - exec
  - grep
  - glob
triggers:
  - user
---

# Verify Depreciation Model

Run the offline verification scripts and report whether the live depreciation model still matches historical market data within tolerance.

## Steps

1. Confirm the verifier scripts exist:
   - `scripts/verify_modifiers.ts`
   - `scripts/verify_modifiers_mileage.ts`

2. Run them with `npx ts-node`:
   ```bash
   npx ts-node scripts/verify_modifiers.ts
   npx ts-node scripts/verify_modifiers_mileage.ts
   ```
   If `ts-node` is unavailable, fall back to `npx tsx scripts/verify_modifiers.ts`.

3. Parse the report output. For each make/fuel group, capture:
   - Predicted vs actual residual %.
   - The delta.
   - Whether it is within the **+/- 5%** target for mainstream vehicles.

4. Summarise concisely:
   - Total groups checked, number within tolerance, number out of tolerance.
   - List the worst 5 offenders (largest absolute delta) with their make/fuel and delta.
   - A clear PASS / FAIL verdict.

5. If any group is out of tolerance, suggest the likely cause (e.g. a stale modifier in `src/utils/depreciationCalculator.ts` or a `specialModifiers` entry in `src/data/depreciation_curves.json`) and recommend running `/calcar-data-pipeline` before making changes. Do NOT edit the calculator unless explicitly asked.

## Notes
- These scripts depend on `src/data/market_stats.json` being present (it is committed).
- The mileage verifier additionally normalises by mileage; see the `/calcar-future-work` skill for context on why diesel often looks steeper.
