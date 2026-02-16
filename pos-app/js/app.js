import { initDb, exportDatabase, importDatabase } from './db.js';
import { renderDashboard } from './dashboard.js';
import { renderInventory } from './inventory.js';
import { renderCustomers } from './customers.js';
import { renderInvoices } from './invoices.js';
import { renderVendors } from './vendors.js';
import { renderReports } from './reports.js';
import { bindConfirmModal, downloadBlob, showToast } from './ui.js';

const navItems = [
  ['dashboard', 'Dashboard'],
  ['inventory', 'Stock Management'],
  ['customers', 'Customers'],
  ['invoices', 'Invoices'],
  ['vendors', 'Vendors'],
  ['reports', 'Reports'],
];

let active = 'dashboard';

function mountNavigation() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = navItems
    .map(([key, label]) => `<button class="nav-link ${active === key ? 'active' : ''}" data-view="${key}">${label}</button>`)
    .join('');

  nav.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      active = btn.dataset.view;
      renderAll();
      mountNavigation();
    });
  });
}

function bindTopBar() {
  document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('mobilehub_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  });

  if (localStorage.getItem('mobilehub_theme') === 'dark') document.body.classList.add('dark');

  document.getElementById('db-export').addEventListener('click', () => {
    downloadBlob(`mobilehub-pos-${Date.now()}.sqlite`, exportDatabase());
    showToast('Database exported', 'success');
  });

  document.getElementById('db-import').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importDatabase(file);
    showToast('Database imported', 'success');
    renderAll();
  });

  document.getElementById('global-search').addEventListener('input', (event) => {
    const q = event.target.value.toLowerCase();
    document.querySelectorAll('tbody tr').forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

const confirmAction = bindConfirmModal();

function renderAll() {
  const roots = {
    dashboard: document.getElementById('dashboard-view'),
    inventory: document.getElementById('inventory-view'),
    customers: document.getElementById('customers-view'),
    invoices: document.getElementById('invoices-view'),
    vendors: document.getElementById('vendors-view'),
    reports: document.getElementById('reports-view'),
  };
  Object.entries(roots).forEach(([key, node]) => node.classList.toggle('active', key === active));

  renderDashboard(roots.dashboard);
  renderInventory(roots.inventory, renderAll, confirmAction);
  renderCustomers(roots.customers, renderAll, confirmAction);
  renderInvoices(roots.invoices, renderAll);
  renderVendors(roots.vendors, renderAll, confirmAction);
  renderReports(roots.reports);
}

async function boot() {
  await initDb();
  mountNavigation();
  bindTopBar();
  renderAll();
}

boot().catch((error) => {
  console.error(error);
  showToast('Failed to initialize app. Check console for details.', 'error');
});
