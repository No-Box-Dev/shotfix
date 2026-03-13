/**
 * Screenshot capture using html2canvas (primary) with html-to-image fallback
 */

// html2canvas-pro has better modern CSS support (oklch, etc.)
const HTML2CANVAS_URL = 'https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.8/dist/html2canvas-pro.min.js';
// html-to-image uses SVG foreignObject — preserves cross-origin CSS better
const HTML_TO_IMAGE_URL = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/dist/html-to-image.js';

let html2canvasLoaded = false;
let htmlToImageLoaded = false;

/**
 * Load html2canvas-pro library dynamically
 */
function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (html2canvasLoaded && window.html2canvas) {
      resolve(window.html2canvas);
      return;
    }

    const script = document.createElement('script');
    script.src = HTML2CANVAS_URL;
    script.onload = () => {
      html2canvasLoaded = true;
      console.log('[Shotfix] html2canvas loaded');
      resolve(window.html2canvas);
    };
    script.onerror = () => {
      reject(new Error('Failed to load html2canvas'));
    };
    document.head.appendChild(script);
  });
}

/**
 * Load html-to-image library dynamically
 */
function loadHtmlToImage() {
  return new Promise((resolve, reject) => {
    if (htmlToImageLoaded && window.htmlToImage) {
      resolve(window.htmlToImage);
      return;
    }

    const script = document.createElement('script');
    script.src = HTML_TO_IMAGE_URL;
    script.onload = () => {
      htmlToImageLoaded = true;
      console.log('[Shotfix] html-to-image loaded');
      resolve(window.htmlToImage);
    };
    script.onerror = () => {
      reject(new Error('Failed to load html-to-image'));
    };
    document.head.appendChild(script);
  });
}

/**
 * Check if a screenshot looks like CSS was lost (too small = mostly blank/unstyled)
 * @param {string} dataUrl - PNG data URL
 * @returns {boolean} true if CSS appears to be missing
 */
export function looksLikeCssMissing(dataUrl) {
  if (!dataUrl) return true;
  const base64Part = dataUrl.split(',')[1];
  if (!base64Part) return true;
  return base64Part.length < 20000;
}

/**
 * Capture screenshot of the current viewport
 * @returns {Promise<Object>} { dataUrl, elementMap, viewport }
 */
export async function captureScreenshot() {
  console.log('[Shotfix] Capturing screenshot...');

  const html2canvas = await loadHtml2Canvas();

  // Hide the trigger button during capture
  const trigger = document.querySelector('.shotfix-trigger');
  if (trigger) trigger.style.visibility = 'hidden';

  try {
    // Capture element positions BEFORE screenshot (while page is in exact state)
    const elementMap = captureElementMap();

    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;

    // Get computed background color from body or html
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
    const backgroundColor = bodyBg !== 'rgba(0, 0, 0, 0)' ? bodyBg : (htmlBg !== 'rgba(0, 0, 0, 0)' ? htmlBg : '#ffffff');

    // Primary: html2canvas with color conversion for modern CSS
    const overrides = convertUnsupportedColorsOnPage();
    let dataUrl;
    try {
      const canvas = await html2canvas(document.documentElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: backgroundColor,
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        windowWidth: width,
        windowHeight: height,
        width: width,
        height: height,
        x: window.scrollX,
        y: window.scrollY,
        logging: false,
        imageTimeout: 5000,
      });
      dataUrl = canvas.toDataURL('image/png');
      console.log('[Shotfix] html2canvas captured', {
        width: canvas.width,
        height: canvas.height,
        size: Math.round(dataUrl.length / 1024) + 'kb',
      });
    } finally {
      restoreOriginalStyles(overrides);
    }

    // Fallback: if html2canvas produced a suspiciously small screenshot, try html-to-image
    if (looksLikeCssMissing(dataUrl)) {
      console.log('[Shotfix] Screenshot looks like CSS is missing, trying html-to-image fallback...');
      try {
        const htmlToImage = await loadHtmlToImage();
        const fallbackUrl = await htmlToImage.toPng(document.documentElement, {
          width,
          height,
          canvasWidth: width,
          canvasHeight: height,
          pixelRatio: 1,
          skipAutoScale: true,
          filter: (node) => {
            if (node.classList?.contains('shotfix-trigger')) return false;
            return true;
          },
        });

        if (fallbackUrl && !looksLikeCssMissing(fallbackUrl)) {
          console.log('[Shotfix] html-to-image fallback succeeded', {
            size: Math.round(fallbackUrl.length / 1024) + 'kb',
          });
          dataUrl = fallbackUrl;
        } else {
          console.log('[Shotfix] html-to-image fallback also produced small screenshot, using html2canvas result');
        }
      } catch (e) {
        console.log('[Shotfix] html-to-image fallback failed:', e.message);
      }
    }

    console.log('[Shotfix] Screenshot captured', {
      size: Math.round(dataUrl.length / 1024) + 'kb',
      elements: elementMap.length
    });

    return {
      dataUrl,
      elementMap,
      viewport: { width, height }
    };
  } finally {
    // Restore trigger button
    if (trigger) trigger.style.visibility = 'visible';
  }
}

/**
 * Capture bounding boxes of all visible elements
 * @returns {Array} Array of { rect, tagName, id, classes, text, selector }
 */
function captureElementMap() {
  const elements = [];
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Walk all elements in the DOM
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        // Skip shotfix elements
        if (node.classList?.contains('shotfix-trigger')) return NodeFilter.FILTER_REJECT;

        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node;
  while (node = walker.nextNode()) {
    const rect = node.getBoundingClientRect();

    // Skip elements outside viewport or too small
    if (rect.width < 5 || rect.height < 5) continue;
    if (rect.bottom < 0 || rect.top > viewportHeight) continue;
    if (rect.right < 0 || rect.left > viewportWidth) continue;

    // Get element info
    const tagName = node.tagName.toLowerCase();
    const id = node.id || null;
    const classes = node.className && typeof node.className === 'string'
      ? node.className.split(' ').filter(c => c && !c.startsWith('shotfix-'))
      : [];

    // Get computed styles for visual context
    const styles = window.getComputedStyle(node);
    const backgroundColor = styles.backgroundColor;
    const color = styles.color;

    // Get text content (direct text only, not children)
    let text = '';
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      }
    }
    text = text.trim().substring(0, 150);

    // Get full inner text for context (truncated)
    const innerText = node.innerText?.trim().substring(0, 200) || '';

    // Build a simple selector
    let selector = tagName;
    if (id) {
      selector = `${tagName}#${id}`;
    } else if (classes.length > 0) {
      selector = `${tagName}.${classes.slice(0, 2).join('.')}`;
    }

    // Build full unique CSS selector path
    const fullSelector = getFullSelector(node);

    // Collect filtered data-* attributes
    const dataAttributes = {};
    for (const attr of node.attributes) {
      if (attr.name.startsWith('data-') && !shouldSkipDataAttr(attr.name)) {
        dataAttributes[attr.name] = attr.value;
      }
    }

    // Get accessible name
    const accessibleName = getAccessibleName(node);

    // Get nearby landmark/context
    const context = getNearbyContext(node);

    // Collect data-* attrs from ancestors and their children
    const ancestorData = collectNearbyDataAttributes(node);

    // Build element info object
    const elementInfo = {
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      tagName,
      id,
      classes,
      text,
      innerText,
      selector,
      fullSelector,
      dataAttributes,
      ancestorData,
      accessibleName,
      context,
      styles: {
        backgroundColor: backgroundColor !== 'rgba(0, 0, 0, 0)' ? backgroundColor : null,
        color,
      },
    };

    // Add type-specific attributes
    if (tagName === 'a' && node.href) {
      elementInfo.href = node.href;
    }
    if (tagName === 'img') {
      elementInfo.src = node.src;
      elementInfo.alt = node.alt;
    }
    if (tagName === 'input' || tagName === 'button' || tagName === 'select' || tagName === 'textarea') {
      elementInfo.type = node.type;
      elementInfo.name = node.name;
      elementInfo.placeholder = node.placeholder;
      const sensitiveTypes = ['password', 'hidden', 'credit-card'];
      if (!sensitiveTypes.includes(node.type)) {
        elementInfo.value = node.value?.substring(0, 100);
      }
    }
    if (node.getAttribute('aria-label')) {
      elementInfo.ariaLabel = node.getAttribute('aria-label');
    }
    if (node.getAttribute('role')) {
      elementInfo.role = node.getAttribute('role');
    }

    // Capture HTML source (truncated for large elements)
    try {
      const html = node.outerHTML;
      if (html.length <= 2000) {
        elementInfo.html = html;
      } else {
        const tagMatch = html.match(/^<[^>]+>/);
        elementInfo.html = tagMatch ? `${tagMatch[0]}... (${html.length} chars truncated)` : null;
      }
    } catch (e) {
      elementInfo.html = null;
    }

    elements.push(elementInfo);
  }

  // Sort by area (smallest first)
  elements.sort((a, b) => (a.rect.width * a.rect.height) - (b.rect.width * b.rect.height));

  console.log('[Shotfix] Element map captured:', elements.length, 'elements');
  return elements;
}

/**
 * Build a full unique CSS selector path for an element
 */
function getFullSelector(el) {
  const parts = [];
  let current = el;

  while (current && current !== document.body && current !== document.documentElement) {
    let part = current.tagName.toLowerCase();

    if (current.id) {
      part = `#${current.id}`;
      parts.unshift(part);
      break;
    }

    const classes = Array.from(current.classList)
      .filter(c => !c.startsWith('shotfix-'))
      .slice(0, 2);
    if (classes.length) {
      part += '.' + classes.join('.');
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        part += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(part);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

/**
 * Get the accessible name of an element
 */
function getAccessibleName(el) {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  const ariaLabelledBy = el.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelEl = document.getElementById(ariaLabelledBy);
    if (labelEl) return labelEl.textContent?.trim();
  }

  const title = el.getAttribute('title');
  if (title) return title;

  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) return label.textContent?.trim();
  }

  if (['BUTTON', 'A'].includes(el.tagName)) {
    return el.textContent?.trim().substring(0, 100) || null;
  }

  if (el.tagName === 'IMG') {
    return el.alt || null;
  }

  return null;
}

/**
 * Get nearby context/landmarks to help locate the element
 */
function getNearbyContext(el) {
  const contexts = [];

  let current = el.parentElement;
  let depth = 0;
  while (current && depth < 5) {
    const role = current.getAttribute('role');
    const tag = current.tagName.toLowerCase();

    if (['header', 'nav', 'main', 'aside', 'footer', 'section', 'article'].includes(tag)) {
      const label = current.getAttribute('aria-label') || current.id || '';
      contexts.push(label ? `${tag}[${label}]` : tag);
    } else if (role && ['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'region'].includes(role)) {
      contexts.push(`[role=${role}]`);
    }

    const testId = current.getAttribute('data-testid') || current.getAttribute('data-component');
    if (testId) {
      contexts.push(`[data-testid=${testId}]`);
    }

    current = current.parentElement;
    depth++;
  }

  const listParent = el.closest('ul, ol');
  if (listParent) {
    const items = Array.from(listParent.children).filter(c => c.tagName === 'LI');
    const listItem = el.closest('li');
    if (listItem && items.includes(listItem)) {
      const index = items.indexOf(listItem) + 1;
      contexts.push(`list item ${index} of ${items.length}`);
    }
  }

  return contexts.length > 0 ? contexts.join(' > ') : null;
}

/**
 * Convert unsupported CSS color functions to rgb on the live page
 */
function convertUnsupportedColorsOnPage() {
  const unsupportedColorRegex = /\b(oklch|oklab|lab|lch|color)\s*\(/i;
  const colorProperties = [
    'color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor',
    'borderBottomColor', 'borderLeftColor', 'outlineColor', 'textDecorationColor',
    'fill', 'stroke', 'caretColor', 'columnRuleColor', 'boxShadow', 'textShadow'
  ];

  const overrides = [];

  const tempEl = document.createElement('div');
  tempEl.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
  document.body.appendChild(tempEl);

  const allElements = document.querySelectorAll('*');

  if (allElements.length > 5000) {
    console.log(`[Shotfix] Skipping color conversion — ${allElements.length} elements exceeds limit`);
    tempEl.remove();
    return overrides;
  }

  for (const el of allElements) {
    if (el.className && typeof el.className === 'string' && el.className.includes('shotfix')) continue;

    try {
      const computedStyle = window.getComputedStyle(el);

      for (const prop of colorProperties) {
        const value = computedStyle[prop];
        if (value && unsupportedColorRegex.test(value)) {
          const originalValue = el.style[prop];
          tempEl.style[prop] = value;
          const converted = window.getComputedStyle(tempEl)[prop];

          if (converted && (converted.startsWith('rgb') || !unsupportedColorRegex.test(converted))) {
            el.style[prop] = converted;
            overrides.push({ element: el, property: prop, originalValue });
          }
          tempEl.style[prop] = '';
        }
      }
    } catch (e) {
      // Skip elements that throw
    }
  }

  tempEl.remove();
  console.log(`[Shotfix] Converted ${overrides.length} unsupported color values`);
  return overrides;
}

// Exact attributes to skip (framework/UI noise)
const SKIP_DATA_ATTRS = new Set([
  'data-testid', 'data-state', 'data-slot', 'data-orientation',
  'data-disabled', 'data-highlighted', 'data-side', 'data-align',
  'data-tour', 'data-index', 'data-variant', 'data-size', 'data-discover',
]);

// Prefix patterns to skip (browser extensions, framework internals)
const SKIP_DATA_PREFIXES = [
  'data-radix-', 'data-dashlane-', 'data-1p-', 'data-lp',
  'data-sentry-', 'data-shotfix',
];

/**
 * Check if a data attribute should be skipped
 */
export function shouldSkipDataAttr(name) {
  if (SKIP_DATA_ATTRS.has(name)) return true;
  for (const prefix of SKIP_DATA_PREFIXES) {
    if (name.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Collect data-* attributes from ancestor elements and their subtrees
 */
export function collectNearbyDataAttributes(element, maxDepth = 10) {
  const result = {};
  let current = element?.parentElement;
  let depth = 0;

  while (current && current !== document.body && current !== document.documentElement && depth < maxDepth) {
    collectDataAttrsFrom(current, result);

    if (depth < 5) {
      const descendants = current.querySelectorAll('*');
      for (const desc of descendants) {
        if (desc.contains(element) || desc === element) continue;
        if (desc.className && typeof desc.className === 'string' && desc.className.includes('shotfix')) continue;
        collectDataAttrsFrom(desc, result);
      }
    }

    current = current.parentElement;
    depth++;
  }

  return result;
}

/**
 * Collect data-* attributes from a single element into the result object
 */
function collectDataAttrsFrom(el, result) {
  for (const attr of el.attributes) {
    if (!attr.name.startsWith('data-')) continue;
    if (shouldSkipDataAttr(attr.name)) continue;
    if (!(attr.name in result)) {
      result[attr.name] = attr.value;
    }
  }
}

/**
 * Restore original styles after screenshot capture
 */
function restoreOriginalStyles(overrides) {
  for (const { element, property, originalValue } of overrides) {
    try {
      if (originalValue) {
        element.style[property] = originalValue;
      } else {
        element.style.removeProperty(property.replace(/([A-Z])/g, '-$1').toLowerCase());
      }
    } catch (e) {
      // Ignore errors during restore
    }
  }
  console.log(`[Shotfix] Restored ${overrides.length} original styles`);
}
