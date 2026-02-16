import { execute, query } from './db.js';
import { formatCurrency, showToast } from './ui.js';

export function renderVendors(root, onChange, confirmAction) {
  const vendors = query('SELECT * FROM vendors ORDER BY id DESC');
  const products = query('SELECT id, name FROM products ORDER BY name');

  root.innerHTML = `
    <article class="card">
      <div class="section-head"><h3>Add Vendor</h3></div>
      <form id="vendor-form" class="form-grid">
        <input name="name" placeholder="Vendor Name" required />
        <input name="phone" placeholder="Phone" />
        <input name="email" placeholder="Email" type="email" />
        <input name="address" placeholder="Address" />
        <button class="btn btn-primary" type="submit">Add Vendor</button>
      </form>
    </article>
    <article class="card" style="margin-top:1rem;">
      <div class="section-head"><h3>Vendor Purchase Entry (Restock)</h3></div>
      <form id="purchase-form" class="form-grid">
        <select name="vendor_id" required><option value="">Select vendor</option>${vendors.map((v) => `<option value="${v.id}">${v.name}</option>`)}</select>
        <select name="product_id" required><option value="">Select product</option>${products.map((p) => `<option value="${p.id}">${p.name}</option>`)}</select>
        <input name="quantity" type="number" placeholder="Quantity" required />
        <input name="cost_price" type="number" step="0.01" placeholder="Cost price" required />
        <button class="btn btn-primary" type="submit">Record Purchase</button>
      </form>
    </article>
    <article class="card" style="margin-top:1rem;">
      <div class="section-head"><h3>Vendors</h3></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Contact</th><th>Total Purchase</th><th>History</th><th>Action</th></tr></thead>
          <tbody>
            ${vendors
              .map(
                (v) => `<tr>
                  <td>${v.name}</td><td>${v.phone || '-'}<br/><small class="muted">${v.email || ''}</small></td>
                  <td>${formatCurrency(v.total_purchase_amount)}</td>
                  <td><button class="btn btn-secondary" data-history="${v.id}">View</button></td>
                  <td><button class="btn btn-secondary" data-delete="${v.id}">Delete</button></td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;

  root.querySelector('#vendor-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    execute('INSERT INTO vendors (name, phone, email, address) VALUES (?, ?, ?, ?)', [
      data.get('name'),
      data.get('phone'),
      data.get('email'),
      data.get('address'),
    ]);
    showToast('Vendor added', 'success');
    onChange();
  });

  root.querySelector('#purchase-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const quantity = Number(data.get('quantity'));
    const costPrice = Number(data.get('cost_price'));
    const total = quantity * costPrice;
    const vendorId = Number(data.get('vendor_id'));
    const productId = Number(data.get('product_id'));
    execute('INSERT INTO vendor_purchases (vendor_id, product_id, quantity, cost_price, total, date) VALUES (?, ?, ?, ?, ?, ?)', [
      vendorId,
      productId,
      quantity,
      costPrice,
      total,
      new Date().toISOString().slice(0, 10),
    ]);
    execute('UPDATE products SET quantity = quantity + ?, cost_price = ? WHERE id = ?', [quantity, costPrice, productId]);
    execute('UPDATE vendors SET total_purchase_amount = total_purchase_amount + ? WHERE id = ?', [total, vendorId]);
    showToast('Vendor purchase recorded & stock increased', 'success');
    onChange();
  });

  root.querySelectorAll('[data-history]').forEach((button) => {
    button.addEventListener('click', () => {
      const rows = query(
        `SELECT vp.date, p.name, vp.quantity, vp.total FROM vendor_purchases vp
         LEFT JOIN products p ON p.id=vp.product_id WHERE vendor_id=? ORDER BY vp.id DESC LIMIT 10`,
        [Number(button.dataset.history)]
      );
      alert(rows.length ? rows.map((r) => `${r.date} | ${r.name} | ${r.quantity} | ${formatCurrency(r.total)}`).join('\n') : 'No history');
    });
  });

  root.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!(await confirmAction({ heading: 'Delete vendor', body: 'Delete vendor profile from list?' }))) return;
      execute('DELETE FROM vendors WHERE id = ?', [Number(button.dataset.delete)]);
      showToast('Vendor removed');
      onChange();
    });
  });
}
