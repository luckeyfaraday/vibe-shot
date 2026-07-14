const captureButton = document.querySelector('#capture-button');
const captureStatus = document.querySelector('#capture-status');
const captureList = document.querySelector('#capture-list');
const emptyState = document.querySelector('#empty-state');
const count = document.querySelector('#capture-count');
const clearButton = document.querySelector('#clear-button');
const template = document.querySelector('#capture-template');
const toast = document.querySelector('#toast');
let toastTimer;

function showToast(message, isError = false) {
  if (!message) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 1900);
}

function elapsedTime(isoDate) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(isoDate).getTime()) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function captureCard(capture) {
  const card = template.content.firstElementChild.cloneNode(true);
  const image = card.querySelector('img');
  image.src = capture.imageUrl;
  image.alt = `${capture.fileName}, ${capture.width} by ${capture.height} pixels`;
  image.addEventListener('dragstart', (event) => {
    event.preventDefault();
    window.vibeshot.startDrag(capture.id);
  });

  card.querySelector('.capture-name').textContent = capture.fileName;
  card.querySelector('.capture-details').textContent = `${capture.width} × ${capture.height} · ${elapsedTime(capture.createdAt)}`;
  card.querySelector('.copy-button').addEventListener('click', async () => {
    await window.vibeshot.copy(capture.id);
    showToast('Copied image to clipboard');
  });
  card.querySelector('.reveal-button').addEventListener('click', () => window.vibeshot.reveal(capture.id));
  card.querySelector('.remove-button').addEventListener('click', () => window.vibeshot.remove(capture.id));
  return card;
}

function render(state) {
  captureButton.disabled = state.isCapturing;
  captureStatus.textContent = state.isCapturing ? 'Select a region…' : 'Ready';
  document.querySelector('.status-dot').title = state.isCapturing ? 'Capturing' : 'Ready';
  document.querySelector('#shortcut').textContent = state.shortcut.replaceAll('+', ' ');
  count.textContent = state.captures.length;
  emptyState.hidden = state.captures.length > 0;
  clearButton.hidden = state.captures.length === 0;
  captureList.replaceChildren(...state.captures.map(captureCard));
  if (state.notice) showToast(state.notice);
  if (state.error) showToast(state.error, true);
}

captureButton.addEventListener('click', () => window.vibeshot.capture('region'));
document.querySelectorAll('.mode-button').forEach((button) => {
  button.addEventListener('click', () => window.vibeshot.capture(button.dataset.mode));
});
document.querySelector('#folder-button').addEventListener('click', () => window.vibeshot.openFolder());
document.querySelector('#hide-button').addEventListener('click', () => window.vibeshot.hide());
clearButton.addEventListener('click', () => window.vibeshot.clear());
window.vibeshot.onState(render);

