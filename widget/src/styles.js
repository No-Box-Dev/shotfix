/**
 * Shotfix styles - injected into page
 */

const CSS = `
/* Trigger pill — top right */
.shotfix-trigger {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 2147483647;
  background: #9B78F4;
  color: white;
  border: none;
  height: 36px;
  padding: 0 14px 0 12px;
  border-radius: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  transition: background 0.2s ease, opacity 0.2s ease;
  opacity: 0.85;
}

.shotfix-trigger:hover {
  opacity: 1;
  background: #8560e6;
}

.shotfix-trigger svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.shotfix-trigger kbd {
  font-family: inherit;
  font-size: 11px;
  opacity: 0.75;
}

/* ── Quick capture: live purple overlay ── */
.shotfix-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2147483646;
  background: rgba(155, 120, 244, 0.08);
  cursor: crosshair;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Hover highlight — follows mouse over elements */
.shotfix-hover {
  position: fixed;
  display: none;
  border: 2px solid #9B78F4;
  background: rgba(155, 120, 244, 0.12);
  border-radius: 3px;
  pointer-events: none;
  transition: left 0.05s, top 0.05s, width 0.05s, height 0.05s;
  z-index: 2147483646;
}

/* Selected element highlight */
.shotfix-selected {
  position: fixed;
  border: 2px solid #9B78F4;
  background: rgba(155, 120, 244, 0.18);
  border-radius: 3px;
  pointer-events: none;
  box-shadow: 0 0 0 1px rgba(155, 120, 244, 0.3);
}

/* Floating bar — positioned near selected element */
.shotfix-bar {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border-radius: 12px;
  padding: 6px 6px 6px 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(155, 120, 244, 0.25);
  z-index: 2147483647;
  pointer-events: auto;
  cursor: default;
}

.shotfix-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  background: #fafafa;
  min-width: 200px;
}

.shotfix-input:focus {
  border-color: #9B78F4;
  box-shadow: 0 0 0 3px rgba(155, 120, 244, 0.15);
  background: white;
}

.shotfix-send {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #9B78F4;
  color: white;
  border: none;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}

.shotfix-send:hover {
  background: #8560e6;
}

.shotfix-send:disabled {
  background: #c4b5e3;
  cursor: not-allowed;
}

.shotfix-success {
  padding: 8px 20px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #22c55e;
  white-space: nowrap;
}
`;

export function injectStyles() {
  if (document.getElementById('shotfix-styles')) return;

  const style = document.createElement('style');
  style.id = 'shotfix-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}
