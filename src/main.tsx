import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Automatic chunk-load recovery for dynamic imports
window.addEventListener('error', (event) => {
  const errorText = event.message || '';
  if (
    errorText.includes('Failed to fetch dynamically imported module') ||
    errorText.includes('TypeError: Failed to fetch dynamically imported module')
  ) {
    const hasReloaded = sessionStorage.getItem('chunk_load_failed');
    if (!hasReloaded) {
      sessionStorage.setItem('chunk_load_failed', 'true');
      console.warn('Chunk load failed. Forcing page reload to fetch latest bundle...');
      window.location.reload();
    } else {
      console.error(
        'Chunk load failed repeatedly. Page reload already attempted to prevent infinite loop.'
      );
    }
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reasonText = event.reason?.message || String(event.reason || '');
  if (
    reasonText.includes('Failed to fetch dynamically imported module') ||
    reasonText.includes('TypeError: Failed to fetch dynamically imported module')
  ) {
    const hasReloaded = sessionStorage.getItem('chunk_load_failed');
    if (!hasReloaded) {
      sessionStorage.setItem('chunk_load_failed', 'true');
      console.warn('Chunk load promise rejected. Forcing page reload to fetch latest bundle...');
      window.location.reload();
    } else {
      console.error(
        'Chunk load promise rejected repeatedly. Page reload already attempted to prevent infinite loop.'
      );
    }
  }
});


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
