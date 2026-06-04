# Chatbot Prototype — Session Handoff (May 22, 2026)

## What Was Done This Session

### 1. Created `chatbot-prototype.html`
Self-contained mock of the "Ownerville" screenshot (the page the user wants to evaluate a chatbot on top of). Sidebar nav, dark topbar, apps grid, promo banners, setup cards, and announcements section — no backend.

### 2. Built three chatbot variants, then trimmed to two families
First pass (`62f35c2`) shipped V1 Floating, V2 Side Panel, V3 Bottom Drawer with a flat picker. User kept V1/V2, rejected V3 drawer.

Second pass (`1627569`) replaced V3 drawer with a new **Logo Bubble** family (V3 Floating + V4 Side Panel) and regrouped the picker into two sections:

- **Chat Icon** (generic SVG bubble)
  - V1 Floating — draggable + resizable, bottom-right
  - V2 Side Panel — slide-in from right, full height, darker navy header
- **Logo Bubble** (new)
  - V3 Floating, V4 Side Panel — reuse V1/V2 containers but with a speech-bubble-shaped FAB that holds a rotating company logo

### 3. Logo rotation system
- Subscribers (FABs + chat header avatars) share a single rotator that picks a random logo on load and crossfades every 3.5s, never repeating consecutively.
- Logos: `references/logos/smartcircle-logo.png`, `applicantstream-symbol.png`, `aptel-symbol-black.png`.
- Copied the first two into `references/logos/` from `~/Desktop/`.

### 4. Assistant identity
"Omni Assistant" across all variants. First-open shows the thinking dots → greeting sequence; subsequent user messages get placeholder bot replies.

### 5. Pushed to `main`
- `62f35c2` Add chatbot prototype with V1/V2/V3 variant toggle
- `1627569` Replace V3 drawer with logo-bubble variant family (V3/V4)

Live at `https://aptel-ai.github.io/dashboard/chatbot-prototype.html`.

### 6. Created `chatbot-prototype-mobile.html`
iPhone-framed mock of a TeleMapper map screen — Dynamic Island + status bar, profile avatar, right-side control stack (Layers/Near Me/Rotate/Refresh/Territory/Location), curved street SVG with labels and building blocks, blue location dot, bottom nav (Leads/Reports/ticket/bell/More), version footer. **TeleMapper logo removed**; chat FAB takes its bottom-right spot.

Two minimizable variants:
- **V1 · Bottom Sheet** — 75% height, drag handle, app peek above
- **V2 · Full Screen** — slides up below the status bar; status bar text auto-flips white when V2 is open and back to dark when closed/minimized

Mobile FAB always uses the Logo Bubble style (smaller dimensions, ~64×56). Reuses the same `createLogoRotator` for FAB + chat header avatar + bot message avatars.

### 7. Added Surface row to variant picker
Both prototypes now expose a top "Surface" group with Desktop / Mobile anchor buttons. Clicking the inactive surface navigates between the two files. Picker JS scoped to `.variant-btn[data-variant]` so the anchor tags don't trigger setActive logic.

### 8. Additional pushes
- `a29d738` Add mobile chatbot prototype (V1 bottom sheet, V2 full screen)
- `12f2577` Add Surface row to variant picker for Desktop↔Mobile switch

Mobile live at `https://aptel-ai.github.io/dashboard/chatbot-prototype-mobile.html`.

---

## Open Threads / Next Steps

### Visual polish (not yet asked, but plausible next)
- Logos are different aspect ratios — the colored Smart Circle reads larger than the Aptel symbol inside the FAB. Could normalize visual weight by tweaking per-logo padding/scale.
- The speech-bubble FAB tail uses a CSS triangle with a `drop-shadow` on the parent — looks fine but the tail's edge is slightly sharper than the bubble corners. Acceptable for prototype.
- Variant picker visually overlaps with V3/V4 floating windows if those are dragged toward the bottom-left. Picker has higher z-index, so it floats over — fine for prototype.

### Behavior tweaks worth considering
- Per-variant `hasGreeted` resets when you switch families. Conversation history persists per variant only as long as the page is loaded.
- No localStorage for selected variant; reloading always starts on V1.

### Possible new variant families (each would ship as floating + side-panel pair)
- Themed/branded styles (e.g., light mode vs. dark mode header)
- Compact mode (smaller widget for in-context use)

---

## Key File Locations
| File | Purpose |
|------|---------|
| `chatbot-prototype.html` | Desktop prototype (HTML + CSS + JS inline) |
| `chatbot-prototype-mobile.html` | Mobile prototype, iPhone-framed TeleMapper mock |
| `references/logos/smartcircle-logo.png` | Logo asset (full color round logo) |
| `references/logos/applicantstream-symbol.png` | Logo asset (blue S sphere) |
| `references/logos/aptel-symbol-black.png` | Existing project logo, reused |

## Working Tree Notes
Three unrelated deleted SVG files were already present in the working tree at session start (`references/oval-frame-source.svg`, `oval-mirror-cleaned.svg`, `oval-mirror-source.svg`). Not from this session; left untouched.
