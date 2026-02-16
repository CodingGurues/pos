import { execute, query } from './db.js';
import { formatCurrency, showToast } from './ui.js';

export function renderCustomers(root, onChange, confirmAction) {
  const customers = query('SELECT * FROM customers ORDER BY id DESC');

  root.innerHTML = `
    <article class="card">
      <div class="section-head"><h3>Add Customer</h3></div>
      <form id="customer-form" class="form-grid">
        <input name="name" placeholder="Name" required />
        <input name="phone" placeholder="Phone" />
        <input name="email" placeholder="Email" type="email" />
        <input name="address" placeholder="Address" />
        <button class="btn btn-primary" type="submit">Add Customer</button>
      </form>
    </article>
    <article class="card" style="margin-top:1rem;">
      <div class="section-head"><h3>Customers</h3></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Contacts</th><th>Total Purchases</th><th>Due Amount</th><th>History</th><th>Action</th></tr></thead>
          <tbody>
            ${customers
              .map(
                (c) => `<tr>
                  <td>${c.name}</td>
                  <td>${c.phone || '-'}<br/><small class="muted">${c.email || ''}</small></td>
                  <td>${formatCurrency(c.total_purchases)}</td>
                  <td>${formatCurrency(c.due_amount)}</td>
                  <td><button class="btn btn-secondary" data-history="${c.id}">View</button></td>
                  <td><button class="btn btn-secondary" data-delete="${c.id}">Delete</button></td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </article>
  `;

  root.querySelector('#customer-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    execute('INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)', [
      data.get('name'),
      data.get('phone'),
      data.get('email'),
      data.get('address'),
    ]);
    showToast('Customer added', 'success');
    onChange();
  });

  root.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!(await confirmAction({ heading: 'Delete customer', body: 'Remove this customer profile?' }))) return;
      execute('DELETE FROM customers WHERE id = ?', [Number(button.dataset.delete)]);
      showToast('Customer removed');
      onChange();
    });
  });

  root.querySelectorAll('[data-history]').forEach((button) => {
    button.addEventListener('click', () => {
      const rows = query(
        `SELECT i.id, i.date, i.total FROM invoices i WHERE i.customer_id = ? ORDER BY i.id DESC LIMIT 10`,
        [Number(button.dataset.history)]
      );
      const msg = rows.length
        ? rows.map((r) => `#${r.id} | ${r.date} | ${formatCurrency(r.total)}`).join('\n')
        : 'No purchases yet.';
      alert(msg);
    });
  });
}
