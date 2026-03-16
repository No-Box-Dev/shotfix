/**
 * Chat panel — conversational follow-up anchored to visual captures
 * Lazy-loaded when a session is first clicked.
 */

let chatPanel = null;
let currentSessionId = null;
let serverUrl = null;
let onCloseCallback = null;

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

function createChatPanel() {
  if (chatPanel) return chatPanel;

  chatPanel = document.createElement('div');
  chatPanel.className = 'shotfix-chat';
  chatPanel.innerHTML = `
    <div class="shotfix-chat-header">
      <div class="shotfix-chat-header-left">
        <img class="shotfix-chat-thumb" src="" alt="" />
        <span class="shotfix-chat-title"></span>
      </div>
      <button class="shotfix-chat-close" aria-label="Close">&times;</button>
    </div>
    <div class="shotfix-chat-messages"></div>
    <div class="shotfix-chat-input-bar">
      <input type="text" class="shotfix-chat-input" placeholder="What else should change?" />
      <button class="shotfix-chat-send" aria-label="Send">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  `;

  // Close
  chatPanel.querySelector('.shotfix-chat-close').addEventListener('click', () => {
    closeChat();
  });

  // Send message
  const input = chatPanel.querySelector('.shotfix-chat-input');
  const sendBtn = chatPanel.querySelector('.shotfix-chat-send');

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || !currentSessionId) return;

    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    // Add user message immediately
    appendMessage({ role: 'user', text, timestamp: new Date().toISOString() });

    // Show typing indicator
    showTyping();

    try {
      await fetch(`${serverUrl}/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
    } catch (err) {
      hideTyping();
      appendMessage({ role: 'assistant', text: 'Failed to send message', timestamp: new Date().toISOString() });
    }

    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatPanel && chatPanel.classList.contains('shotfix-chat-open')) {
      closeChat();
    }
  });

  document.body.appendChild(chatPanel);
  return chatPanel;
}

function appendMessage(msg) {
  const list = chatPanel.querySelector('.shotfix-chat-messages');
  const el = document.createElement('div');
  el.className = `shotfix-chat-msg shotfix-chat-msg-${msg.role}`;

  let content = `<div class="shotfix-chat-msg-text">${escapeHtml(msg.text)}</div>`;

  // Show diff for assistant messages
  if (msg.role === 'assistant' && msg.diff && msg.diff.length > 0) {
    const diffHtml = msg.diff.map(d => {
      const oldLines = escapeHtml(d.old).split('\n').map(l => `<span class="shotfix-diff-del">- ${l}</span>`).join('\n');
      const newLines = escapeHtml(d.new).split('\n').map(l => `<span class="shotfix-diff-add">+ ${l}</span>`).join('\n');
      return oldLines + '\n' + newLines;
    }).join('\n\n');

    content += `
      <details class="shotfix-chat-diff">
        <summary>View changes (${msg.diff.length} edit${msg.diff.length === 1 ? '' : 's'})</summary>
        <pre class="shotfix-chat-diff-code">${diffHtml}</pre>
      </details>
    `;
  }

  content += `<div class="shotfix-chat-msg-time">${relativeTime(msg.timestamp)}</div>`;
  el.innerHTML = content;

  // Remove typing indicator if present
  hideTyping();

  list.appendChild(el);
  list.scrollTop = list.scrollHeight;
}

function showTyping() {
  const list = chatPanel.querySelector('.shotfix-chat-messages');
  let typing = list.querySelector('.shotfix-chat-typing');
  if (typing) return;

  typing = document.createElement('div');
  typing.className = 'shotfix-chat-typing';
  typing.innerHTML = '<span class="shotfix-spinner"></span> Thinking...';
  list.appendChild(typing);
  list.scrollTop = list.scrollHeight;
}

function hideTyping() {
  if (!chatPanel) return;
  const typing = chatPanel.querySelector('.shotfix-chat-typing');
  if (typing) typing.remove();
}

export async function openChat(sessionId, url) {
  serverUrl = url;
  createChatPanel();

  currentSessionId = sessionId;

  // Fetch full session
  try {
    const res = await fetch(`${serverUrl}/sessions/${sessionId}`);
    if (!res.ok) throw new Error('Failed to load session');
    const session = await res.json();

    // Update header
    chatPanel.querySelector('.shotfix-chat-title').textContent = session.capture.title;
    const thumb = chatPanel.querySelector('.shotfix-chat-thumb');
    if (session.hasScreenshot) {
      thumb.src = `${serverUrl}/sessions/${sessionId}/screenshot`;
      thumb.style.display = '';
    } else {
      thumb.style.display = 'none';
    }

    // Render messages
    const list = chatPanel.querySelector('.shotfix-chat-messages');
    list.innerHTML = '';

    for (const msg of session.messages) {
      appendMessage(msg);
    }

    // Show typing if currently fixing
    if (session.status.status === 'fixing' || session.status.status === 'chatting') {
      showTyping();
    }
  } catch (err) {
    console.error('[Shotfix] Failed to load session:', err);
  }

  // Slide in
  chatPanel.classList.add('shotfix-chat-open');
  document.documentElement.classList.add('shotfix-chat-is-open');
  chatPanel.querySelector('.shotfix-chat-input').focus();
}

export function closeChat() {
  if (!chatPanel) return;
  chatPanel.classList.remove('shotfix-chat-open');
  document.documentElement.classList.remove('shotfix-chat-is-open');
  currentSessionId = null;
  if (onCloseCallback) onCloseCallback();
}

export function setOnClose(fn) {
  onCloseCallback = fn;
}

export function getCurrentSessionId() {
  return currentSessionId;
}

/**
 * Handle SSE session:updated events — update chat in real-time
 */
export function handleSessionUpdate(data) {
  if (!chatPanel || data.id !== currentSessionId) return;

  if (data.status === 'fixing' || data.status === 'chatting') {
    showTyping();
  } else if (data.status === 'fixed' || data.status === 'error') {
    hideTyping();
    // Reload messages to get the new assistant message
    reloadMessages();
  }
}

async function reloadMessages() {
  if (!currentSessionId || !serverUrl) return;

  try {
    const res = await fetch(`${serverUrl}/sessions/${currentSessionId}`);
    if (!res.ok) return;
    const session = await res.json();

    const list = chatPanel.querySelector('.shotfix-chat-messages');
    list.innerHTML = '';
    for (const msg of session.messages) {
      appendMessage(msg);
    }
  } catch {}
}
