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

## Fleet percentage + Trends hidden
- Front-page Non-Counting Fleet Snapshot now displays achievement as a percentage of budget.
- Trends navigation and section are hidden; existing trend code is retained for possible future use.
