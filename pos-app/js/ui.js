const toastContainer = () => document.getElementById('toast-container');

export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderLeftColor = type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#4f46e5';
  toast.textContent = message;
  toastContainer().appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

export function statusBadge(qty, threshold) {
  if (qty <= 0) return '<span class="status-chip out-stock">Out of Stock</span>';
  if (qty <= threshold) return '<span class="status-chip low-stock">Low Stock</span>';
  return '<span class="status-chip in-stock">In Stock</span>';
}

export function bindConfirmModal() {
  const modal = document.getElementById('confirm-modal');
  const title = document.getElementById('confirm-title');
  const message = document.getElementById('confirm-message');
  const cancel = document.getElementById('confirm-cancel');
  const ok = document.getElementById('confirm-ok');

  return ({ heading, body }) =>
    new Promise((resolve) => {
      title.textContent = heading;
      message.textContent = body;
      modal.classList.remove('hidden');
      const close = (answer) => {
        modal.classList.add('hidden');
        cancel.removeEventListener('click', onCancel);
        ok.removeEventListener('click', onOk);
        resolve(answer);
      };
      const onCancel = () => close(false);
      const onOk = () => close(true);
      cancel.addEventListener('click', onCancel);
      ok.addEventListener('click', onOk);
    });
}

export function downloadBlob(filename, bytes) {
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
