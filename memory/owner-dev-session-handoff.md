# TeleMapper Home Prototype — Session Handoff (June 8, 2026)

_New mobile prototype: `telemapper-home-prototype.html` (Apple Fitness–style landing redesign). Self-contained, no backend. Verified each change in headless Chrome before pushing; live on GH Pages._

## What Was Done This Session

### 1. ✅ Created the prototype (Apple Fitness "Summary" style)
Card-first landing reusing the chatbot mobile prototype's phone frame / status bar / map SVG. Header greeting, "Today" completion rings (Outreach / Talk To's / Sales), a "Continue Mapping" card, and a "Go To" card grid. Floating frosted tab bar; Home↔Map navigation.

### 2. ✅ Client Training snapshot + Bulletin Board + detail screen
- Added a 7-tile stat snapshot (Units/Lines/Activated/Pending/Port Issues/Cancelled/Disconnected) at the top of Home that opens a **Client Training detail screen** (identity card, stat grid, Weekly Activity bar charts).
- Tapping a weekly bar opens an **order-detail bottom sheet**.
- Added a **Bulletin Board** card for feature releases + promotions.

### 3. ✅ Fixed back button
Client Training back button didn't fire — the full-width `.ct-title` overlay was intercepting taps. Fixed with `pointer-events:none`. Found via headless-Chrome repro (inspection looked fine). See [[verify-prototypes-headless-chrome]].

### 4. ✅ Reworked navigation + cards
- Removed **Continue Mapping**; **Leads** (tab + card) now opens a **batch-picker sheet** → choosing a batch shows it on the map with a "Viewing: <batch>" banner.
- **Today** rings now open a detail screen: activity **funnel** (Outreach→Talk To's→Qualifying→Presentations→Closes→Sales) + avg-attempts breakdown.
- **Awards → Sales Board** (office leaderboard sheet). **Territory → Check In** (logs arrival time). **Reports → Counter** (interactive tally clicker for the six funnel categories). **Team** reframed as **manage your reps** (My Team sheet).

### 5. ✅ Goal-pacing on the completion rings
Rings + a new **Day Pace** visual (Today screen) are colored by pace toward an 8 PM goal over a 9 AM–8 PM workday: **light blue = ahead, green = on pace, amber = slightly behind, red = behind**. Day Pace shows a day timeline (now marker + time left) and per-metric bars with a "where you should be by now" line. Mock "now" = 4:42 PM to surface a spread of tiers.

### 6. ✅ Commits (all pushed to main)
`db81e19` create → `78e1a9b` client snapshot/bulletin/detail → `7b08016` back-button fix → `ef3e868` leads/today funnel → `df9b052` sales board/check-in → `c095934` team mgmt → `49474e6` counter → `28f080a` goal pacing → `d43f72d` light-blue ahead tier.

## Open Threads / Next Steps
- Counter and the Today funnel hold **separate** numbers — could wire the Counter to be the single source of truth so it updates the rings/funnel/Day Pace live.
- Pacing assumes a fixed 9 AM–8 PM window — could tie the start to the rep's **Check In** time.
- Goals are hardcoded (120/50/5) — per-rep or per-campaign later.
- Map batch selection only shows a banner — could render pins for the chosen batch.
- Rep rows in My Team / batch cards are static — could open individual detail/management views.

---

# Dashboard — Session Handoff (June 3, 2026)

_Rep-facing dashboard work (sales posting + teams). Older owner/NLR session log follows below._

## What Was Done This Session

### 1. ✅ Stopped leaderboard inflation from duplicate sales
**Problem:** Discord tightened webhook rate limits, so some sales stopped posting to the Discord channel despite being tracked. Reps used the Discord post as their confirmation and re-submitted the same sale over and over until it appeared — and `writeAddSale` appended a new row each time, inflating the leaderboard.

**Fix (server-side dedup, both `Code.gs` and `NdsCode.gs`):**
- New `_findDuplicateSale(sheet, email, campaign, body)` + `_saleDateKey(val)` helpers.
- `writeAddSale` checks for a duplicate before `appendRow`. On a match it returns `{ ok:true, duplicate:true, ... }` WITHOUT adding a row, and re-fires the webhook (the likely reason they re-submitted).
- Dedup key: **rep email + DSI** for AT&T B2B (keyed on rep so one rep's typo'd DSI can't block a different rep — explicit user requirement); **rep email + client name + date of sale** for Ooma.
- Lookup wrapped in try/catch → any failure returns "not a duplicate" so a real sale is never blocked.
- Client (`post-sale.js` / `nds-post-sale.js`): reads the `duplicate` flag and shows a distinct orange **"Already Logged"** ↺ success screen telling the rep their numbers weren't changed and not to re-submit.

**Verified** via a Node dry-run of the dedup helpers (mocked sheet): 11/11 cases — same rep+DSI blocked, different rep same/typo DSI allowed, Ooma same-day blocked / different-day allowed, blanks and empty sheet never block.

**Deliberately skipped:** an async webhook retry queue — user wanted minimal maintenance ("don't want to come back if it breaks").

### 2. ✅ Rebuilt the team emoji picker
**Problem:** Old picker showed 12 random emojis from an 80-emoji pool + a reroll button, so most emojis were unreachable ("not all emojis are there").
**Fix (`app.js`):** Replaced with a text input that accepts any emoji from the OS emoji keyboard / paste, plus a scrollable grid of the full curated set. New `isSingleEmoji()` validates via `Intl.Segmenter` (exactly one grapheme + actual emoji via `Extended_Pictographic`/regional-indicator) — rejects letters, digits, symbols, spaces, multi-emoji. Used by both the team-customize and teams-CRUD modals.

### 3. ✅ Pushed + deployed
- `1332560` Block duplicate sales to stop leaderboard inflation
- `6393c64` Replace random team-emoji picker with keyboard entry + full grid
- Frontend live on GH Pages. **User redeployed `Code.gs` + `NdsCode.gs` in the Apps Script editor** (backend doesn't deploy via Pages).

---

# Owner Dev Dashboard — Session Handoff (March 20, 2026)

## What Was Done This Session

### 1. ✅ Weekly Total Spend Fix (NationalCode.gs `readOwnerNlrData`)
**Problem:** The NLR sheet has TWO columns both labeled "Total Spend" — a per-ad spend column and a running total column on the far right. The `rowObj` loop overwrites duplicate keys, so `r['total spend']` was reading the running total (wrong) instead of the per-ad spend.
**Fix:** Added `_firstTotalSpend` tracking in `readOwnerNlrData` that keeps the FIRST "total spend" column index and explicitly stores it as `__totalSpend` in rowObj. The per-ad spend line (`var adSpend = num(r['total spend'])`) now uses `r['__totalSpend'] || r['total spend']`.

### 2. ✅ All Ads Now Showing in Breakdown
**Problem:** Rows where "Indeed Account" was empty (merged cells in sheet) were being skipped by `cell0 !== ''` condition.
**Fix:** Changed row detection to use `_rowHasAnyData()` helper that checks multiple columns (ad title, spend, applies, etc.) instead of requiring col A to be non-empty. Added carry-forward logic for account names from merged cells (`lastAccount`).

### 3. ✅ CPA/CPNS Fixed — Now Computed from Week Totals
**Problem:** Auto-detect numeric aggregation was SUMMING individual ad CPA/CPNS values instead of computing ratios.
**Fix:** After the auto-detect loop, override `summary.cpa` and `summary.cpns`:
```javascript
summary.cpa = wkApplies > 0 ? Math.round(wkSpend / wkApplies * 100) / 100 : 0;
summary.cpns = wkNS > 0 ? Math.round(wkSpend / wkNS * 100) / 100 : 0;
```

### 4. All changes pushed to git, need NationalCode.gs redeployment
- **ALWAYS edit existing deployment** (Manage deployments → pencil → new version). Never create new.

---

## What Still Needs Work

### A. NLR Report — Remaining Issues

#### A1. Plan Column Not Rendering in Ad Breakdown
- Data is being read (line 2567: `plan: String(r['plan'] || r['action'] || '').trim()`)
- Frontend `_buildAdBreakdown()` in `national-app.js` (line ~3497) needs to verify the Plan column is actually rendered in the table HTML
- Check if the ad breakdown table headers include "PLAN" and if rows render `ad.plan`

#### A2. Ad Breakdown Scrollability
- Verify the breakdown table is scrollable when many ads are present (17+ ads for multi-phase weeks)
- May need `overflow-x: auto` wrapper or `max-height` with `overflow-y: auto`

#### A3. NLR Tab Dropdown in Mappings Only Shows One Name
- Screenshot showed "Alex Vondra" as only option in the source tab dropdown
- Bug is likely in the RPC that fetches tab names from the NLR workbook (`odNlrTabs` action)
- Check `_openSearchDropdown()` population and the backend action that lists workbook tabs

### B. Office Health Tab — Internet/Wireless/DTV + Smart Goals

#### What Already Exists (Backend)
- `readNLRHeadcount()` — reads from NLR source, ALREADY detects Internet/Wireless/DTV/Goals columns
- `readLocalHeadcount()` — reads from `_B2B_Headcount` tab (10-col schema: Owner|Date|Active|Leaders|Dist|Training|Internet|Wireless|DTV|Goals)
- `importNLRHeadcount()` — syncs NLR → local tab (needs redeployment to use new schema)
- `updateHeadcountRow()` — writes cols C-F (Active, Leaders, Dist, Training)
- `updateProductionRow()` — writes cols G-J (Internet, Wireless, DTV, Goals)
- `_parseProductionGoals()` — smart parsing: goals string "40/20" mapped to active categories
- `_getActiveCategories()` — determines which of Internet/Wireless/DTV are active based on column presence

#### Smart Goal Parsing Logic
Goals column uses `/` separator. Not all offices track all 3 categories:
- If office has Internet + Wireless + DTV data → goals "40/20/10" → Internet=40, Wireless=20, DTV=10
- If office has Internet + DTV only (no Wireless data) → goals "40/20" → Internet=40, DTV=20
- `_parseProductionGoals(activeCategories, inet, wrls, dtv, goalsRaw)` handles this mapping

#### What Already Exists (Frontend — national-app.js)
- `renderHealthTab()` — renders headcount card, production cards, goals input
- `_renderHeadcountTrend()` — bar chart + editable table
- `_renderProductionTrend()` — bar chart + editable table
- `_submitHeadcount()` — LOCAL ONLY, no backend call (needs fix)

#### What's Missing (Frontend)
- `_submitHeadcount()` needs backend POST call to NationalCode.gs `updateHeadcount`
- `_submitProduction()` function doesn't exist yet — need to create it
- `_onProdTableEdit()` handler for inline production trend edits doesn't exist
- Need to verify production cards render per-category correctly when not all 3 exist

#### User said: Do NOT use campaign tracker tabs
- `parseSection1()` / `loadOwnerFromCampaignTracker()` are DEAD CODE — old approach
- Active data path: NLR Workbooks → `readNLRHeadcount()` → `importNLRHeadcount()` → `_B2B_Headcount` → `readLocalHeadcount()` → `_enrichOwnersWithNLR()`

#### Refresh Button Question
- User asked if pressing refresh on campaign will fix data via correct path
- Need to verify what the refresh button triggers — if it calls `importNLRHeadcount()`, then yes
- Check the button's onclick handler in owner-dev.html or national-app.js

### C. New Tableau Report Pull (for Owner Dev Dashboard)

#### Context
Need to create a tableau-style order/device report for the OD dashboard, similar to what exists in the office dashboards.

#### Existing Tableau Pattern (Office Dashboard — Code.gs + orders.js)
The office dashboard has a mature tableau report with:

**Backend (Code.gs):**
- `readTableauSummary()` — reads `_TableauOrderLog` tab, groups by DSI, aggregates by rep
- `readTableauDetail(dsi)` — returns device-level detail for a single DSI
- Uses `TOL_HEADER_MAP` for flexible column matching (70+ recognized headers)
- Caches with 6-hour TTL
- Returns: `{ dsiSummary: {}, repSummary: {}, churnReport: {} }`

**Frontend (orders.js):**
- `fetchOrders()` → attaches tableau data via DSI join: `order.tableau = App.state.tableauDsi[order.dsi]`
- `_getEffectiveStatus()` — priority: manual override → Tableau-derived → default
- `_remapDeviceStatuses()` — normalizes device statuses by product type
- `_renderOrderRows()` — table with columns: Rep, DSI, Date, Products, Status, Notes, Actions
- `toggleDrillDown(dsi)` — inline expand showing SPE-level detail (Product, Status, Device, Install Date)
- Notes modal, edit modal, ticket system

**Key Pattern to Replicate:**
1. Server-side: flexible header parsing → group by key → aggregate → cache
2. Client-side: join orders with tableau detail in memory → filter/sort pipeline → render rows
3. Drill-down: inline SPE/device-level detail table
4. Status: multi-source determination (manual override > derived > default)

**HTML Structure:**
- Full-page overlay with filter controls (search, rep, date, status, product dropdowns)
- Scrollable table with sticky header
- Note modal, edit modal, ticket system

#### What Needs to Be Built for OD
- Determine what data source the OD tableau will read from (owner-level order log? Aggregated from office sheets?)
- Build NationalCode.gs endpoint (similar to `readTableauSummary`)
- Build frontend renderer in owner-dev-app.js (similar to orders.js pattern)
- Add HTML overlay in owner-dev.html

---

## Key File Locations
| File | Purpose |
|------|---------|
| `NationalCode.gs` | Backend — all OD data reads/writes |
| `js/owner-dev-app.js` | Frontend — OD app controller + rendering (formerly national-app.js for OD) |
| `js/owner-dev-config.js` | OD config |
| `owner-dev.html` | OD HTML structure |
| `js/national-app.js` | National dashboard (shared rendering helpers used by OD) |
| `Code.gs` | Office dashboard backend (reference for tableau pattern) |
| `js/orders.js` | Office orders module (reference for tableau pattern) |

## Deployment Notes
- NationalCode.gs: **Edit existing deployment → new version** (never create new)
- GitHub Pages: `git push` to main (deploys in ~1-2 min)
- **ALWAYS PUSH** — user tests from live GitHub Pages, not localhost
- Browser caching issue — always hard refresh (Cmd+Shift+R) after pushes
