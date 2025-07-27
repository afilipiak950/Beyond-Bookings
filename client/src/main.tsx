import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress browser extension errors that don't affect our application
window.addEventListener('error', (e) => {
  // Ignore MetaMask and other extension errors
  if (e.message?.includes('MetaMask') || 
      e.message?.includes('chrome-extension') || 
      e.message?.includes('frame') ||
      e.filename?.includes('chrome-extension')) {
    e.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  // Ignore extension-related promise rejections
  if (e.reason?.message?.includes('MetaMask') || 
      e.reason?.message?.includes('chrome-extension')) {
    e.preventDefault();
    return false;
  }
});

createRoot(document.getElementById("root")!).render(<App />);
