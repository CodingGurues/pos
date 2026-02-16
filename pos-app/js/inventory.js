import { execute, query } from './db.js';
import { formatCurrency, showToast, statusBadge } from './ui.js';

export function renderInventory(root, onChange, confirmAction) {
  const products = query(`SELECT p.*, v.name AS vendor_name FROM products p LEFT JOIN vendors v ON v.id=p.vendor_id ORDER BY p.id DESC`);
  const vendors = query('SELECT * FROM vendors ORDER BY name');

  root.innerHTML = `
    <article class="card">
      <div class="section-head"><h3>Add Product</h3></div>
      <form id="product-form" class="form-grid">
        <input name="name" placeholder="Product Name" required />
        <input name="sku" placeholder="SKU" required />
        <input name="category" placeholder="Category" />
        <input name="cost_price" placeholder="Cost Price" type="number" step="0.01" required />
        <input name="sale_price" placeholder="Sale Price" type="number" step="0.01" required />
        <input name="quantity" placeholder="Quantity" type="number" required />
        <select name="vendor_id"><option value="">Select Vendor</option>${vendors.map((v) => `<option value="${v.id}">${v.name}</option>`)}</select>
        <input name="low_stock_threshold" placeholder="Low Stock Threshold" type="number" value="5" />
        <button class="btn btn-primary" type="submit">Add Product</button>
      </form>
    </article>

    <article class="card" style="margin-top:1rem;">
      <div class="section-head"><h3>Stock Inventory</h3></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>SKU</th><th>Pricing</th><th>Qty</th><th>Vendor</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${products
              .map(
                (p) => `<tr>
                  <td>${p.name}<br/><small class="muted">${p.category || '-'}</small></td>
                  <td>${p.sku}</td>
                  <td>${formatCurrency(p.cost_price)} / ${formatCurrency(p.sale_price)}</td>
                  <td>${p.quantity}</td>
                  <td>${p.vendor_name || '-'}</td>
                  <td>${statusBadge(p.quantity, p.low_stock_threshold)}</td>
                  <td class="actions">
                    <button class="btn btn-secondary" data-edit="${p.id}">Edit</button>
                    <button class="btn btn-secondary" data-delete="${p.id}">Delete</button>
                  </td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;

  root.querySelector('#product-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    execute(
      'INSERT INTO products (name, sku, category, cost_price, sale_price, quantity, vendor_id, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.get('name'),
        data.get('sku'),
        data.get('category'),
        Number(data.get('cost_price')),
        Number(data.get('sale_price')),
        Number(data.get('quantity')),
        data.get('vendor_id') || null,
        Number(data.get('low_stock_threshold') || 5),
      ]
    );
    showToast('Product added', 'success');
    onChange();
  });

  root.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!(await confirmAction({ heading: 'Delete product', body: 'This action cannot be undone.' }))) return;
      execute('DELETE FROM products WHERE id = ?', [Number(btn.dataset.delete)]);
      showToast('Product deleted');
      onChange();
    });
  });

  root.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.edit);
      const p = products.find((x) => Number(x.id) === id);
      const quantity = prompt(`Update quantity for ${p.name}`, p.quantity);
      if (quantity === null) return;
      execute('UPDATE products SET quantity = ? WHERE id = ?', [Number(quantity), id]);
      showToast('Quantity updated', 'success');
      onChange();
    });
  });
}
