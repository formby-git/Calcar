# Calcar - UK Car TCO Calculator

Calcar is a Server-Side Rendered (SSR) web application that provides Total Cost of Ownership (TCO) and depreciation forecasts for vehicles in the UK. Users can enter a UK registration plate to instantly receive details about the car, including its VED (tax) bracket, estimated list price, and a comprehensive 1-15 year ownership cost breakdown.

## 🚀 Tech Stack

- **Framework:** [Astro](https://astro.build) (SSR mode)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Language:** TypeScript
- **Deployment:** Cloudflare Pages (via `@astrojs/cloudflare` adapter)
- **Data Sources:** 
  - Local vehicle database (`src/data/cars.json`)
  - Official UK DVLA API (Fallback)
  - Wikipedia API (Vehicle images)

## 🏗️ Project Structure

The codebase is split into the live web application and an offline data science pipeline:

- **`/src/pages/`**: Contains the Astro routing. The main flow starts at `index.astro` (Registration Form) and navigates to `/analyse/[country]/[registration].astro`.
- **`/src/components/`**: Reusable UI components. The primary dashboard consists of `VehicleCard.astro` and `TCOCalculator.astro`.
- **`/src/utils/`**: Core business logic, including `taxCalculator.ts` (VED rules) and `depreciationCalculator.ts` (depreciation curve modeling).
- **`/scripts/`**: Offline TypeScript and Python scripts used to ingest raw market data (e.g., Autotrader CSVs), analyze depreciation trends, and generate the modifiers used by the live app.
- **`/AGENTS.md`**: Always-on project rules for AI coding agents (Devin CLI, etc.).
- **`/.devin/skills/`**: Invokable skills with architecture notes, best practices, and workflows. **Read the relevant skill before contributing.** See `AGENTS.md` for the full list.

## 🛠️ Local Development

### 1. Prerequisites
- Node.js (v24.1.0 recommended)
- npm

### 2. Install Dependencies
```sh
npm install
```

### 3. Environment Variables
Create a `.env` file in the root of the project. You will need a DVLA API key for the vehicle lookup fallback to work.

```env
DVLA_API_KEY=your_dvla_api_key_here
```

### 4. Start the Dev Server
```sh
npm run dev
```
The application will be available at `http://localhost:4321`.

### 5. Build for Production (Cloudflare Pages)
```sh
npm run build
```
This builds the site using Astro, and the custom `bundle-worker` script uses `esbuild` to package the Cloudflare Worker entry point into `dist/client/_worker.js` for native Pages compatibility.

## 📚 Documentation for Agents & Developers

If you are an AI assistant or a new developer working on this codebase, read `AGENTS.md` at the repo root first, then invoke the relevant Devin skills in `/.devin/skills/`:
- `/calcar-changelog`: Historical context and changelog.
- `/calcar-best-practices`: UI guidelines and maintenance rules.
- `/calcar-architecture`: In-depth flow of the SSR application.
- `/calcar-data-pipeline`: Explanation of how market data is processed into depreciation modifiers.
- `/calcar-future-work`: A backlog of technical debt and deferred features.
- `/verify-depreciation`: Run the verifier scripts and check the ±5% target.
- `/ship`: Build + commit + push to main.
- `/explain-route [reg]`: Trace a registration plate through the app.
