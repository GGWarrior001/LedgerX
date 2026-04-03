// Preload script runs in the renderer process before the page is loaded.
// contextIsolation is enabled so the renderer has no access to Node.js APIs.
// Expose only safe, explicit APIs here via contextBridge if needed in the future.
window.addEventListener('DOMContentLoaded', () => {});
