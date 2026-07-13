# Dealer OS — Dynamic Order Bank Fix

Upload `index.html` to the root of the GitHub Pages repository.

## Added
- Order Bank upload.
- Scans the whole workbook for every `Orders after cancellations` table.
- Selects the H1 or H2 table containing the chosen month.
- Reads the current centre dynamically.
- July works for Rochdale (22 target, 14 orders, -8) and Silsden (9 target, 2 orders, -7) with the supplied workbook.
- August to December and January to June use the same dynamic logic.
