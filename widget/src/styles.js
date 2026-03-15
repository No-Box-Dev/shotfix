/**
 * Shotfix styles - injected into page
 */

const CSS = `
/* Trigger pill — bottom right */
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

.shotfix-trigger-active {
  opacity: 1;
  background: #8560e6;
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

.shotfix-overlay-selected {
  cursor: default;
  background: rgba(0, 0, 0, 0.35);
}

/* Instruction banner */
.shotfix-banner {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(26, 26, 46, 0.92);
  backdrop-filter: blur(8px);
  color: white;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  z-index: 2147483647;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  animation: shotfix-banner-in 0.25s ease;
  pointer-events: none;
}

.shotfix-banner-icon {
  font-size: 15px;
}

.shotfix-banner kbd {
  background: rgba(255, 255, 255, 0.12);
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-family: inherit;
  margin-left: 4px;
  opacity: 0.7;
}

.shotfix-banner-hidden {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

@keyframes shotfix-banner-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Element tag tooltip */
.shotfix-tag {
  position: fixed;
  display: none;
  background: rgba(26, 26, 46, 0.88);
  color: #c4b5fd;
  font-size: 11px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  padding: 2px 8px;
  border-radius: 4px;
  pointer-events: none;
  z-index: 2147483647;
  white-space: nowrap;
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

/* ── Activity sidebar ── */
.shotfix-activity {
  position: fixed;
  top: 0;
  right: -180px;
  width: 180px;
  height: 100vh;
  background: #1a1a2e;
  color: #e0e0e0;
  z-index: 2147483645;
  transition: right 0.25s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 12px rgba(0,0,0,0.2);
  font-size: 12px;
}

.shotfix-activity-open {
  right: 0;
}

.shotfix-sidebar-is-open {
  margin-right: 180px;
  transition: margin-right 0.25s ease;
}

.shotfix-activity-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.shotfix-activity-close {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}

.shotfix-activity-close:hover {
  color: white;
}

.shotfix-tabs {
  display: flex;
  gap: 2px;
  flex: 1;
}

.shotfix-tab {
  background: none;
  border: none;
  color: rgba(255,255,255,0.45);
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  padding: 3px 8px;
  border-radius: 5px;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.shotfix-tab:hover {
  color: rgba(255,255,255,0.7);
}

.shotfix-tab-active {
  color: white;
  background: rgba(255,255,255,0.1);
}

.shotfix-tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.shotfix-settings {
  padding: 14px 12px;
  overflow-y: auto;
}

.shotfix-setting-group {
  margin-bottom: 20px;
}

.shotfix-setting-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  margin-bottom: 8px;
}

.shotfix-shortcut-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.06);
  border-radius: 8px;
  padding: 10px 14px;
}

.shotfix-shortcut-keys {
  font-size: 14px;
  font-weight: 600;
  color: #f0f0f0;
  font-family: -apple-system, BlinkMacSystemFont, monospace;
}

.shotfix-shortcut-edit {
  background: rgba(155, 120, 244, 0.2);
  color: #c4b5fd;
  border: none;
  font-size: 12px;
  font-family: inherit;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.shotfix-shortcut-edit:hover {
  background: rgba(155, 120, 244, 0.35);
}

.shotfix-shortcut-recorder {
  background: rgba(255,255,255,0.06);
  border-radius: 8px;
  padding: 14px;
}

.shotfix-recorder-box {
  text-align: center;
  font-size: 13px;
  color: #ccc;
  padding: 16px;
  border: 1px dashed rgba(155, 120, 244, 0.4);
  border-radius: 8px;
  margin-bottom: 10px;
}

.shotfix-recorder-box.shotfix-recording {
  border-color: #9B78F4;
  color: #9B78F4;
  animation: shotfix-pulse-border 1.5s ease infinite;
}

@keyframes shotfix-pulse-border {
  0%, 100% { border-color: rgba(155, 120, 244, 0.4); }
  50% { border-color: #9B78F4; }
}

.shotfix-recorder-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.shotfix-recorder-actions button {
  background: none;
  border: 1px solid rgba(255,255,255,0.15);
  color: #aaa;
  font-size: 12px;
  font-family: inherit;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.shotfix-recorder-actions button:hover {
  color: white;
  border-color: rgba(255,255,255,0.3);
}

.shotfix-activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #555;
  flex-shrink: 0;
}

.shotfix-dot-live {
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e;
}

.shotfix-dot-pulse {
  animation: shotfix-pulse 0.6s ease;
}

@keyframes shotfix-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.8); }
  100% { transform: scale(1); }
}

.shotfix-activity-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.shotfix-activity-entry {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  animation: shotfix-slidein 0.2s ease;
  align-items: center;
}

@keyframes shotfix-slidein {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.shotfix-entry-icon {
  flex-shrink: 0;
  width: 16px;
  text-align: center;
  font-size: 12px;
  line-height: 16px;
}

.shotfix-entry-body {
  min-width: 0;
}

.shotfix-entry-title {
  font-size: 11px;
  color: #f0f0f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shotfix-entry-meta {
  font-size: 10px;
  color: #888;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shotfix-entry-expand {
  margin-left: auto;
  color: #666;
  font-size: 14px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
  transition: color 0.15s;
}

.shotfix-activity-entry:hover .shotfix-entry-expand {
  color: #ccc;
}

.shotfix-entry-detail {
  padding: 6px 12px 10px 36px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  animation: shotfix-slidein 0.15s ease;
}

.shotfix-detail-file {
  font-size: 12px;
  color: #c4b5fd;
  font-family: 'SF Mono', Monaco, monospace;
  margin-bottom: 4px;
}

.shotfix-detail-stats {
  font-size: 11px;
  color: #888;
  margin-bottom: 8px;
}

.shotfix-revert-btn {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
  font-size: 12px;
  font-family: inherit;
  padding: 5px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.shotfix-revert-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.4);
}

.shotfix-revert-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.shotfix-cancel-btn {
  margin-left: auto;
  background: none;
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  font-size: 11px;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;
  font-family: inherit;
}

.shotfix-cancel-btn:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.5);
}

.shotfix-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(155, 120, 244, 0.3);
  border-top-color: #9B78F4;
  border-radius: 50%;
  animation: shotfix-spin 0.6s linear infinite;
}

@keyframes shotfix-spin {
  to { transform: rotate(360deg); }
}
`;

export function injectStyles() {
  if (document.getElementById('shotfix-styles')) return;

  const style = document.createElement('style');
  style.id = 'shotfix-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}
