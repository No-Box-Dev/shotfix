/**
 * Trigger button — lightning bolt pill, bottom right, opens activity sidebar
 */

const LIGHTNING_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
</svg>
`;

let triggerButton = null;

export function formatShortcut(sc) {
  const isMac = /mac/i.test(navigator.userAgent);
  const parts = [];
  if (sc.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
  if (sc.meta) parts.push(isMac ? '⌘' : 'Win');
  if (sc.shift) parts.push(isMac ? '⇧' : 'Shift');
  if (sc.key) parts.push(sc.key.toUpperCase());
  return isMac ? parts.join('') : parts.join('+');
}

function getSavedShortcutLabel() {
  try {
    const saved = localStorage.getItem('shotfix-shortcut');
    if (saved) return formatShortcut(JSON.parse(saved));
  } catch {}
  return formatShortcut({ key: 'e', meta: true, shift: true, ctrl: false });
}

/**
 * Create the floating trigger button
 * @param {Function} onClick - Callback when button is clicked
 */
export function createTrigger(onClick) {
  if (triggerButton) return triggerButton;

  const shortcut = getSavedShortcutLabel();

  triggerButton = document.createElement('button');
  triggerButton.className = 'shotfix-trigger';
  triggerButton.innerHTML = `${LIGHTNING_ICON}<kbd>${shortcut}</kbd>`;
  triggerButton.setAttribute('aria-label', `Shotfix (${shortcut})`);

  triggerButton.addEventListener('click', () => {
    onClick();
  });

  document.body.appendChild(triggerButton);
  return triggerButton;
}

/**
 * Update the shortcut label on the trigger button
 * @param {string} label - Formatted shortcut string
 */
export function updateTriggerShortcut(label) {
  if (!triggerButton) return;
  const kbd = triggerButton.querySelector('kbd');
  if (kbd) kbd.textContent = label;
  triggerButton.setAttribute('aria-label', `Shotfix (${label})`);
}
