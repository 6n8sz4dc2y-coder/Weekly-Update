# RRG Group Dashboard

Root-file GitHub Pages dashboard.

Upload these files directly to the root of the repo:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`

This version keeps the existing style and adds richer KPI boxes for New Registrations, Used Cars and Non-Counting Fleet.


## v2.0 Trends
- Adds a Trends tab.
- Saves weekly snapshots in the browser.
- Admin Publish automatically saves a trend snapshot.
- Root files only for GitHub Pages.


## Board Pack Export
Upload `pptxgen.bundle.js` to the repo root along with the other files. The Generate Board Pack button uses this local file to create the PowerPoint.

## Programmes Hub
`programmes.html` is a second, linked dashboard for VCF (Value Chain Framework) service figures - Part Purchases, Accessory Purchases, Used Vehicles and Service Plans Plus - plus Group Trade Parts (SMROE). It's an annual programme, so the VCF figures cover two reporting periods (Year to Date and the current quarter) and two rollup levels (by Centre and by CDA); a period toggle switches Centre Detail and the rankings between the two, while the Dashboard's pillar cards always show both periods side by side. CDA figures live on the Dashboard as their own "CDA Rankings" cards rather than a separate tab. It mirrors the Weekly Update dashboard's look and admin-upload workflow via `service-app.js`. The two hubs cross-link from their nav bars with a prominent button.

Part Purchases, Accessory Purchases and Used Vehicles actuals are **run-rate** figures (projected from cars sold), not confirmed transaction totals; Service Plans Plus actuals are confirmed, so its status reads a plain Ahead/Behind rather than the hedged Watch state the run-rate pillars use. Target and SvO (Actual ÷ Target) are accurate to date for every pillar. This is called out on the dashboard itself.

Group Trade Parts is a separate, Group-level-only quarterly table (Q1-Q4 + Total) with no centre/CDA breakdown - SMROE sales out to date and forecast, target, achieved %, reward % and reward payable.

Upload these extra files directly to the root of the repo:

- `programmes.html`
- `service-app.js`
- `service-data.js` (Centre, Q3)
- `service-data-ytd.js` (Centre, Year to Date)
- `service-cda-data.js` (CDA, Q3)
- `service-cda-data-ytd.js` (CDA, Year to Date)
- `service-trade-parts-data.js` (Group Trade Parts)

The VCF parser groups columns dynamically from each workbook's "Export" sheet header rows, so if a pillar is added, removed or renamed later, no code changes are needed - just re-upload the affected file(s) and Publish from the Admin Update tab. `service-app.js` and `styles.css` are cache-busted via a `?v=` query string on their `<script>`/`<link>` tags in `index.html` and `programmes.html` - bump it on every edit to either file, or returning visitors' browsers may keep serving a stale cached copy.
