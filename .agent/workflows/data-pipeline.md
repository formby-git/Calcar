---
description: Explanation of how offline market data is processed into depreciation modifiers.
---

# Calcar Data Pipeline

> **Instructions for Agents:**
> The live Calcar web app does *not* do machine learning or live Autotrader scraping. Read this file to understand how the depreciation curve modifiers are generated offline via the scripts in the `/scripts` directory.

## Overview

Because live scraping of car prices is slow, unreliable, and often violates TOS, Calcar relies on a pre-calculated mathematical model for depreciation (`src/utils/depreciationCalculator.ts`). 

To ensure this model is accurate, we run an offline data pipeline that analyzes bulk datasets (e.g., CSV exports of Autotrader or generic market data) to generate percentage modifiers (e.g. "Porsches depreciate 3% less than standard", "Diesels depreciate 2% faster").

## The Scripts Directory (`/scripts/`)

The offline pipeline lives in the `scripts/` folder. These scripts are run locally via `npx ts-node` or `python` and are never deployed to Cloudflare Pages.

### 1. Ingestion (`process_market_data.ts` / `update_car_prices.py`)
- These scripts ingest large raw data files (like `all_car_adverts.csv` - typically ignored in `.gitignore`).
- They clean the data, normalize pricing, and output aggregated JSON files (e.g. `market_stats.json`) that represent the average prices of specific makes, models, and fuel types across different ages.

### 2. Analysis (`analyse_curve_shapes.ts`)
- Reads the aggregated `market_stats.json`.
- Calculates the year-over-year percentage drop in value.
- Groups these drops by Make or Fuel Type to identify macro-trends. 
  - *Example Output: "Average Year 3 depreciation for petrol is 15%, but for electric it is 19%."*

### 3. Modifier Generation (`generate_curves.ts`)
- Taking the trends identified above, this script helps define the discrete modifiers used in `depreciationCalculator.ts`.
- Instead of creating thousands of unique curves, we aim to map specific brands or attributes to a small set of "Curve Sources" (e.g., Standard, Premium, Luxury_Depreciating) and apply flat percentage modifiers.

### 4. Verification (`verify_modifiers.ts` / `verify_modifiers_mileage.ts`)
- Once we update the modifiers in `depreciationCalculator.ts`, these scripts act as our "Integration Tests".
- They load the live calculator function and run it against the historical `market_stats.json`.
- They output a report showing the delta between our *predicted* depreciation and the *actual* historical depreciation.
- **Goal:** Keep the delta under +/- 5% for mainstream vehicles.

## How to Update the Model
If a user requests an update to the depreciation model:
1. Ensure you have the latest `market_stats.json` or raw CSV.
2. Run `analyse_curve_shapes.ts` to see current market trends.
3. Update the logic in `src/utils/depreciationCalculator.ts`.
4. Run `npx ts-node scripts/verify_modifiers.ts` to prove your new logic matches reality.
