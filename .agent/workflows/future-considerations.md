---
description: A log of future considerations, technical debt, and potential features to address later.
---

# Future Considerations

> **Instructions:**
> When adding a new item, please record:
> - **Date Added**: When this was raised.
> - **Context**: What feature or task triggered this thought.
> - **Why**: The reasoning behind deferring it or why it is important.

---

## 2026-01-04: Mileage Normalization
- **Context**: Added during the "Internal Depreciation Curves Page" task. User noted that diesel depreciation looked steeper than expected.
- **Why**: Diesel cars typically have much higher mileage than petrols. Comparing them purely by age penalizes diesels unfairly. Normalizing for "average mileage" (e.g., 6k-14k/year) would provide a fairer comparison of value retention.

## 2026-01-03: Accuracy Check Integrity
- **Context**: Added when building the `MarketMetadata` component.
- **Why**: It reduces the risk of invalid verification. It is easy to accidentally compare a forecast for year X with historical data for year Y. Verification MUST ensure the ages match exactly.

## Pre-2025: Security Validation (Server-side)
- **Context**: The current implementation is a static site with client-side logic (e.g., PIN protection).
- **Why**: Client-side security is easily bypassed. If/when a real backend is introduced, all validation rules (PINs, inputs) must be re-implemented on the server.

## Pre-2025: Calculator Maintenance (Parity)
- **Context**: The codebase historically had split logic for "Simple" and "Complex" modes.
- **Why**: Although the UI is unified, we must ensure that any future "Pro" specific logic does not fundamentally diverge from the "Standard" calculation unless creating a distinct feature. Divergence creates hard-to-maintain bugs.

## Pre-2025: Image Attribution
- **Context**: Using Wikipedia/Commons images.
- **Why**: Legal compliance. If we continue using these free images, we are required to display author and license information, which is currently missing.

## Pre-2025: Replace Wikipedia Image Source
- **Context**: Currently fetching images from Wikipedia API.
- **Why**: Rate limits, hotlinking risks, and inconsistent image quality make this unsuitable for a production application.