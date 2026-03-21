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
  flex: 1;
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
  padding: 4px 0;
}

/* ── Session cards ── */
.shotfix-session-card {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
  transition: background 0.15s;
  align-items: center;
}

.shotfix-session-card:hover {
  background: rgba(255,255,255,0.06);
}

.shotfix-session-active {
  background: rgba(155, 120, 244, 0.12);
  border-left: 2px solid #9B78F4;
}

.shotfix-session-thumb {
  width: 32px;
  height: 24px;
  border-radius: 3px;
  object-fit: cover;
  flex-shrink: 0;
  background: rgba(255,255,255,0.06);
}

.shotfix-session-thumb-empty {
  width: 32px;
  height: 24px;
  border-radius: 3px;
  flex-shrink: 0;
  background: rgba(255,255,255,0.06);
}

.shotfix-session-body {
  min-width: 0;
  flex: 1;
}

.shotfix-session-title {
  font-size: 11px;
  color: #f0f0f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.shotfix-session-meta {
  font-size: 10px;
  color: #888;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
}

.shotfix-session-status {
  display: inline-flex;
  align-items: center;
}

.shotfix-empty {
  padding: 20px 12px;
  text-align: center;
  color: #666;
  font-size: 11px;
  line-height: 1.5;
}

/* ── Provider settings ── */
.shotfix-provider-selector {
  display: flex;
  gap: 4px;
}

.shotfix-provider-btn {
  flex: 1;
  padding: 7px 4px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: #aaa;
  font-size: 11px;
  font-family: inherit;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.shotfix-provider-btn:hover {
  background: rgba(255,255,255,0.1);
  color: #ddd;
}

.shotfix-provider-active {
  background: rgba(155, 120, 244, 0.2);
  border-color: #9B78F4;
  color: #c4b5fd;
}

.shotfix-model-dropdown {
  width: 100%;
  padding: 7px 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: #e0e0e0;
  font-size: 11px;
  font-family: inherit;
  border-radius: 6px;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}

.shotfix-model-dropdown option {
  background: #1a1a2e;
  color: #e0e0e0;
}

.shotfix-key-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.shotfix-key-input {
  flex: 1;
  padding: 7px 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: #e0e0e0;
  font-size: 11px;
  font-family: 'SF Mono', Monaco, monospace;
  border-radius: 6px;
  outline: none;
}

.shotfix-key-input:focus {
  border-color: rgba(155, 120, 244, 0.5);
}

.shotfix-key-status {
  font-size: 14px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.shotfix-key-set {
  color: #22c55e;
}

.shotfix-key-save {
  width: 100%;
  padding: 6px 12px;
  background: rgba(155, 120, 244, 0.15);
  color: #c4b5fd;
  border: 1px solid rgba(155, 120, 244, 0.25);
  font-size: 12px;
  font-family: inherit;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.shotfix-key-save:hover {
  background: rgba(155, 120, 244, 0.25);
}

.shotfix-key-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Directory path + copy */
.shotfix-dir-display {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.06);
  border-radius: 8px;
  padding: 8px 10px;
}

.shotfix-dir-path {
  font-size: 11px;
  font-family: 'SF Mono', Monaco, monospace;
  color: #c4b5fd;
  flex: 1;
}

.shotfix-dir-copy {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.shotfix-dir-copy:hover {
  opacity: 1;
}

/* Settings description text */
.shotfix-setting-desc {
  font-size: 11px;
  color: #888;
  margin-bottom: 8px;
  line-height: 1.4;
}

/* CLAUDE.md button */
.shotfix-claudemd-btn {
  background: rgba(155, 120, 244, 0.15);
  color: #c4b5fd;
  border: 1px solid rgba(155, 120, 244, 0.25);
  font-size: 12px;
  font-family: inherit;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  width: 100%;
}

.shotfix-claudemd-btn:hover {
  background: rgba(155, 120, 244, 0.25);
}

/* Modal overlay */
.shotfix-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  animation: shotfix-fade-in 0.15s ease;
}

@keyframes shotfix-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.shotfix-modal {
  background: #1a1a2e;
  border-radius: 12px;
  width: 520px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  animation: shotfix-scale-in 0.15s ease;
}

@keyframes shotfix-scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.shotfix-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.shotfix-modal-title {
  font-size: 14px;
  font-weight: 600;
  color: white;
  font-family: 'SF Mono', Monaco, monospace;
}

.shotfix-modal-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}

.shotfix-modal-close:hover {
  color: white;
}

.shotfix-modal-editor {
  flex: 1;
  min-height: 300px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border: none;
  color: #e0e0e0;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 12px;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.shotfix-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.shotfix-modal-cancel {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #aaa;
  font-size: 12px;
  font-family: inherit;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.shotfix-modal-cancel:hover {
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.shotfix-modal-save {
  background: #9B78F4;
  color: white;
  border: none;
  font-size: 12px;
  font-family: inherit;
  padding: 6px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.15s;
}

.shotfix-modal-save:hover {
  background: #8560e6;
}

.shotfix-modal-save:disabled {
  opacity: 0.6;
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

/* ── Chat panel ── */
.shotfix-chat {
  position: fixed;
  top: 0;
  right: -340px;
  width: 340px;
  height: 100vh;
  background: #16162a;
  color: #e0e0e0;
  z-index: 2147483644;
  transition: right 0.25s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 16px rgba(0,0,0,0.3);
  font-size: 13px;
}

.shotfix-chat-open {
  right: 180px;
}

.shotfix-chat-is-open {
  margin-right: 520px;
  transition: margin-right 0.25s ease;
}

.shotfix-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  gap: 10px;
}

.shotfix-chat-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.shotfix-chat-thumb {
  width: 28px;
  height: 20px;
  border-radius: 3px;
  object-fit: cover;
  flex-shrink: 0;
  cursor: pointer;
}

.shotfix-chat-title {
  font-size: 12px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shotfix-chat-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.5);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  flex-shrink: 0;
}

.shotfix-chat-close:hover {
  color: white;
}

/* Messages */
.shotfix-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shotfix-chat-msg {
  max-width: 90%;
  animation: shotfix-msg-in 0.15s ease;
}

@keyframes shotfix-msg-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.shotfix-chat-msg-user {
  align-self: flex-end;
}

.shotfix-chat-msg-user .shotfix-chat-msg-text {
  background: #9B78F4;
  color: white;
  border-radius: 12px 12px 2px 12px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.4;
}

.shotfix-chat-msg-assistant {
  align-self: flex-start;
}

.shotfix-chat-msg-assistant .shotfix-chat-msg-text {
  background: rgba(255,255,255,0.08);
  color: #e0e0e0;
  border-radius: 12px 12px 12px 2px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.4;
}

.shotfix-chat-msg-time {
  font-size: 10px;
  color: #666;
  margin-top: 2px;
  padding: 0 4px;
}

.shotfix-chat-msg-user .shotfix-chat-msg-time {
  text-align: right;
}

/* Typing indicator */
.shotfix-chat-typing {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  color: #888;
  font-size: 12px;
  animation: shotfix-fade-in 0.15s ease;
}

/* Diff view */
.shotfix-chat-diff {
  margin-top: 6px;
}

.shotfix-chat-diff summary {
  font-size: 11px;
  color: #9B78F4;
  cursor: pointer;
  padding: 2px 0;
}

.shotfix-chat-diff summary:hover {
  color: #c4b5fd;
}

.shotfix-chat-diff-code {
  margin-top: 4px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 11px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre;
}

.shotfix-diff-del {
  color: #f87171;
  display: block;
}

.shotfix-diff-add {
  color: #4ade80;
  display: block;
}

/* Input bar */
.shotfix-chat-input-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
  background: rgba(0, 0, 0, 0.15);
}

.shotfix-chat-input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: #e0e0e0;
  font-size: 12px;
  font-family: inherit;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s;
}

.shotfix-chat-input:focus {
  border-color: rgba(155, 120, 244, 0.5);
}

.shotfix-chat-input::placeholder {
  color: #666;
}

.shotfix-chat-send {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #9B78F4;
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}

.shotfix-chat-send:hover {
  background: #8560e6;
}

.shotfix-chat-send:disabled {
  background: #555;
  cursor: not-allowed;
}

.shotfix-chat-send svg {
  width: 14px;
  height: 14px;
}
`;

export function injectStyles() {
  if (document.getElementById('shotfix-styles')) return;

  const style = document.createElement('style');
  style.id = 'shotfix-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}
