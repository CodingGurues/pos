import { execute, query, queryOne, transaction } from './db.js';
import { formatCurrency, showToast } from './ui.js';

function invoiceRowTemplate(products) {
  return `
    <div class="form-grid invoice-row" style="margin-bottom:.6rem;">
      <select name="product_id" required><option value="">Product</option>${products
        .map((p) => `<option value="${p.id}" data-price="${p.sale_price}">${p.name} (${p.quantity})</option>`)
        .join('')}</select>
      <input name="quantity" type="number" min="1" value="1" required />
      <input name="price" type="number" step="0.01" placeholder="Unit price" required />
      <button type="button" class="btn btn-secondary row-remove">Remove</button>
    </div>
  `;
}

export function renderInvoices(root, onChange) {
  const products = query('SELECT * FROM products WHERE quantity > 0 ORDER BY name');
  const customers = query('SELECT * FROM customers ORDER BY name');
  const invoices = query(
    `SELECT i.*, COALESCE(c.name,'Walk-in') as customer FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id ORDER BY i.id DESC`
  );

  root.innerHTML = `
    <article class="card">
      <div class="section-head"><h3>Create Invoice</h3></div>
      <form id="invoice-form">
        <div class="form-grid" style="margin-bottom:.7rem;">
          <select name="customer_id"><option value="">Walk-in Customer</option>${customers.map((c) => `<option value="${c.id}">${c.name}</option>`)}</select>
          <input name="discount" type="number" step="0.01" value="0" placeholder="Discount" />
          <input name="tax" type="number" step="0.01" value="0" placeholder="Tax" />
          <input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" />
        </div>
        <div id="invoice-rows">${invoiceRowTemplate(products)}</div>
        <div class="actions" style="margin:.5rem 0;">
          <button id="add-item" class="btn btn-secondary" type="button">+ Add Item</button>
          <button class="btn btn-primary" type="submit">Save Invoice</button>
        </div>
        <p class="muted" id="calc-preview">Subtotal: $0 | Total: $0 | Profit: $0</p>
      </form>
    </article>

    <article class="card" style="margin-top:1rem;">
      <div class="section-head">
        <h3>Invoice History</h3>
        <input id="invoice-date-filter" type="date" />
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Date</th><th>Customer</th><th>Total</th><th>Profit</th><th>Print</th></tr></thead>
          <tbody id="invoice-history-body">
            ${historyRows(invoices)}
          </tbody>
        </table>
      </div>
    </article>
  `;

  const rowsContainer = root.querySelector('#invoice-rows');
  const preview = root.querySelector('#calc-preview');

  const bindRowBehavior = (row) => {
    const select = row.querySelector('select[name="product_id"]');
    const priceInput = row.querySelector('input[name="price"]');
    select.addEventListener('change', () => {
      const selected = select.options[select.selectedIndex];
      priceInput.value = selected.dataset.price || '';
      recalcPreview();
    });
    row.querySelectorAll('input,select').forEach((el) => el.addEventListener('input', recalcPreview));
    row.querySelector('.row-remove').addEventListener('click', () => {
      row.remove();
      recalcPreview();
    });
  };

  rowsContainer.querySelectorAll('.invoice-row').forEach(bindRowBehavior);
  root.querySelector('#add-item').addEventListener('click', () => {
    rowsContainer.insertAdjacentHTML('beforeend', invoiceRowTemplate(products));
    bindRowBehavior(rowsContainer.lastElementChild);
  });

  function recalcPreview() {
    let subtotal = 0;
    let profit = 0;
    rowsContainer.querySelectorAll('.invoice-row').forEach((row) => {
      const productId = Number(row.querySelector('select').value);
      const qty = Number(row.querySelector('input[name="quantity"]').value || 0);
      const price = Number(row.querySelector('input[name="price"]').value || 0);
      const product = products.find((p) => Number(p.id) === productId);
      subtotal += qty * price;
      profit += product ? qty * (price - Number(product.cost_price)) : 0;
    });
    const discount = Number(root.querySelector('input[name="discount"]').value || 0);
    const tax = Number(root.querySelector('input[name="tax"]').value || 0);
    const total = subtotal - discount + tax;
    preview.textContent = `Subtotal: ${formatCurrency(subtotal)} | Total: ${formatCurrency(total)} | Profit: ${formatCurrency(profit)}`;
  }

  root.querySelector('#invoice-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const customerId = formData.get('customer_id') ? Number(formData.get('customer_id')) : null;
    const discount = Number(formData.get('discount') || 0);
    const tax = Number(formData.get('tax') || 0);
    const date = formData.get('date');

    const items = [...rowsContainer.querySelectorAll('.invoice-row')].map((row) => ({
      productId: Number(row.querySelector('select').value),
      quantity: Number(row.querySelector('input[name="quantity"]').value),
      price: Number(row.querySelector('input[name="price"]').value),
    }));
    if (!items.length || items.some((x) => !x.productId || x.quantity <= 0)) {
      showToast('Please add valid invoice items', 'error');
      return;
    }

    let subtotal = 0;
    let profit = 0;
    for (const item of items) {
      const product = queryOne('SELECT * FROM products WHERE id = ?', [item.productId]);
      if (!product.id || product.quantity < item.quantity) {
        showToast(`Insufficient stock for ${product.name || 'selected item'}`, 'error');
        return;
      }
      subtotal += item.quantity * item.price;
      profit += item.quantity * (item.price - Number(product.cost_price));
    }
    const total = subtotal - discount + tax;

    transaction(() => {
      execute('INSERT INTO invoices (customer_id, date, subtotal, discount, tax, total, profit) VALUES (?, ?, ?, ?, ?, ?, ?)', [
        customerId,
        date,
        subtotal,
        discount,
        tax,
        total,
        profit,
      ]);
      const invoiceId = queryOne('SELECT last_insert_rowid() as id').id;

      items.forEach((item) => {
        const product = queryOne('SELECT * FROM products WHERE id = ?', [item.productId]);
        execute(
          'INSERT INTO invoice_items (invoice_id, product_id, quantity, price, cost) VALUES (?, ?, ?, ?, ?)',
          [invoiceId, item.productId, item.quantity, item.price, product.cost_price]
        );
        execute('UPDATE products SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.productId]);
      });

      if (customerId) {
        execute('UPDATE customers SET total_purchases = total_purchases + ? WHERE id = ?', [total, customerId]);
      }
    });

    showToast('Invoice saved & stock updated', 'success');
    onChange();
  });

  root.querySelector('#invoice-date-filter').addEventListener('change', (event) => {
    const val = event.target.value;
    const filtered = val ? invoices.filter((i) => i.date === val) : invoices;
    root.querySelector('#invoice-history-body').innerHTML = historyRows(filtered);
    attachPrintEvents(root);
  });

  attachPrintEvents(root);
  recalcPreview();
}

function historyRows(data) {
  if (!data.length) return '<tr><td colspan="6" class="muted">No invoices found.</td></tr>';
  return data
    .map(
      (i) => `<tr><td>#${i.id}</td><td>${i.date}</td><td>${i.customer}</td><td>${formatCurrency(i.total)}</td><td>${formatCurrency(i.profit)}</td><td><button class="btn btn-secondary" data-print="${i.id}">Print</button></td></tr>`
    )
    .join('');
}

function attachPrintEvents(root) {
  root.querySelectorAll('[data-print]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.print);
      const invoice = queryOne('SELECT * FROM invoices WHERE id = ?', [id]);
      const items = query(
        `SELECT p.name, ii.quantity, ii.price FROM invoice_items ii
         LEFT JOIN products p ON p.id=ii.product_id WHERE ii.invoice_id = ?`,
        [id]
      );
      const html = `
        <h2>MobileHub POS Invoice #${id}</h2>
        <p>Date: ${invoice.date}</p>
        <table border="1" cellspacing="0" cellpadding="5"><tr><th>Item</th><th>Qty</th><th>Price</th></tr>
        ${items.map((x) => `<tr><td>${x.name}</td><td>${x.quantity}</td><td>${formatCurrency(x.price)}</td></tr>`).join('')}
        </table>
        <h3>Total: ${formatCurrency(invoice.total)}</h3>
      `;
      const win = window.open('', '_blank');
      win.document.write(html);
      win.print();
    });
  });
}
