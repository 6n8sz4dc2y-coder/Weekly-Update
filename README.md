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


## Weekly manual data update

1. Open the live dashboard.
2. Go to Admin Update.
3. Upload Weekly Update, Sales Activity and Order Bank files.
4. Click Preview, then Publish.
5. Click Download data.js.
6. In GitHub, replace only data.js in the repository root.
7. Commit and wait 1-2 minutes for GitHub Pages to refresh.
8. Test in an Incognito/InPrivate window before sending the link.

The site now reads data.js first. Browser local storage will not override published GitHub data.
