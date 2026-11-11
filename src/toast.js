// Tiny dismissible notice (plain text only, so server-supplied messages can never inject markup).
export function toast(msg) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = String(msg).slice(0, 240);
  d.addEventListener('click', () => d.remove());
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 8000);
}
