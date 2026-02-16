import { query } from './db.js';
import { formatCurrency } from './ui.js';

let salesChart;

export function renderReports(root) {
  const daily = query(`SELECT date, ROUND(SUM(total),2) as total FROM invoices GROUP BY date ORDER BY date DESC LIMIT 7`).reverse();
  const monthly = query(`SELECT substr(date,1,7) as month, ROUND(SUM(total),2) as total FROM invoices GROUP BY month ORDER BY month DESC LIMIT 6`).reverse();
  const topProducts = query(
    `SELECT p.name, COALESCE(SUM(ii.quantity),0) as sold_qty, COALESCE(SUM(ii.quantity*ii.price),0) as revenue
     FROM products p LEFT JOIN invoice_items ii ON ii.product_id=p.id GROUP BY p.id ORDER BY sold_qty DESC LIMIT 8`
  );
  const lowStock = query('SELECT name, quantity, low_stock_threshold FROM products WHERE quantity <= low_stock_threshold ORDER BY quantity');
  const profit = query(`SELECT ROUND(COALESCE(SUM(profit),0),2) as p FROM invoices`)[0]?.p || 0;

  root.innerHTML = `
    <div class="grid-cards">
      <article class="card"><h3>Daily Sales (7d)</h3><div class="kpi">${formatCurrency(daily.reduce((acc, d) => acc + Number(d.total), 0))}</div></article>
      <article class="card"><h3>Monthly Sales (6m)</h3><div class="kpi">${formatCurrency(monthly.reduce((acc, d) => acc + Number(d.total), 0))}</div></article>
      <article class="card"><h3>Total Profit</h3><div class="kpi">${formatCurrency(profit)}</div></article>
      <article class="card"><h3>Low Stock Count</h3><div class="kpi">${lowStock.length}</div></article>
    </div>
    <div class="layout-2">
      <article class="card">
        <h3>Sales Trend</h3>
        <canvas id="sales-chart" height="120"></canvas>
      </article>
      <article class="card">
        <h3>Low Stock Report</h3>
        <ul>
          ${lowStock.length ? lowStock.map((l) => `<li>${l.name} — ${l.quantity} left (threshold ${l.low_stock_threshold})</li>`).join('') : '<li>All products are healthy.</li>'}
        </ul>
      </article>
    </div>
    <article class="card" style="margin-top:1rem;">
      <h3>Product Performance Report</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Sold Qty</th><th>Revenue</th></tr></thead>
          <tbody>
            ${topProducts.map((p) => `<tr><td>${p.name}</td><td>${p.sold_qty}</td><td>${formatCurrency(p.revenue)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;

  const ctx = root.querySelector('#sales-chart');
  if (salesChart) salesChart.destroy();
  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: daily.map((d) => d.date),
      datasets: [{ label: 'Sales', data: daily.map((d) => d.total), tension: 0.35, borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,.2)', fill: true }],
    },
    options: { responsive: true, plugins: { legend: { display: false } } },
  });
}
