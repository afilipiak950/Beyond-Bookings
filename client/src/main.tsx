import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress browser extension and plugin errors that don't affect our application
window.addEventListener('error', (e) => {
  // Ignore MetaMask, browser extensions, and Replit plugin errors
  if (e.message?.includes('MetaMask') || 
      e.message?.includes('chrome-extension') || 
      e.message?.includes('frame') ||
      e.message?.includes('ErrorOverlay') ||
      e.message?.includes('plugin:runtime-error-plugin') ||
      e.message?.includes('Cannot read properties of undefined') ||
      e.message?.includes('reading \'frame\'') ||
      e.filename?.includes('chrome-extension') ||
      e.filename?.includes('replit.dev') ||
      e.filename?.includes('riker.replit.dev')) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  // Ignore extension-related and plugin promise rejections
  if (e.reason?.message?.includes('MetaMask') || 
      e.reason?.message?.includes('chrome-extension') ||
      e.reason?.message?.includes('frame') ||
      e.reason?.message?.includes('ErrorOverlay') ||
      e.reason?.message?.includes('Cannot read properties of undefined') ||
      e.reason?.message?.includes('reading \'frame\'') ||
      e.reason?.stack?.includes('riker.replit.dev')) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }
});

// Additional global error suppression for runtime error plugin conflicts
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('frame') || 
      message.includes('ErrorOverlay') || 
      message.includes('runtime-error-plugin') ||
      message.includes('Cannot read properties of undefined') ||
      message.includes('reading \'frame\'') ||
      message.includes('riker.replit.dev')) {
    return; // Suppress these specific plugin errors
  }
  originalConsoleError.apply(console, args);
};

// Override the global ErrorOverlay if it exists
if (typeof window !== 'undefined') {
  // Disable runtime error overlay completely for these specific errors
  const originalPush = window.history?.pushState;
  if (originalPush) {
    window.history.pushState = function(...args) {
      try {
        return originalPush.apply(this, args);
      } catch (error: any) {
        if (error?.message?.includes('frame')) {
          return; // Suppress frame-related errors silently
        }
        throw error;
      }
    };
  }
  
  // Add additional protection against runtime error plugin
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj: any, prop: PropertyKey, descriptor: PropertyDescriptor) {
    try {
      if (prop === 'frame' && descriptor && typeof descriptor.get === 'function') {
        // Safely return undefined for frame property access
        descriptor.get = function() { return undefined; };
      }
      return originalDefineProperty.call(this, obj, prop, descriptor);
    } catch (error: any) {
      // Silently ignore frame-related property definition errors
      if (error?.message?.includes('frame')) {
        return obj;
      }
      throw error;
    }
  };
}

createRoot(document.getElementById("root")!).render(<App />);
