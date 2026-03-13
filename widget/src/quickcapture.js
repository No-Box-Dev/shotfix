/**
 * Quick capture — live purple overlay with single element selection and floating type bar.
 * Click one element → bar appears near it → type → Enter → done.
 */

import { captureScreenshot } from './capture.js';
import { collectMetadata } from './metadata.js';
import { extractElementInfo } from './elements.js';

let overlay = null;
let hoverHighlight = null;

/**
 * Start the quick capture overlay
 * @param {Object} options
 * @param {string} options.devServerUrl
 * @param {Function} [options.getContext]
 */
export function startQuickCapture(options) {
  if (overlay) return;

  // Create the purple overlay
  overlay = document.createElement('div');
  overlay.className = 'shotfix-overlay';

  // Hover highlight
  hoverHighlight = document.createElement('div');
  hoverHighlight.className = 'shotfix-hover';
  overlay.appendChild(hoverHighlight);

  document.body.appendChild(overlay);

  let selectedElement = null;
  let selectedInfo = null;
  let selectionHighlight = null;
  let bar = null;

  // --- Hover ---
  function onMouseMove(e) {
    if (selectedElement) return; // Already selected, stop hovering
    const el = getElementAtPoint(e.clientX, e.clientY);
    if (el && !isShotfixElement(el)) {
      const rect = el.getBoundingClientRect();
      hoverHighlight.style.display = 'block';
      hoverHighlight.style.left = rect.left + 'px';
      hoverHighlight.style.top = rect.top + 'px';
      hoverHighlight.style.width = rect.width + 'px';
      hoverHighlight.style.height = rect.height + 'px';
    } else {
      hoverHighlight.style.display = 'none';
    }
  }

  // --- Single click to select ---
  function onClick(e) {
    if (selectedElement) return; // Already selected
    if (bar && bar.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    const el = getElementAtPoint(e.clientX, e.clientY);
    if (!el || isShotfixElement(el)) return;

    const info = extractElementInfo(el);
    if (!info) return;

    selectedElement = el;
    selectedInfo = info;

    // Hide hover highlight
    hoverHighlight.style.display = 'none';

    // Show selection highlight
    const rect = el.getBoundingClientRect();
    selectionHighlight = document.createElement('div');
    selectionHighlight.className = 'shotfix-selected';
    selectionHighlight.style.left = rect.left + 'px';
    selectionHighlight.style.top = rect.top + 'px';
    selectionHighlight.style.width = rect.width + 'px';
    selectionHighlight.style.height = rect.height + 'px';
    overlay.appendChild(selectionHighlight);

    // Show bar near the element
    showBar(rect);
  }

  function showBar(elRect) {
    bar = document.createElement('div');
    bar.className = 'shotfix-bar';
    bar.innerHTML = `
      <input type="text" class="shotfix-input" placeholder="What's wrong?" />
      <button class="shotfix-send">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
      </button>
    `;
    overlay.appendChild(bar);

    // Position bar below or above the element
    const barHeight = 52;
    const gap = 8;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const barWidth = 320;

    let top, left;

    // Vertical: prefer below, fall back to above
    if (elRect.bottom + gap + barHeight < viewportH) {
      top = elRect.bottom + gap;
    } else if (elRect.top - gap - barHeight > 0) {
      top = elRect.top - gap - barHeight;
    } else {
      top = viewportH - barHeight - 24;
    }

    // Horizontal: center on element, clamp to viewport
    left = elRect.left + (elRect.width / 2) - (barWidth / 2);
    left = Math.max(12, Math.min(left, viewportW - barWidth - 12));

    bar.style.left = left + 'px';
    bar.style.top = top + 'px';
    bar.style.width = barWidth + 'px';

    const input = bar.querySelector('.shotfix-input');
    const sendBtn = bar.querySelector('.shotfix-send');

    requestAnimationFrame(() => input.focus());

    sendBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      submit(input);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        submit(input);
      }
    });
  }

  async function submit(input) {
    const description = input.value.trim();
    if (!description) {
      input.focus();
      return;
    }

    const sendBtn = bar.querySelector('.shotfix-send');
    sendBtn.disabled = true;
    input.disabled = true;

    // Hide overlay before screenshot
    overlay.style.display = 'none';

    try {
      const capture = await captureScreenshot();
      const metadata = collectMetadata();

      let context = null;
      if (options.getContext) {
        try { context = options.getContext(); } catch {}
      }

      await fetch(options.devServerUrl + '/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: description,
          description: '',
          screenshot: capture.dataUrl,
          metadata,
          elements: selectedInfo ? [selectedInfo] : [],
          context,
        }),
      });

      // Brief success flash
      overlay.style.display = '';
      bar.innerHTML = `<div class="shotfix-success">Captured!</div>`;
      setTimeout(close, 600);
    } catch (err) {
      console.error('[Shotfix] Quick capture failed:', err);
      overlay.style.display = '';
      sendBtn.disabled = false;
      input.disabled = false;
    }
  }

  function close() {
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    hoverHighlight = null;
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
}

function getElementAtPoint(x, y) {
  if (!overlay) return document.elementFromPoint(x, y);
  const prev = overlay.style.pointerEvents;
  overlay.style.pointerEvents = 'none';
  const el = document.elementFromPoint(x, y);
  overlay.style.pointerEvents = prev;
  return el;
}

function isShotfixElement(el) {
  let current = el;
  while (current) {
    if (current.className && typeof current.className === 'string' && current.className.includes('shotfix-')) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}
