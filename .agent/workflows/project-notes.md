---
description: Project context and change history for Calcar - UK Car TCO Calculator
---

# Calcar Project Notes

> **Instructions for Antigravity:**
> 1. Read this file at the START of any task involving code changes
> 2. Follow the design preferences listed below
> 3. Update the "Change History" section AFTER completing any significant changes
> 4. Add new considerations to "Future Considerations" when relevant issues are discussed

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
