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

## Service Figures hub
`service.html` is a second, linked dashboard for VCF (Value Chain Framework) service figures - Part Purchases, Accessory Purchases, Used Vehicles and Service Plans by centre. It mirrors the Weekly Update dashboard's look and admin-upload workflow, but reads its own workbook (an "Export" sheet with a Centre column followed by pillar groups of Actual/Target/SvO columns) via `service-app.js`, with data persisted to `service-data.js`. The two hubs cross-link from their headers.

Upload these extra files directly to the root of the repo:

- `service.html`
- `service-app.js`
- `service-data.js`

The parser groups columns dynamically from the sheet's header rows, so if the export gains, loses or renames pillars later, no code changes are needed - just re-upload and Publish from the Admin Update tab.
