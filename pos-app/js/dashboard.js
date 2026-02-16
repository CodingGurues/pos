import { query, queryOne } from './db.js';
import { formatCurrency } from './ui.js';

export function renderDashboard(root) {
  const stats = {
    sales: queryOne('SELECT COUNT(*) as v FROM invoices').v || 0,
    revenue: queryOne('SELECT COALESCE(SUM(total),0) as v FROM invoices').v || 0,
    profit: queryOne('SELECT COALESCE(SUM(profit),0) as v FROM invoices').v || 0,
    items: queryOne('SELECT COUNT(*) as v FROM products').v || 0,
    lowStock: queryOne('SELECT COUNT(*) as v FROM products WHERE quantity <= low_stock_threshold').v || 0,
    customers: queryOne('SELECT COUNT(*) as v FROM customers').v || 0,
    vendors: queryOne('SELECT COUNT(*) as v FROM vendors').v || 0,
  };

  const recent = query(
    `SELECT i.id, i.date, COALESCE(c.name, 'Walk-in') as customer, i.total
     FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id
     ORDER BY i.id DESC LIMIT 8`
  );

  root.innerHTML = `
    <div class="grid-cards">
      ${[
        ['Total Sales', stats.sales],
        ['Total Revenue', formatCurrency(stats.revenue)],
        ['Total Profit', formatCurrency(stats.profit)],
        ['Total Stock Items', stats.items],
        ['Low Stock Alerts', stats.lowStock],
        ['Total Customers', stats.customers],
        ['Total Vendors', stats.vendors],
      ]
        .map(([title, val]) => `<article class="card"><h3>${title}</h3><div class="kpi">${val}</div></article>`)
        .join('')}
    </div>
    <div class="layout-2">
      <article class="card">
        <div class="section-head"><h3>Recent Transactions</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Total</th></tr></thead>
            <tbody>
              ${
                recent.length
                  ? recent.map((r) => `<tr><td>#${r.id}</td><td>${r.date}</td><td>${r.customer}</td><td>${formatCurrency(r.total)}</td></tr>`).join('')
                  : '<tr><td colspan="4" class="muted">No transactions yet.</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </article>
      <article class="card">
        <h3>Health Check</h3>
        <p class="muted">Your inventory health is ${stats.lowStock > 0 ? 'attention needed' : 'excellent'}.</p>
        <ul>
          <li>Revenue trending from live invoices.</li>
          <li>Profit reflects product cost vs sold price.</li>
          <li>Low stock highlights replenishment needs.</li>
        </ul>
      </article>
    </div>
  `;
}
