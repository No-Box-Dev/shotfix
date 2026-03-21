/**
 * Shotfix — screenshot + fix, visual AI input for developers
 */

import { injectStyles } from './fix/styles.js';
import { createTrigger, formatShortcut } from './fix/trigger.js';
import { startQuickCapture } from './fix/quickcapture.js';
import { startConsoleCapture } from './core/metadata.js';
import { connectActivity, toggleActivity, getShortcut } from './fix/activity.js';

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
  let watchEnabled = false;
  try {
    const res = await fetch(DEV_SERVER_URL + '/health', {
      signal: AbortSignal.timeout(500),
    });
    if (res.ok) {
      config.devServerUrl = DEV_SERVER_URL;
      const health = await res.json();
      watchEnabled = !!health.watch;
    }
  } catch {}

  if (config.devServerUrl) {
    const captureOpts = {
      devServerUrl: config.devServerUrl,
      getContext: config.getContext,
    };

    // Create trigger button — opens activity sidebar
    createTrigger(() => toggleActivity());

    // Configurable keyboard shortcut (reads from activity settings)
    document.addEventListener('keydown', (e) => {
      const sc = getShortcut();
      if (e.key.toLowerCase() === sc.key
        && e.metaKey === !!sc.meta
        && e.shiftKey === !!sc.shift
        && e.ctrlKey === !!sc.ctrl) {
        e.preventDefault();
        startQuickCapture(captureOpts);
      }
    });

    // Connect activity sidebar (SSE feed for live updates)
    connectActivity(config.devServerUrl);
    if (watchEnabled) {
      console.log('[Shotfix] Dev mode active — watch mode + activity feed');
    } else {
      console.log(`[Shotfix] Dev mode active — ${formatShortcut(getShortcut())} for quick capture`);
    }
  } else {
    console.log('[Shotfix] No dev server found at localhost:2847. Run: npx shotfix');
  }
}

export { init };
