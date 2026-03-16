/**
 * Activity sidebar — session list + settings (provider config, shortcuts)
 */

import { updateTriggerShortcut, formatShortcut } from './trigger.js';

let sidebar = null;
let eventSource = null;
let sessions = [];
let currentTab = 'activity';
let serverUrl = null;
let chatModule = null;
let activeSessionId = null;
let sseReconnectDelay = 1000;
let sseReconnectTimer = null;

// Default shortcut
const DEFAULT_SHORTCUT = { key: 'e', meta: true, shift: true, ctrl: false };
let shortcut = loadShortcut();

function loadShortcut() {
  try {
    const saved = localStorage.getItem('shotfix-shortcut');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { ...DEFAULT_SHORTCUT };
}

function saveShortcut(sc) {
  shortcut = sc;
  try { localStorage.setItem('shotfix-shortcut', JSON.stringify(sc)); } catch {}
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function relativeTime(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusIcon(status) {
  switch (status) {
    case 'pending': return '⏳';
    case 'fixing': return '<span class="shotfix-spinner"></span>';
    case 'fixed': return '✅';
    case 'error': return '❌';
    case 'chatting': return '<span class="shotfix-spinner"></span>';
    default: return '⚡';
  }
}

function createSidebar() {
  if (sidebar) return sidebar;

  sidebar = document.createElement('div');
  sidebar.className = 'shotfix-activity';
  sidebar.innerHTML = `
    <div class="shotfix-activity-header">
      <span class="shotfix-activity-dot"></span>
      <div class="shotfix-tabs">
        <button class="shotfix-tab shotfix-tab-active" data-tab="activity">Sessions</button>
        <button class="shotfix-tab" data-tab="settings">Settings</button>
      </div>
      <button class="shotfix-activity-close" aria-label="Close">&times;</button>
    </div>
    <div class="shotfix-tab-content shotfix-tab-activity">
      <div class="shotfix-activity-list"></div>
    </div>
    <div class="shotfix-tab-content shotfix-tab-settings" style="display:none">
      <div class="shotfix-settings">
        <div class="shotfix-setting-group">
          <label class="shotfix-setting-label">AI Provider</label>
          <div class="shotfix-provider-selector">
            <button class="shotfix-provider-btn" data-provider="gemini">Gemini</button>
            <button class="shotfix-provider-btn" data-provider="claude">Claude</button>
            <button class="shotfix-provider-btn" data-provider="openai">OpenAI</button>
          </div>
        </div>
        <div class="shotfix-setting-group">
          <label class="shotfix-setting-label">Model</label>
          <div class="shotfix-model-selector">
            <select class="shotfix-model-dropdown"></select>
          </div>
        </div>
        <div class="shotfix-setting-group">
          <label class="shotfix-setting-label">API Key</label>
          <div class="shotfix-key-input-row">
            <input type="password" class="shotfix-key-input" placeholder="Enter API key..." />
            <span class="shotfix-key-status"></span>
          </div>
          <button class="shotfix-key-save">Save Key</button>
        </div>
        <div class="shotfix-setting-group">
          <label class="shotfix-setting-label">Capture Shortcut</label>
          <div class="shotfix-shortcut-display">
            <span class="shotfix-shortcut-keys">${formatShortcut(shortcut)}</span>
            <button class="shotfix-shortcut-edit">Change</button>
          </div>
          <div class="shotfix-shortcut-recorder" style="display:none">
            <div class="shotfix-recorder-box">Press your new shortcut...</div>
            <div class="shotfix-recorder-actions">
              <button class="shotfix-recorder-cancel">Cancel</button>
              <button class="shotfix-recorder-reset">Reset to default</button>
            </div>
          </div>
        </div>
        <div class="shotfix-setting-group">
          <label class="shotfix-setting-label">Captures Directory</label>
          <div class="shotfix-dir-display">
            <code class="shotfix-dir-path">.shotfix/captures/</code>
            <button class="shotfix-dir-copy" title="Copy path">📋</button>
          </div>
        </div>
        <div class="shotfix-setting-group">
          <label class="shotfix-setting-label">CLAUDE.md</label>
          <p class="shotfix-setting-desc">Add context for AI assistants about your captures.</p>
          <button class="shotfix-claudemd-btn">Edit CLAUDE.md</button>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  sidebar.querySelectorAll('.shotfix-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Close button
  sidebar.querySelector('.shotfix-activity-close').addEventListener('click', () => {
    setSidebarOpen(false);
  });

  // Settings setup
  setupShortcutEditor();
  setupProviderSettings();

  // Copy directory path
  sidebar.querySelector('.shotfix-dir-copy').addEventListener('click', () => {
    const path = sidebar.querySelector('.shotfix-dir-path').textContent;
    navigator.clipboard.writeText(path).then(() => {
      const btn = sidebar.querySelector('.shotfix-dir-copy');
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = '📋'; }, 1500);
    });
  });

  // CLAUDE.md editor
  sidebar.querySelector('.shotfix-claudemd-btn').addEventListener('click', () => {
    openClaudeMdModal();
  });

  document.body.appendChild(sidebar);
  return sidebar;
}

function switchTab(tab) {
  currentTab = tab;
  sidebar.querySelectorAll('.shotfix-tab').forEach(t => {
    t.classList.toggle('shotfix-tab-active', t.dataset.tab === tab);
  });
  sidebar.querySelector('.shotfix-tab-activity').style.display = tab === 'activity' ? '' : 'none';
  sidebar.querySelector('.shotfix-tab-settings').style.display = tab === 'settings' ? '' : 'none';
}

// --- Session list ---

function renderSessions() {
  const list = sidebar.querySelector('.shotfix-activity-list');
  if (!list) return;

  if (sessions.length === 0) {
    list.innerHTML = '<div class="shotfix-empty">No sessions yet. Use the keyboard shortcut to capture.</div>';
    return;
  }

  list.innerHTML = '';
  for (const session of sessions) {
    const card = document.createElement('div');
    card.className = 'shotfix-session-card';
    if (session.id === activeSessionId) card.classList.add('shotfix-session-active');
    card.dataset.sessionId = session.id;

    const thumbUrl = session.hasScreenshot ? `${serverUrl}/sessions/${session.id}/screenshot` : '';

    card.innerHTML = `
      ${thumbUrl ? `<img class="shotfix-session-thumb" src="${thumbUrl}" alt="" />` : '<div class="shotfix-session-thumb-empty"></div>'}
      <div class="shotfix-session-body">
        <div class="shotfix-session-title">${escapeHtml(session.title)}</div>
        <div class="shotfix-session-meta">
          <span class="shotfix-session-status">${statusIcon(session.status)}</span>
          <span>${relativeTime(session.timestamp)}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openSessionChat(session.id));
    list.appendChild(card);
  }
}

async function fetchSessions() {
  try {
    const res = await fetch(`${serverUrl}/sessions?limit=50`);
    if (res.ok) {
      sessions = await res.json();
      renderSessions();
    }
  } catch {}
}

async function openSessionChat(sessionId) {
  activeSessionId = sessionId;
  renderSessions(); // Update active highlight

  // Lazy-load chat module
  if (!chatModule) {
    chatModule = await import('./chat.js');
    chatModule.setOnClose(() => {
      activeSessionId = null;
      renderSessions();
    });
  }

  chatModule.openChat(sessionId, serverUrl);
}

// --- Provider settings ---

let configData = null;

async function setupProviderSettings() {
  // Load config from server
  try {
    const res = await fetch(`${serverUrl}/config`);
    if (res.ok) {
      configData = await res.json();
      updateProviderUI();
    }
  } catch {}

  // Provider buttons
  sidebar.querySelectorAll('.shotfix-provider-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const provider = btn.dataset.provider;
      try {
        const res = await fetch(`${serverUrl}/config`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider }),
        });
        if (res.ok) {
          configData.provider = provider;
          configData.model = undefined;
          updateProviderUI();
        }
      } catch {}
    });
  });

  // Model dropdown
  sidebar.querySelector('.shotfix-model-dropdown').addEventListener('change', async (e) => {
    const model = e.target.value;
    try {
      await fetch(`${serverUrl}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: configData.provider, model }),
      });
      configData.model = model;
    } catch {}
  });

  // Save key
  sidebar.querySelector('.shotfix-key-save').addEventListener('click', async () => {
    const input = sidebar.querySelector('.shotfix-key-input');
    const key = input.value.trim();
    if (!key) return;

    const btn = sidebar.querySelector('.shotfix-key-save');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const res = await fetch(`${serverUrl}/config/keys`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: configData.provider, key }),
      });
      if (res.ok) {
        const data = await res.json();
        configData.keys = data.keys;
        input.value = '';
        updateKeyStatus();
        btn.textContent = 'Saved!';
        setTimeout(() => { btn.textContent = 'Save Key'; btn.disabled = false; }, 1500);
      } else {
        btn.textContent = 'Failed';
        setTimeout(() => { btn.textContent = 'Save Key'; btn.disabled = false; }, 2000);
      }
    } catch {
      btn.textContent = 'Failed';
      setTimeout(() => { btn.textContent = 'Save Key'; btn.disabled = false; }, 2000);
    }
  });
}

function updateProviderUI() {
  if (!configData) return;

  // Highlight active provider
  sidebar.querySelectorAll('.shotfix-provider-btn').forEach(btn => {
    btn.classList.toggle('shotfix-provider-active', btn.dataset.provider === configData.provider);
  });

  // Update model dropdown
  const dropdown = sidebar.querySelector('.shotfix-model-dropdown');
  const models = configData.models?.[configData.provider] || [];
  dropdown.innerHTML = models.map(m =>
    `<option value="${m}" ${m === configData.model ? 'selected' : ''}>${m}</option>`
  ).join('');

  // Update key status
  updateKeyStatus();
}

function updateKeyStatus() {
  if (!configData) return;
  const statusEl = sidebar.querySelector('.shotfix-key-status');
  const hasKey = configData.keys?.[configData.provider];
  statusEl.textContent = hasKey ? '✓' : '';
  statusEl.className = 'shotfix-key-status' + (hasKey ? ' shotfix-key-set' : '');
}

// --- Shortcut editor ---

function setupShortcutEditor() {
  const display = sidebar.querySelector('.shotfix-shortcut-display');
  const recorder = sidebar.querySelector('.shotfix-shortcut-recorder');
  const editBtn = sidebar.querySelector('.shotfix-shortcut-edit');
  const cancelBtn = sidebar.querySelector('.shotfix-recorder-cancel');
  const resetBtn = sidebar.querySelector('.shotfix-recorder-reset');
  const recorderBox = sidebar.querySelector('.shotfix-recorder-box');
  const keysDisplay = sidebar.querySelector('.shotfix-shortcut-keys');

  let handler = null;

  editBtn.addEventListener('click', () => {
    display.style.display = 'none';
    recorder.style.display = '';
    recorderBox.textContent = 'Press your new shortcut...';
    recorderBox.classList.add('shotfix-recording');

    handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (['Control', 'Shift', 'Meta', 'Alt'].includes(e.key)) return;

      const newShortcut = {
        key: e.key.toLowerCase(),
        meta: e.metaKey,
        shift: e.shiftKey,
        ctrl: e.ctrlKey,
      };

      saveShortcut(newShortcut);
      const label = formatShortcut(newShortcut);
      keysDisplay.textContent = label;
      updateTriggerShortcut(label);
      stopRecording();
    };
    document.addEventListener('keydown', handler, true);
  });

  cancelBtn.addEventListener('click', stopRecording);

  resetBtn.addEventListener('click', () => {
    saveShortcut({ ...DEFAULT_SHORTCUT });
    const label = formatShortcut(shortcut);
    keysDisplay.textContent = label;
    updateTriggerShortcut(label);
    stopRecording();
  });

  function stopRecording() {
    display.style.display = '';
    recorder.style.display = 'none';
    recorderBox.classList.remove('shotfix-recording');
    if (handler) {
      document.removeEventListener('keydown', handler, true);
      handler = null;
    }
  }
}

// --- CLAUDE.md modal ---

async function openClaudeMdModal() {
  let content = '';
  try {
    const res = await fetch(serverUrl + '/claude-md');
    if (res.ok) {
      const data = await res.json();
      content = data.content || '';
    }
  } catch {}

  if (!content) {
    content = '# Shotfix\n\nCheck `.shotfix/captures/latest.json` and `latest.png` for visual bug captures with screenshots and element metadata.\n';
  }

  const modal = document.createElement('div');
  modal.className = 'shotfix-modal-overlay';
  modal.innerHTML = `
    <div class="shotfix-modal">
      <div class="shotfix-modal-header">
        <span class="shotfix-modal-title">CLAUDE.md</span>
        <button class="shotfix-modal-close">&times;</button>
      </div>
      <textarea class="shotfix-modal-editor">${escapeHtml(content)}</textarea>
      <div class="shotfix-modal-footer">
        <button class="shotfix-modal-cancel">Cancel</button>
        <button class="shotfix-modal-save">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const textarea = modal.querySelector('.shotfix-modal-editor');
  textarea.value = content;
  textarea.focus();

  const close = () => modal.remove();

  modal.querySelector('.shotfix-modal-close').addEventListener('click', close);
  modal.querySelector('.shotfix-modal-cancel').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  modal.querySelector('.shotfix-modal-save').addEventListener('click', async () => {
    const saveBtn = modal.querySelector('.shotfix-modal-save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
      await fetch(serverUrl + '/claude-md', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textarea.value }),
      });
      saveBtn.textContent = 'Saved!';
      setTimeout(close, 600);
    } catch {
      saveBtn.textContent = 'Failed';
      saveBtn.disabled = false;
      setTimeout(() => { saveBtn.textContent = 'Save'; }, 2000);
    }
  });
}

// --- SSE connection with reconnect ---

function connectSSE() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  eventSource = new EventSource(`${serverUrl}/events`);

  eventSource.addEventListener('connected', () => {
    sseReconnectDelay = 1000; // Reset backoff
    sidebar.querySelector('.shotfix-activity-dot').classList.add('shotfix-dot-live');
    if (isSidebarSavedOpen()) {
      setSidebarOpen(true);
    }
  });

  eventSource.addEventListener('session:created', (e) => {
    const data = JSON.parse(e.data);
    // Prepend new session
    sessions.unshift({
      id: data.id,
      title: data.title,
      status: data.status || 'pending',
      timestamp: data.timestamp,
      hasScreenshot: true,
    });
    renderSessions();
    setSidebarOpen(true);
    if (currentTab !== 'activity') switchTab('activity');

    // Pulse dot
    const dot = sidebar.querySelector('.shotfix-activity-dot');
    dot.classList.remove('shotfix-dot-pulse');
    void dot.offsetWidth;
    dot.classList.add('shotfix-dot-pulse');
  });

  eventSource.addEventListener('session:updated', (e) => {
    const data = JSON.parse(e.data);
    // Update session in list
    const idx = sessions.findIndex(s => s.id === data.id);
    if (idx >= 0) {
      sessions[idx].status = data.status;
      if (data.title) sessions[idx].title = data.title;
      renderSessions();
    }

    // Forward to chat module if loaded
    if (chatModule) {
      chatModule.handleSessionUpdate(data);
    }
  });

  eventSource.onerror = () => {
    sidebar.querySelector('.shotfix-activity-dot').classList.remove('shotfix-dot-live');
    eventSource.close();
    eventSource = null;

    // Exponential backoff reconnect
    if (sseReconnectTimer) clearTimeout(sseReconnectTimer);
    sseReconnectTimer = setTimeout(() => {
      console.log('[Shotfix] Reconnecting SSE...');
      connectSSE();
    }, sseReconnectDelay);
    sseReconnectDelay = Math.min(sseReconnectDelay * 2, 30000);
  };
}

// --- Exports ---

export function getShortcut() {
  return shortcut;
}

export function connectActivity(url) {
  serverUrl = url;
  createSidebar();
  connectSSE();
  fetchSessions();
}

function setSidebarOpen(open) {
  if (!sidebar) return;
  if (open) {
    sidebar.classList.add('shotfix-activity-open');
    document.documentElement.classList.add('shotfix-sidebar-is-open');
  } else {
    sidebar.classList.remove('shotfix-activity-open');
    document.documentElement.classList.remove('shotfix-sidebar-is-open');
  }
  try { localStorage.setItem('shotfix-sidebar-open', open ? '1' : '0'); } catch {}
}

function isSidebarSavedOpen() {
  try { return localStorage.getItem('shotfix-sidebar-open') === '1'; } catch {}
  return false;
}

export function toggleActivity() {
  if (!sidebar) createSidebar();
  const isOpen = sidebar.classList.contains('shotfix-activity-open');
  setSidebarOpen(!isOpen);
}
