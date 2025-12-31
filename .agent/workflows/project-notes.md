---
description: Project context and change history for Calcar - UK Car TCO Calculator
---

# Calcar Project Notes

> **Instructions for Antigravity:**
> 1. Read this file at the START of any task involving code changes
> 2. Follow the design preferences listed below
> 3. Update the "Change History" section AFTER completing any significant changes
> 4. Add new considerations to "Future Considerations" when relevant issues are discussed
> 5. **Calculator Parity**: When modifying the TCO Calculator, ALWAYS confirm if changes should apply to both Standard and Pro modes. Limit divergence to UX/Input methods only; keep core logic unified.

---

## Project Overview
A Total Cost of Ownership (TCO) calculator for cars in the UK. Users enter a registration number to get vehicle details and cost projections.

**Tech Stack:** Astro, Tailwind CSS v4, TypeScript

---

## Design Preferences

### Visual Style
- **Color scheme:** Slate grays with blue accents (existing Tailwind palette)
- **Layout:** Clean, professional, minimal
- **Interactions:** Remove unnecessary hover states; only keep hover effects for important buttons
- **Typography:** Keep default/existing fonts, no custom typefaces

### Component Guidelines
- Prefer showing full images without cropping (use `object-contain` over `object-cover`)
- Registration plates styled as yellow UK plates (`#FCD116` background, black text, mono font)

---

## Change History

### 2025-12-21: Vehicle Card Redesign
**Request:** Redesign the vehicle card to match a reference layout with image on left and specs on right.

**Changes made to `VehicleCard.astro`:**
- Added styled registration plate display in the header
- Reorganised layout: Make/Model header, then 2-column grid (image left, specs right)
- Removed all complex hover states and transitions
- Changed image from `object-cover` to `object-contain` to prevent cropping

### 2025-12-21: Image Loading Discussion
**Note:** Current approach uses Wikipedia API to fetch car images.

**Known issues for production:**
1. Rate limits on Wikipedia API
2. Image licensing concerns (some images are fair-use only)
3. Hotlinking to Wikipedia servers

**Recommended alternatives for production:**
- Paid car image API (e.g., Imagin.studio)
- Self-hosted licensed image library
- Manufacturer press images

---

## Future Considerations
- Consider replacing Wikipedia image source before going public
- May need to add image attribution if keeping Wikipedia approach
- **Calculator Maintenance**: Maintain strict parity between Standard and Pro logic. Divergence should be deliberate and limited *only* to user experience (Entry-Level vs Pro features). Always verify intent before splitting logic.
- **Security Validation**: Current validation is client-side only. Future server-side validation MUST be implemented when a backend is added.

### 2025-12-26: Pro Depreciation Model
**Request:** Implement more accurate depreciation with age curve, fuel type, and brand adjustments.

**Changes made:**
- Created `depreciationCalculator.ts` with Basic (15%/year) and Pro models
- Pro model: 25% year 1, 15% year 2, 10% thereafter
- Fuel adjustments: Electric +5%, Diesel +3%, Hybrid -2%
- Brand adjustments: Porsche/Toyota/Honda/Land Rover -3%, DS/Polestar/Mitsubishi/Renault/Fiat +3%
- Added Basic/Pro toggle to Cost Calculator
- Extended ownership terms from 1-15 years

### 2025-12-26: Branding, Modes & UI Refinements
**Request:** Differentiate Standard/Pro modes, apply "Calcar" branding, and refine UI.

**Changes made:**
- **Branding:** Renamed site to "Calcar", created `Header` (non-sticky) and `Footer` (neutral). Added "More Smiles, Less Miles of Costs" tagline.
- **TCO Calculator Modes:**
  - **Standard (Default):** Simplified view. Read-only price, fixed 2-5 year button selector, hidden resale input.
  - **Pro:** Full control. Editable price/resale, 1-15 year dropdown.
  - **Default:** Always defaults to 3-year term.
- **UI Polish:**
  - **Pro Styling:** Amber border/shadow and "Cost Calculator Pro" title when active.
  - **Pro Insights:** Dedicated animated section for depreciation modifiers.
  - **Cost Display:** Promoted "Monthly Cost" to primary view (`text-xl`).
  - **Animations:** Smooth transitions for mode switching and section expansion.

### 2025-12-26: Accurate UK VED Calculator
**Request:** Implement accurate UK VED 2024/25 rules including first-year rates, standard rates, and expensive car supplement.

**Changes made:**
- Added `originalListPrice` field to Car interface and all car data.
- Updated `VehicleCard.astro` to display Original List Price.
- Rewrote `taxCalculator.ts` with:
  - **First-Year Rates:** CO₂-based banding (£10-£5,490) for new vehicles.
  - **Standard Rate:** £195/year for post-2017 cars.
  - **Expensive Car Supplement:** +£425/year for years 2-6 if list price > £40k.
  - **Pre-2017 Logic:** Different CO₂ bands for older vehicles.
- Updated `TCOCalculator.astro` to use `calculateTotalVED()` for accurate multi-year calculations.

### 2025-12-31: VED Refactor & 2025 Rules
**Request:** Refactor VED calculation to fully support 2025 Budget rules (specifically EV supplement threshold) and correct vehicle age tracking.

**Changes made:**
- **Vehicle Age Logic**: Fixed bug where supplement relied on ownership duration. Now correctly calculates supplement based on the vehicle's actual age (Years 2-6 of its life).
- **EV Supplement Threshold**: Implemented new £50,000 threshold for Expensive Car Supplement for EVs registered on/after 1 April 2025 (Standard threshold remains £40,000).
- **Refactoring**: Simplified `calculateTotalVED` signature, removing `isNewPurchase` argument in favor of inferring age from `yearOfManufacture`.


### 2025-12-26: Calculator UI Refactor
**Request:** Simplify calculator by unifying Standard/Pro modes into a single UI.

**Changes made:**
- **Unified UI**: All inputs always visible and editable.
- **Simple/Complex Toggle**: Clean toggle switch that only changes depreciation model (no UI changes).
- **Term Selector**: Quick buttons (2-5 years) + "Custom" option that reveals full dropdown.
- **Removed**: Separate Standard/Pro mode styling, visibility toggling, read-only states.
- **Kept**: Depreciation Factors section (appears when Complex mode is active).

### 2025-12-29: Enhanced Landing Page
**Request**: Improve landing experience with abstract background, centered registration form, and smooth transition to content.

**Changes made:**
- **Landing Layout**:
  - Implemented initial full-screen centered view for the registration form.
  - Added "Neon Gradient Mesh Fusion" abstract background with dark overlay.
  - Implemented smooth transition animation: background fades out, content moves to top, and calculator reveals on lookup.
- **Visuals**:
  - Hero text starts white (for dark background) and transitions to dark slate (for light calculator view).
  - Background image combines neon light trails with fluid gradient mesh.
- **Refinement**:
  - Removed static margins from `RegistrationForm` to allow layout flexibility.
  - Added `data-state` attributes to `index.astro` to manage transitions.
