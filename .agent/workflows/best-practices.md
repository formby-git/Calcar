---
description: Consistency guidelines, maintenance rules, and design standards for Calcar.
---

# Best Practices & Consistency

> **Instructions:**
> These are non-negotiable standards to maintain the quality and consistency of Calcar.
> Read these whenever starting a related task.

---

## Maintenance Rules

### Accuracy Check Integrity
- **Context**: The `MarketMetadata` component compares our model against real market snapshots.
- **Rule**: When modifying or testing, always verify you are comparing the EXACT same age transition (e.g., Year 3 to Year 4) in both the market data and our model. A mismatch invalidates the verification.

---

## Design Standards

### Theme & Layout Consistency
- **Context**: Established during the "Subtler Brutalist" redesign.
- **Rule**:
  - Always use `1px` borders for containers and dividers (avoid `border-2`).
  - Use `text-xl` for primary data readouts (prices, residuals, etc.).
  - Maintain the "receipt" flow: related components (like VehicleCard and TCO) should stack seamlessly without gaps.
  - Standardize small text to `text-sm`.

### Security Validation
- **Context**: Current implementation is static/client-side.
- **Rule**: Always document where client-side validation is being used as a temporary measure (e.g., PIN checks). Future server-side validation MUST mirror current client-side rules when a backend is added.
