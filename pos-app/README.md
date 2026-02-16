# MobileHub POS (Client-side SaaS POS)

A pure front-end POS dashboard using HTML/CSS/Vanilla JS + SQLite in-browser via sql.js.

## Features
- Dashboard KPIs with real-time updates
- Inventory CRUD + stock status alerts
- Customer CRUD + purchase history lookup
- Invoice creation with automatic stock deduction and profit calculation
- Vendor CRUD + purchase restock workflow
- Reports with Chart.js (sales, profit, product performance, low stock)
- SQLite database persistence in browser + export/import backup
- Dark mode, toasts, confirm modal, responsive SaaS-style UI

## Run locally
Open `index.html` from a local static server (recommended), e.g.:

```bash
cd pos-app
python3 -m http.server 8080
```
Then open `http://localhost:8080`.
