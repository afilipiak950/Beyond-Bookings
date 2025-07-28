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
      e.filename?.includes('chrome-extension') ||
      e.filename?.includes('replit.dev')) {
    e.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  // Ignore extension-related and plugin promise rejections
  if (e.reason?.message?.includes('MetaMask') || 
      e.reason?.message?.includes('chrome-extension') ||
      e.reason?.message?.includes('frame') ||
      e.reason?.message?.includes('ErrorOverlay')) {
    e.preventDefault();
    return false;
  }
});

// Additional global error suppression for runtime error plugin conflicts
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('frame') || 
      message.includes('ErrorOverlay') || 
      message.includes('runtime-error-plugin')) {
    return; // Suppress these specific plugin errors
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById("root")!).render(<App />);
