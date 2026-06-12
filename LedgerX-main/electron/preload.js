/**
 * preload.js – LedgerX Electron preload (HARDENED v4)
 *
 * Runs with Node.js access before the renderer page loads.
 * contextIsolation = true, so the renderer cannot access Node globals.
 *
 * Use contextBridge.exposeInMainWorld() to expose ONLY the specific APIs
 * the renderer needs. Never expose `require`, `process`, or `ipcRenderer`
 * directly.
 *
 * Currently exposes:
 *   window.ledgerx.platform  — 'electron' (lets the app adjust UI)
 *   window.ledgerx.version   — Electron app version
 *
 * Future IPC channels (when needed):
 *   window.ledgerx.openSaveDialog(options) → string | null
 *   window.ledgerx.writeFile(path, data)   → void
 *   window.ledgerx.readFile(path)          → string
 *
 * IPC SECURITY RULES (when adding new channels):
 *   1. Allowlist channel names in main.js — never use dynamic channel names.
 *   2. Validate all arguments in main.js before any Node.js operation.
 *   3. Never return raw file system errors to the renderer.
 *   4. File paths must be validated against an allowed root directory.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ledgerx', {
  /** Identifies the runtime for conditional UI (e.g., native file pickers). */
  platform: 'electron',

  /** Returns the current Electron app version (from package.json). */
  version: process.env.npm_package_version ?? 'unknown',
});
