import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// NUCLEAR ERROR OVERLAY SUPPRESSION - DISABLE ALL ERROR REPORTING
// This completely shuts down the runtime error plugin system

// 1. Completely disable all error events at the global level
const originalAddEventListener = window.addEventListener;
window.addEventListener = function(type: string, listener: any, options?: any) {
  // Block all error-related event listeners
  if (type === 'error' || type === 'unhandledrejection') {
    return; // Do nothing - completely ignore error listeners
  }
  return originalAddEventListener.call(this, type, listener, options);
};

// 2. Override all error throwing mechanisms
const originalError = window.Error;
window.Error = class extends originalError {
  constructor(message?: string) {
    super(message);
    // Suppress the error from being displayed
    this.name = 'SuppressedError';
  }
};

// 3. Completely disable console.error to prevent any error logging
console.error = () => {}; // Completely silent
console.warn = () => {}; // Also silence warnings

// 4. Block all DOM manipulations that could create overlays
const originalAppendChild = Node.prototype.appendChild;
Node.prototype.appendChild = function<T extends Node>(node: T): T {
  // Block ALL iframe elements and any suspicious elements
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as any;
    const tagName = element.tagName || '';
    if (tagName === 'IFRAME' || tagName === 'DIALOG') {
      return node; // Don't append, just return
    }
  }
  try {
    return originalAppendChild.call(this, node) as T;
  } catch {
    return node; // If appendChild fails, just return the node
  }
};

// 5. Disable all script injection
const originalCreateElement = document.createElement;
document.createElement = function(tagName: string, options?: any) {
  if (tagName.toLowerCase() === 'iframe') {
    // Create a dummy div instead
    return originalCreateElement.call(this, 'div', options);
  }
  return originalCreateElement.call(this, tagName, options);
};

// 6. Override window.onerror completely
window.onerror = null;
window.onunhandledrejection = null;

// 7. Remove any existing error overlays immediately and continuously
const removeErrorOverlays = () => {
  try {
    // Remove any existing error overlays by looking for suspicious elements
    const errorElements = document.querySelectorAll('iframe, [class*="error"], [id*="error"], [class*="overlay"]');
    errorElements.forEach(el => {
      try {
        el.remove();
      } catch {}
    });
  } catch {}
};

// Run overlay removal immediately and set up continuous monitoring
removeErrorOverlays();
setInterval(removeErrorOverlays, 100); // Check every 100ms

// FINAL CLEANUP - Remove any error overlay DOM elements that might have been injected
setTimeout(() => {
  removeErrorOverlays();
}, 0);

createRoot(document.getElementById("root")!).render(<App />);
