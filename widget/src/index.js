/**
 * Shotfix — screenshot + fix, visual AI input for developers
 */

import { injectStyles } from './styles.js';
import { createTrigger } from './trigger.js';
import { startQuickCapture } from './quickcapture.js';
import { startConsoleCapture } from './metadata.js';

const DEV_SERVER_URL = 'http://localhost:2847';

const config = {
  getContext: null,
  devServerUrl: null,
};

function init(options = {}) {
  config.getContext = typeof options.getContext === 'function' ? options.getContext : null;

  // Start console capture
  startConsoleCapture();

  // Inject styles
  injectStyles();

  // Probe for local dev server
  probeDevServer();
}

async function probeDevServer() {
  try {
    const res = await fetch(DEV_SERVER_URL + '/health', {
      signal: AbortSignal.timeout(500),
    });
    if (res.ok) {
      config.devServerUrl = DEV_SERVER_URL;
    }
  } catch {}

  if (config.devServerUrl) {
    const captureOpts = {
      devServerUrl: config.devServerUrl,
      getContext: config.getContext,
    };

    // Create trigger button
    createTrigger(() => startQuickCapture(captureOpts));

    // Keyboard shortcut: Cmd+Shift+E (Mac) / Ctrl+Shift+E (other)
    document.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        startQuickCapture(captureOpts);
      }
    });

    console.log('[Shotfix] Dev mode active — Cmd+Shift+E for quick capture');
  } else {
    console.log('[Shotfix] No dev server found at localhost:2847. Run: npx shotfix');
  }
}

export { init };
