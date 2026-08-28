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
`programmes.html` is a second, linked dashboard for VCF (Value Chain Framework) service figures - Part Purchases, Accessory Purchases, Used Vehicles and Service Plans Plus. It's an annual programme, so it covers two reporting periods (Year to Date and the current quarter) and two rollup levels (by Centre and by CDA), with a period toggle at the top switching all three tabs (Dashboard, Centre Detail, CDA Summary) together. It mirrors the Weekly Update dashboard's look and admin-upload workflow via `service-app.js`. The two hubs cross-link from their headers with a prominent button.

Part Purchases, Accessory Purchases and Used Vehicles actuals are **run-rate** figures (projected from cars sold), not confirmed transaction totals; Service Plans Plus actuals are confirmed. Target and SvO (Actual ÷ Target) are accurate to date for every pillar. This is called out on the dashboard itself.

Upload these extra files directly to the root of the repo:

- `programmes.html`
- `service-app.js`
- `service-data.js` (Centre, Q3)
- `service-data-ytd.js` (Centre, Year to Date)
- `service-cda-data.js` (CDA, Q3)
- `service-cda-data-ytd.js` (CDA, Year to Date)

The parser groups columns dynamically from each workbook's "Export" sheet header rows, so if a pillar is added, removed or renamed later, no code changes are needed - just re-upload the affected file(s) and Publish from the Admin Update tab.
