/**
 * Trigger button — lightning bolt on right edge
 */

const LIGHTNING_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
</svg>
`;

let triggerButton = null;

/**
 * Create the floating trigger button
 * @param {Function} onCapture - Callback when clicked
 */
export function createTrigger(onCapture) {
  if (triggerButton) return triggerButton;

  const isMac = /mac/i.test(navigator.userAgent);
  const shortcut = isMac ? '⌘⇧E' : 'Ctrl+Shift+E';

  triggerButton = document.createElement('button');
  triggerButton.className = 'shotfix-trigger';
  triggerButton.innerHTML = `${LIGHTNING_ICON}<kbd>${shortcut}</kbd>`;
  triggerButton.setAttribute('aria-label', `Shotfix capture (${shortcut})`);

  triggerButton.addEventListener('click', () => {
    onCapture();
  });

  document.body.appendChild(triggerButton);
  return triggerButton;
}
