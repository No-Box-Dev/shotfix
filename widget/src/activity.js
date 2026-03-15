/**
 * Activity sidebar — live feed of AI fix activity via SSE + settings tab
 */

import { updateTriggerShortcut, formatShortcut } from './trigger.js';

let sidebar = null;
let eventSource = null;
let entries = loadEntries();
let currentTab = 'activity';
let captureCallback = null;
let serverUrl = null;
const MAX_ENTRIES = 50;

function loadEntries() {
  try {
    const saved = localStorage.getItem('shotfix-activity');
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveEntries() {
  try {
    localStorage.setItem('shotfix-activity', JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {}
}

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

function createSidebar() {
  if (sidebar) return sidebar;

  sidebar = document.createElement('div');
  sidebar.className = 'shotfix-activity';
  sidebar.innerHTML = `
    <div class="shotfix-activity-header">
      <span class="shotfix-activity-dot"></span>
      <div class="shotfix-tabs">
        <button class="shotfix-tab shotfix-tab-active" data-tab="activity">Activity</button>
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
      </div>
    </div>
  `;

  // Tab switching
  sidebar.querySelectorAll('.shotfix-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Close button
  sidebar.querySelector('.shotfix-activity-close').addEventListener('click', () => {
    setSidebarOpen(false);
  });

  // Shortcut editor
  setupShortcutEditor();

  document.body.appendChild(sidebar);

  // Restore saved entries
  if (entries.length > 0) {
    const saved = [...entries];
    entries = [];
    // Replay in reverse (oldest first) so prepend order is correct
    for (let i = saved.length - 1; i >= 0; i--) {
      addEntry(saved[i].type, saved[i].data, true);
    }
  }

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

function setupShortcutEditor() {
  const display = sidebar.querySelector('.shotfix-shortcut-display');
  const recorder = sidebar.querySelector('.shotfix-shortcut-recorder');
  const editBtn = sidebar.querySelector('.shotfix-shortcut-edit');
  const cancelBtn = sidebar.querySelector('.shotfix-recorder-cancel');
  const resetBtn = sidebar.querySelector('.shotfix-recorder-reset');
  const recorderBox = sidebar.querySelector('.shotfix-recorder-box');
  const keysDisplay = sidebar.querySelector('.shotfix-shortcut-keys');

  let recording = false;
  let handler = null;

  editBtn.addEventListener('click', () => {
    recording = true;
    display.style.display = 'none';
    recorder.style.display = '';
    recorderBox.textContent = 'Press your new shortcut...';
    recorderBox.classList.add('shotfix-recording');

    handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Ignore standalone modifier keys
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
    recording = false;
    display.style.display = '';
    recorder.style.display = 'none';
    recorderBox.classList.remove('shotfix-recording');
    if (handler) {
      document.removeEventListener('keydown', handler, true);
      handler = null;
    }
  }
}

function addEntry(type, data, fromStorage = false) {
  // Don't persist transient "fixing" entries
  if (type === 'fixing' && fromStorage) return;

  const list = sidebar.querySelector('.shotfix-activity-list');
  const entry = document.createElement('div');
  entry.className = `shotfix-activity-entry shotfix-activity-${type}`;

  const time = data._time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (type === 'capture') {
    entry.innerHTML = `
      <div class="shotfix-entry-icon">⚡</div>
      <div class="shotfix-entry-body">
        <div class="shotfix-entry-title">Captured: ${escapeHtml(data.title)}</div>
        <div class="shotfix-entry-meta">${time}</div>
      </div>
    `;
  } else if (type === 'fixing') {
    const existing = list.querySelector(`[data-fix-title="${CSS.escape(data.title)}"]`);
    if (existing) {
      if (data.status === 'searching') {
        existing.querySelector('.shotfix-entry-title').textContent = 'Searching for source...';
      } else if (data.status === 'calling_ai') {
        existing.querySelector('.shotfix-entry-title').textContent = `AI fixing: ${data.file}`;
      }
      return;
    }
    entry.setAttribute('data-fix-title', data.title);
    entry.innerHTML = `
      <div class="shotfix-entry-icon"><span class="shotfix-spinner"></span></div>
      <div class="shotfix-entry-body">
        <div class="shotfix-entry-title">Searching for source...</div>
        <div class="shotfix-entry-meta">${escapeHtml(data.title)}</div>
      </div>
      <button class="shotfix-cancel-btn" title="Cancel">✕</button>
    `;
    entry.querySelector('.shotfix-cancel-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await fetch(serverUrl + '/cancel', { method: 'POST' });
      } catch {}
    });
  } else if (type === 'fixed') {
    const existing = list.querySelector(`[data-fix-title="${CSS.escape(data.title)}"]`);
    if (existing) existing.remove();

    if (data.status === 'done') {
      entry.innerHTML = `
        <div class="shotfix-entry-icon">✅</div>
        <div class="shotfix-entry-body">
          <div class="shotfix-entry-title">Fixed: ${escapeHtml(data.title)}</div>
          <div class="shotfix-entry-meta">${data.file} — ${data.elapsed}s, ${data.edits} edit${data.edits === 1 ? '' : 's'}</div>
        </div>
        <div class="shotfix-entry-expand">›</div>
      `;
      entry.style.cursor = 'pointer';

      // Expandable detail with revert
      const detail = document.createElement('div');
      detail.className = 'shotfix-entry-detail';
      detail.innerHTML = `
        <div class="shotfix-detail-file">📄 ${escapeHtml(data.file)}</div>
        <div class="shotfix-detail-stats">${data.edits} edit${data.edits === 1 ? '' : 's'} in ${data.elapsed}s</div>
        <button class="shotfix-revert-btn">↩ Revert</button>
      `;
      detail.style.display = 'none';

      entry.addEventListener('click', (e) => {
        if (e.target.closest('.shotfix-revert-btn')) return;
        const open = detail.style.display !== 'none';
        detail.style.display = open ? 'none' : '';
        entry.querySelector('.shotfix-entry-expand').textContent = open ? '›' : '⌄';
      });

      detail.querySelector('.shotfix-revert-btn').addEventListener('click', async () => {
        const btn = detail.querySelector('.shotfix-revert-btn');
        btn.disabled = true;
        btn.textContent = '↩ Reverting...';
        try {
          const res = await fetch(serverUrl + '/revert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: data.file }),
          });
          if (res.ok) {
            entry.querySelector('.shotfix-entry-icon').textContent = '↩';
            entry.querySelector('.shotfix-entry-title').textContent = 'Reverted: ' + escapeHtml(data.title);
            detail.remove();
            entry.style.cursor = 'default';
            entry.querySelector('.shotfix-entry-expand').remove();
          } else {
            btn.textContent = '↩ Failed';
            setTimeout(() => { btn.textContent = '↩ Revert'; btn.disabled = false; }, 2000);
          }
        } catch {
          btn.textContent = '↩ Failed';
          setTimeout(() => { btn.textContent = '↩ Revert'; btn.disabled = false; }, 2000);
        }
      });

      // Append detail after the entry
      entry._detail = detail;
    } else {
      entry.innerHTML = `
        <div class="shotfix-entry-icon">❌</div>
        <div class="shotfix-entry-body">
          <div class="shotfix-entry-title">Failed: ${escapeHtml(data.title)}</div>
          <div class="shotfix-entry-meta">${escapeHtml(data.message || 'Unknown error')}</div>
        </div>
      `;
    }
  } else if (type === 'connected') {
    entry.innerHTML = `
      <div class="shotfix-entry-icon">🔌</div>
      <div class="shotfix-entry-body">
        <div class="shotfix-entry-title">Connected to Shotfix</div>
        <div class="shotfix-entry-meta">${time}</div>
      </div>
    `;
  }

  if (fromStorage) {
    entry.style.animation = 'none';
  }

  if (entry._detail) {
    list.prepend(entry._detail);
  }
  list.prepend(entry);

  // Don't persist fixing entries (transient)
  if (type !== 'fixing') {
    entries.unshift({ type, data: { ...data, _time: time }, time });
    if (entries.length > MAX_ENTRIES) {
      entries.pop();
    }
    saveEntries();
  }

  if (list.children.length > MAX_ENTRIES * 2) {
    list.removeChild(list.lastChild);
  }

  if (!fromStorage) {
    // Pulse the dot
    const dot = sidebar.querySelector('.shotfix-activity-dot');
    dot.classList.remove('shotfix-dot-pulse');
    void dot.offsetWidth;
    dot.classList.add('shotfix-dot-pulse');

    // Auto-switch to activity tab on new events
    if (currentTab !== 'activity') {
      switchTab('activity');
    }
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function getShortcut() {
  return shortcut;
}

export function setCaptureCallback(fn) {
  captureCallback = fn;
}

export function connectActivity(url) {
  serverUrl = url;
  createSidebar();

  eventSource = new EventSource(`${serverUrl}/events`);

  eventSource.addEventListener('connected', () => {
    addEntry('connected', {});
    sidebar.querySelector('.shotfix-activity-dot').classList.add('shotfix-dot-live');
    // Restore sidebar state after reload
    if (isSidebarSavedOpen()) {
      setSidebarOpen(true);
    }
  });

  eventSource.addEventListener('capture', (e) => {
    const data = JSON.parse(e.data);
    addEntry('capture', data);
    setSidebarOpen(true);
  });

  eventSource.addEventListener('fixing', (e) => {
    addEntry('fixing', JSON.parse(e.data));
  });

  eventSource.addEventListener('fixed', (e) => {
    addEntry('fixed', JSON.parse(e.data));
  });

  eventSource.onerror = () => {
    sidebar.querySelector('.shotfix-activity-dot').classList.remove('shotfix-dot-live');
  };
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
