/**
 * Auto-collect metadata about the page and environment
 */

/**
 * Collect all metadata
 * @returns {Object} Metadata object
 */
export function collectMetadata() {
  return {
    url: window.location.href,
    browser: getBrowser(),
    os: getOS(),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    consoleErrors: getRecentConsoleErrors(),
    urlEntities: extractUrlEntities(),
  };
}

/**
 * Extract entity-like segments from the URL path
 * Pairs label+ID segments: /users/123/reports/456 → { users: "123", reports: "456" }
 * @returns {Object} Key-value pairs of entity labels to IDs
 */
export function extractUrlEntities() {
  const entities = {};
  const path = window.location.pathname;
  const segments = path.split('/').filter(Boolean);

  const isId = (segment) =>
    /^\d+$/.test(segment) || // numeric: 123
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || // UUID
    /^[0-9a-f]{8,}$/i.test(segment); // hex-like: a1b2c3d4 (min 8 chars)

  for (let i = 0; i < segments.length; i++) {
    if (isId(segments[i]) && i > 0) {
      entities[segments[i - 1]] = segments[i];
    }
  }

  return entities;
}

export function getBrowser() {
  const ua = navigator.userAgent;

  if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/(\d+)/);
    return `Firefox ${match ? match[1] : ''}`;
  }
  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/(\d+)/);
    return `Edge ${match ? match[1] : ''}`;
  }
  if (ua.includes('Chrome/')) {
    const match = ua.match(/Chrome\/(\d+)/);
    return `Chrome ${match ? match[1] : ''}`;
  }
  if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    const match = ua.match(/Version\/(\d+)/);
    return `Safari ${match ? match[1] : ''}`;
  }

  return 'Unknown';
}

export function getOS() {
  const ua = navigator.userAgent;

  if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    if (match) {
      return `macOS ${match[1].replace('_', '.')}`;
    }
    return 'macOS';
  }
  if (ua.includes('Windows NT 10')) return 'Windows 10/11';
  if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
  if (ua.includes('Windows NT 6.2')) return 'Windows 8';
  if (ua.includes('Windows NT 6.1')) return 'Windows 7';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';

  return 'Unknown';
}

// Store console messages
const consoleLogs = [];
const MAX_LOGS = 50;
let captureStarted = false;

// Store references for cleanup
let originalConsoleLog = null;
let originalConsoleWarn = null;
let originalConsoleError = null;
let errorHandler = null;
let rejectionHandler = null;

// Helper to add log entry
function addLogEntry(type, args) {
  // Skip Shotfix's own logs
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try { return JSON.stringify(arg); } catch { return String(arg); }
    }
    return String(arg);
  }).join(' ');

  if (message.startsWith('[Shotfix]')) return;

  consoleLogs.push({
    type,
    message: message.substring(0, 500),
    timestamp: new Date().toISOString(),
  });
  if (consoleLogs.length > MAX_LOGS) {
    consoleLogs.shift();
  }
}

/**
 * Start intercepting console messages. Must be called once from init().
 */
export function startConsoleCapture() {
  if (captureStarted) return;
  captureStarted = true;

  originalConsoleLog = console.log;
  console.log = function(...args) {
    addLogEntry('log', args);
    originalConsoleLog.apply(console, args);
  };

  originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    addLogEntry('warn', args);
    originalConsoleWarn.apply(console, args);
  };

  originalConsoleError = console.error;
  console.error = function(...args) {
    addLogEntry('error', args);
    originalConsoleError.apply(console, args);
  };

  if (typeof window !== 'undefined') {
    errorHandler = (event) => {
      addLogEntry('uncaught', [event.message, `at ${event.filename}:${event.lineno}`]);
    };
    rejectionHandler = (event) => {
      addLogEntry('unhandled-promise', [event.reason?.message || String(event.reason)]);
    };
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);
  }
}

/**
 * Stop intercepting console messages and remove event listeners.
 */
export function stopConsoleCapture() {
  if (!captureStarted) return;

  if (originalConsoleLog) console.log = originalConsoleLog;
  if (originalConsoleWarn) console.warn = originalConsoleWarn;
  if (originalConsoleError) console.error = originalConsoleError;

  if (typeof window !== 'undefined') {
    if (errorHandler) window.removeEventListener('error', errorHandler);
    if (rejectionHandler) window.removeEventListener('unhandledrejection', rejectionHandler);
  }

  originalConsoleLog = null;
  originalConsoleWarn = null;
  originalConsoleError = null;
  errorHandler = null;
  rejectionHandler = null;
  captureStarted = false;
}

function getRecentConsoleErrors() {
  return [...consoleLogs];
}
