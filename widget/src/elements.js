/**
 * DOM element detection and selector generation
 */

import { collectNearbyDataAttributes, shouldSkipDataAttr } from './capture.js';

/**
 * Check if a selector uniquely matches the given element
 */
export function isUnique(selector, element) {
  try {
    const matches = document.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  } catch (e) {
    return false;
  }
}

/**
 * Escape special characters in CSS selectors
 */
function escapeSelector(str) {
  return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

/**
 * Generate a unique CSS selector for an element
 */
export function generateSelector(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  // Try ID first
  if (element.id) {
    const selector = `#${escapeSelector(element.id)}`;
    if (isUnique(selector, element)) {
      return selector;
    }
  }

  // Try tag + ID
  if (element.id) {
    const selector = `${element.tagName.toLowerCase()}#${escapeSelector(element.id)}`;
    if (isUnique(selector, element)) {
      return selector;
    }
  }

  // Try tag + classes
  if (element.classList.length > 0) {
    const classes = Array.from(element.classList)
      .filter(c => !c.startsWith('shotfix-'))
      .map(c => `.${escapeSelector(c)}`)
      .join('');

    if (classes) {
      const selector = `${element.tagName.toLowerCase()}${classes}`;
      if (isUnique(selector, element)) {
        return selector;
      }
    }
  }

  // Try tag + data attributes
  const dataAttrs = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith('data-'))
    .slice(0, 2);

  if (dataAttrs.length > 0) {
    const attrSelector = dataAttrs
      .map(attr => `[${attr.name}="${escapeSelector(attr.value)}"]`)
      .join('');
    const selector = `${element.tagName.toLowerCase()}${attrSelector}`;
    if (isUnique(selector, element)) {
      return selector;
    }
  }

  // Build path from ancestors
  const path = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
    let segment = current.tagName.toLowerCase();

    if (current.id) {
      segment = `${segment}#${escapeSelector(current.id)}`;
      path.unshift(segment);
      break;
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        segment = `${segment}:nth-of-type(${index})`;
      }
    }

    path.unshift(segment);
    current = current.parentElement;

    const selector = path.join(' > ');
    if (isUnique(selector, element)) {
      return selector;
    }

    if (path.length >= 5) {
      break;
    }
  }

  return path.join(' > ') || element.tagName.toLowerCase();
}

/**
 * Extract useful information about an element
 */
export function extractElementInfo(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const info = {
    tagName: element.tagName.toLowerCase(),
    selector: generateSelector(element),
  };

  if (element.id) {
    info.id = element.id;
  }

  const classes = Array.from(element.classList)
    .filter(c => !c.startsWith('shotfix-'));
  if (classes.length > 0) {
    info.classes = classes;
  }

  const text = element.textContent?.trim();
  if (text && text.length > 0) {
    info.text = text.length > 100 ? text.substring(0, 100) + '...' : text;
  }

  if (element.getAttribute('role')) {
    info.role = element.getAttribute('role');
  }
  if (element.getAttribute('aria-label')) {
    info.ariaLabel = element.getAttribute('aria-label');
  }

  if (element.tagName === 'A' && element.href) {
    info.href = element.href;
  }

  if (element.tagName === 'INPUT') {
    info.inputType = element.type;
    if (element.name) info.name = element.name;
    if (element.placeholder) info.placeholder = element.placeholder;
  }

  if (element.tagName === 'IMG' && element.src) {
    info.src = element.src;
    if (element.alt) info.alt = element.alt;
  }

  const dataAttributes = {};
  for (const attr of element.attributes) {
    if (attr.name.startsWith('data-') && !shouldSkipDataAttr(attr.name)) {
      dataAttributes[attr.name] = attr.value;
    }
  }
  if (Object.keys(dataAttributes).length > 0) {
    info.dataAttributes = dataAttributes;
  }

  const ancestorData = collectNearbyDataAttributes(element);
  if (Object.keys(ancestorData).length > 0) {
    info.ancestorData = ancestorData;
  }

  return info;
}
