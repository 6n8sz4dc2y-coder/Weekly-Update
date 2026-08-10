## Order Bank Targets table now auto-rolls to the current month
- The Order Bank Targets table's "July Target/Done/Variance/To Go/Progress/%" columns were hardcoded to July. They now read off whatever month it currently is (e.g. "Aug Target/Done/..." in August), same logic already used to sort the table - no manual update needed each month.

## Reorder dashboard: Non-Counting Fleet Snapshot next to Q3 CDA Used Summary
- Non-Counting Fleet Snapshot now sits to the left of Q3 CDA Used Summary (Used moved right into its old spot).
- Centre Registration Targets now sits directly under Non-Counting Fleet Snapshot, and Used Car Snapshot sits directly under Q3 CDA Used Summary.

## Centre Fleet BCH card simplified
- Centre Fleet BCH KPI card no longer shows the big Regs number in the top-left - just the label, status badge, and the Target/Active orders/Expected achievement row underneath, matching the Order Bank card's layout.

## Swapped Q3 CDA Order/Used Summary card order
- Q3 CDA Order Summary now sits second (right after Q3 Registration CDA Summary), with Q3 CDA Used Summary moved down into its old spot.

## Moved CDA summary cards above the site-level cards
- Reordered the front dashboard so Q3 Registration CDA Summary, Q3 CDA Used Summary and Q3 CDA Order Summary now appear above Centre Registration Targets, Used Car Snapshot and Non-Counting Fleet Snapshot, instead of being interleaved with them.

## Inc O/A bar added to Q3 CDA Order Summary
- Added the same "Inc O/A" (registrations + over-achievement carry-over) treatment used on Q3 Registration CDA Summary to Q3 CDA Order Summary: each CDA row now shows a second bar alongside "Ord", plus the raw adjusted number as a text line, using the Previous Month Carry Over figures from the CDA SvO report (North 241, South 229, West Yorkshire 150).
- Like the registration adjustment, these are fixed figures from a separate manual report, not the order-bank.xlsx workbook - update them when a new report lands.

## Order Bank card simplified, fixed pace calc to use the month not the quarter
- Order Bank KPI card no longer shows the big total number or the Monthly target/To go/Progress row - just the "Behind pace"-style status badge next to the title and the Jul/Aug/Sep boxes underneath.
- Fixed the status badge's pace calculation: it was comparing the current month's actual vs target against how far through the *whole quarter* we were, which made it read far more "behind" than it really was. It now compares against how far through that *specific month* we are. For example, 9 days into a 31-day month, ~29% of the month has elapsed, not ~44% of the quarter - the badge will now sit closer to (and sometimes reach) amber earlier in a month than it did before.

## CDA "Inc O/A" wording, revert Sales Funnel to 3-box layout
- Renamed the CDA registration adjustment bar label from "+Adj" to "Inc O/A", and added the raw adjusted number (e.g. "Inc O/A 319 / 407") as a line under the existing QTR detail text.
- Reverted the dashboard Sales Funnel card back to the original 3-card row (Order Bank / Centre Fleet BCH / Sales Funnel) instead of full-width. Shrank the funnel table's font and padding further so all columns still fit without scrolling at the narrower width, on both desktop and mobile.

## Revert Order Bank Jul/Aug/Sep boxes to isolated per-month figures
- Reverted the cumulative carry-over calculation on the front-dashboard Order Bank KPI card's Jul/Aug/Sep boxes back to each month's own actual vs its own target, per feedback that the cumulative view read as wrong. Target/actual are read directly from the workbook per month; no carry-over applied here.
- Removed the "running total" explanatory note that's no longer accurate.

## Sales Funnel card: full width, no scroll needed
- Made the dashboard Sales Funnel KPI card full-width so its New/Used/Total table is visible at a glance without scrolling. Order Bank and Centre Fleet BCH now share a row at half-width each instead of the previous three-card row.
- Shortened column headers (Enq, TD, OS, Conv, Ord) so the table also fits without scrolling on mobile.

## Fix Order Bank quarterly target bug, add CDA registration Adjustment bar
- Fixed a real bug in parseOrderWorkbook: the Q1-Q4/CY26 target table parser scanned every row in the whole sheet for a valid centre name in column A, which also matches every row in the monthly "Orders after cancellations" tables further down. Since the last matching row wins, q3_target ended up overwritten with a stray monthly figure instead of the real quarterly target - this is what caused Q3 CDA Order Summary to show 400%+ "progress" (e.g. NORTH CDA target of 36 instead of 415). The parser now stops at the first monthly block.
- Added a second "+Adj" bar to each CDA row in Q3 Registration CDA Summary, showing registrations plus the fixed Q1+Q2 over/under-achievement adjustment carried into Q3 (per the Toyota CDA SvO report), alongside the existing registrations-only bar.
- Hid the visible scrollbar on the dashboard Sales Funnel card's table (still scrolls, just no bar UI).

## Order Bank Jul/Aug/Sep boxes now show cumulative carry-over
- Added Jul/Aug/Sep boxes to the Order Bank KPI card, matching the box format used by the other primary cards.
- Each month shows running cumulative done vs cumulative target (not each month in isolation), since over/under-achievement carries forward to the next month in the real order bank position. Added a note explaining this.

## LY % column after Orders on the dashboard Sales Funnel card
- Added a second "LY %" column after Orders in the front-dashboard Sales Funnel KPI card, showing New/Used/Total orders growth vs last year, matching the existing LY % column after Enquiries.

## Orders clarity: TY/LY shown explicitly, dashboard Orders stat
- Sales Funnel tab's by-site Orders stat now shows both this year's and last year's order counts explicitly (TY/LY, same label pattern as the New/Used/Total bars), not just the TY number and a %.
- Widened the Orders column so the count and % badge don't run together.
- Added an Orders column to the front-dashboard Sales Funnel KPI card's New/Used/Total table, after Conversion, giving the same New/Used split as the other columns.

## By-site YoY comparison: ranked, New/Used/Total bars, Orders stat
- "Enquiries vs Last Year by Site" now ranks centres by Total enquiries YoY growth (best first) instead of raw TY volume.
- Each centre row now shows three separate TY/LY bar pairs — New, Used and Total — instead of just Total.
- Added an Orders stat (this year's order count + % vs last year) to each row.

## Last-year sales funnel (LY %) + by-site comparison
- Added a fourth weekly workbook, `sales-activity-ly.xls`, alongside weekly-update.xlsx, sales-activity.xls and order-bank.xlsx. Same layout as sales-activity.xls, one year behind. Replace it each week like the other three.
- Sales Funnel KPI card on the front dashboard gains an "LY %" column showing enquiry growth/decline vs the same period last year, for New, Used and Total.
- Added an "Enquiries vs Last Year by Site" visual to the Sales Funnel tab: a two-bar (TY/LY) comparison per centre with a % change, sorted by this year's volume.
- Admin Update tab gains a 4th upload card for the LY file, wired into both the live GitHub auto-load and the manual Preview Import flow.
- Cleaned up a pre-existing bug: the entire admin-import section of app.js (helpers, parsers, preview/publish) was duplicated wholesale, and the later, incomplete copy was silently winning — Preview Import ignored the Order Bank Targets file and Publish re-registered its button listeners on every click. Removed the dead duplicate and fixed the listener bug while wiring in the new file.

## Pace-coloured progress bars in report tables
- Extended the pace-based bar colouring (from the front dashboard) to the Progress column in Q3 Registrations, Used Cars, Fleet and Centre Fleet BCH tables. These bars previously coloured off raw progress-to-target, which could show red/amber even when the row's own Status badge said "On pace" — they now use the same pace ratio as that badge.

## Cache-busting + per-month variance columns in report tables
- Bumped the styles.css/app.js/pptxgen.bundle.js cache-busting version strings (were stuck on the 21 July release) and added no-cache meta tags to index.html, so browsers stop serving stale cached copies of the dashboard outside of incognito.
- Added a Variance column beside each month's Total/Target (or Used/Target, Total/Budget) pair in the Q3 Registrations, Used Cars, Non-Counting Fleet and Q2 Reference tables, showing actual minus target for that month, coloured green when on/ahead and red when behind.
- Coloured the existing H1/H2/monthly Diff columns in the Orders tables the same way, and added a July Variance column to the main Order Bank table.

## Colour-coded target vs actual table columns
- Table columns ending in "Target" or "Budget" are now shaded blue, and their paired actual columns (Total/Used/Fleet/Regs/Orders/Done) shaded green, across all detail tables (Q3 Registrations, Used Cars, Fleet, Non-Counting Fleet, Orders, Q2 Reference) so they're easy to tell apart at a glance.
- Tables with no target concept (Sales Funnel activity) are unaffected.

## Removed enquiry-efficiency forecast
- Removed the "Forecast based on enquiry efficiency" line from the Q3 Used Cars card. Group forecast remains.

## PowerPoint export fix + enquiry-efficiency forecast correction
- Fixed Export PowerPoint button: it was crashing on every click due to a call to a non-existent `efficiencyGrade` function in the Sales Funnel Efficiency League slide builder (should have been `funnelGrade`).
- Fixed the "Forecast based on enquiry efficiency" calculation on the Q3 Used Cars card: it now projects actual quarter-to-date used cars plus (current used enquiry volume × conversion rate × weeks remaining in Q3), giving a genuine "how many deals will we finish on" projection instead of a flat weekly-rate extrapolation.

## Sales Funnel enquiries + used car enquiry-efficiency forecast
- Sales Funnel card now shows an Enquiries column alongside Test Drive/Offer Sheet/Conversion for New, Used and Total.
- Q3 Used Cars card gains a second forecast line under "Group forecast": "Forecast based on enquiry efficiency", projecting the full quarter from the current period's used enquiry volume and conversion rate.

## Front dashboard layout update
- Sales Funnel KPI card now shows New / Used / Total split for Test Drive, Offer Sheet and Conversion rates.
- Renamed "Q3 CDA Summary" to "Q3 Registration CDA Summary".
- Added a new "Q3 CDA Used Summary" box next to it, showing used car CDA totals.
- Added a new "Q3 CDA Order Summary" box next to Non-Counting Fleet Snapshot, showing order bank CDA totals against Q3 target.
- Hid the Executive Note card.
- Moved Highlights to a full-width card at the bottom of the dashboard.

## Front dashboard bar colour matches pace
- Centre Registration Targets, Used Car Snapshot and Q3 CDA Summary progress bars on the front dashboard now colour green/amber/red based on pace status, matching the "On pace / Slightly behind / Behind pace" badge shown next to them.
- Bar length still reflects actual progress against the full target; only the colour source changed.
- Detail tables in other tabs are unchanged.

# Version 1.9 – Fleet Expected Achievement

- Centre Fleet BCH dashboard card now shows Expected Achievement.
- Expected Achievement is calculated as (registrations + active orders) / target.
- Fleet status and pace now use registrations plus active orders.
- Fleet table uses the same calculation for percentage, progress and status.
- Trends remains removed.

# Changelog

## Full Order Bank import fix
- Restored the working dashboard build.
- Added a dynamic parser for both H1 and H2 `Orders after cancellations` blocks.
- Reads Target, Orders and Difference for every month from January to December.
- Added full July-December Target / Done / Diff columns to the Order Bank report.
- Keeps blank future orders blank in the source data while displaying them as zero for calculations.


## Board Pack Generator
- Added local PowerPoint engine (`pptxgen.bundle.js`) so the Generate Board Pack button works without relying on the CDN.
- Generates a native editable PowerPoint board pack from the live dashboard data.
- Keeps the existing dashboard, South CDA, Denton fleet snapshot, efficiency league and used forecast work.

## Run-rate logic update
- Q3 Registrations and Used Cars now use expected MTD pace for RAG/progress colouring.
- Required weekly run rate remains visible as information, not the colour driver.
- Added Expected MTD to Q3 and Used tables.
## Sortable tables
- Added click-to-sort table headers across dashboard tables.
- Click a header once to sort high-to-low, click again to reverse.
## PDF export button visible
- Added Export PDF button to the header and Admin Update.
- Added print styling to preserve dashboard colours.
## Sales Funnel Efficiency Update
- Added Sales Funnel Efficiency League.
- Added weighted score: Test Drive Rate 25%, Offer Sheet Rate 35%, Conversion 40%.
- Added Best Conversion, Best Test Drive Rate and Best Offer Sheet Rate cards.
- Ensured South Manchester centres are included in dashboard activity when workbook data is present.
## South CDA fleet snapshot patch
- Added Denton into the front dashboard Non-Counting Fleet Snapshot.
- No other dashboard layout or workbook-reading changes made.
## v2.0
- Added Trends tab.
- Added weekly history engine using `history.js`.
- Added Best Performance and Biggest Opportunity trend summaries.
- Added centre momentum table.
- Kept root-file GitHub Pages structure.
## v0.9.3
- Fixed front-page Non-Counting Fleet KPI to use NORTH CDA and WY CDA total rows only, avoiding double-counting source rows.
## Run rate font fix
- Fixed run-rate display so it appears as `38 / week` on one line with matching KPI colour and font.
## KPI progress update
- Kept the existing root-file GitHub Pages build.
- Updated the three main dashboard boxes to show current-month %, Q3 total %, Jul/Aug/Sep progress, remaining volume and weekly run rate required.
- No folder structure changes.
## Q2 South + Progress Revert
- Added South Manchester CDA to the Q2 Reference registration and used-car tables.
- Restored dashboard registration/used snapshot bars to show actual progress against full target.
- Removed Expected MTD and pace bars from the main Q3/Used tables; pace status remains as a separate indicator.
## Used Forecast View
- Added Used Cars forecast finish and forecast % based on current quarter run rate.
- Used status now reflects forecast finish vs Q3 target rather than colouring the progress bar.
- Kept dashboard progress bars showing actual progress against full target.
## Used forecast amber/status update
- Added amber `Slightly behind` status band for Used Cars forecast.
- Added required weekly used car run rate column.
- Kept progress bars as actual vs full target.
## v1.7 – Centre Fleet BCH active orders fix
- Corrected Centre Fleet BCH Active Orders mapping to read column F from the weekly workbook.
- Included the latest weekly-update.xlsx supplied by the user.
- Bradford now reads 9 active orders; Group total reads 14 active orders from the supplied workbook.

## v1.10
- Added coloured pace badges to the New Registrations and Used Cars centre rows on the main dashboard.
- Registration badges use the existing registration pace calculation.
- Used badges use the existing forecast pace calculation.

## Simple PowerPoint export fix
- Replaced the previous Board Pack button wording with Export PowerPoint.
- Fixed PowerPoint export to use the correct browser constructor from `pptxgen.bundle.js`.
- Added visible export status/error messages in Admin Update.
- Kept the export simple and reliable: Dashboard, Registrations, Used, Fleet, Order Bank, Sales Funnel Volume and Efficiency.
