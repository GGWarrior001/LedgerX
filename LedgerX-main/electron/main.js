/**
 * electron/main.js – LedgerX Electron main process (HARDENED v4)
 *
 * Security additions (C-4 / Electron Phase 7):
 *   - Strict CSP set via session.defaultSession.webRequest.onHeadersReceived
 *   - CSP policy: script-src 'self'; object-src 'none'; base-uri 'none'
 *   - Navigation restrictions: only app://localhost allowed
 *   - External links: only HTTPS, opened in system browser
 *   - All permission requests denied
 *   - Path traversal protection preserved (verified correct in audit)
 *   - No IPC handler exposed yet — preload.js has contextBridge scaffold
 *
 * Existing security features (confirmed correct):
 *   contextIsolation: true ✓
 *   nodeIntegration: false ✓
 *   sandbox: true ✓
 *   webSecurity: true ✓
 */

const { app, BrowserWindow, protocol, net, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

// ── Content Security Policy ───────────────────────────────────────────────────

/**
 * Strict CSP for the app:// origin.
 *
 * - script-src 'self':      Only scripts from our bundle, no inline scripts
 * - connect-src:            Firebase, Firestore, Firebase Auth endpoints
 * - style-src 'self' 'unsafe-inline': Tailwind injects inline styles (Radix UI)
 * - img-src 'self' data: blob:: Dashboard avatars, chart images
 * - font-src 'self':        Bundled fonts only
 * - object-src 'none':      No Flash/plugins
 * - base-uri 'none':        Prevent base tag injection
 * - frame-ancestors 'none': Prevent embedding in iframes
 */
const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

function applyCspHeaders(ses) {
  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP_POLICY],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'Referrer-Policy': ['no-referrer'],
      },
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    title: 'LedgerX',
  });

  // Deny all new window / popup requests
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
  });

  // Deny all permission requests (camera, microphone, notifications, etc.)
  win.webContents.session.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false)
  );

  // Prevent navigation away from app://localhost
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedAppUrl(url)) {
      event.preventDefault();
    }
  });

  // Same-page navigation guard
  win.webContents.on('will-redirect', (event, url) => {
    if (!isAllowedAppUrl(url)) {
      event.preventDefault();
    }
  });

  win.loadURL('app://localhost/index.html');
}

function isAllowedAppUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'app:' && parsed.hostname === 'localhost';
  } catch {
    return false;
  }
}

function isAllowedExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Apply CSP to the default session before any window is created
  applyCspHeaders(session.defaultSession);

  const distRoot = path.join(__dirname, '../dist');

  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    const distRootResolved = path.resolve(distRoot);

    let requestedPath = '/index.html';
    try {
      requestedPath = decodeURIComponent(pathname);
    } catch {
      requestedPath = '/index.html';
    }

    let filePath = path.resolve(distRootResolved, `.${requestedPath}`);

    // Path traversal protection: reject anything escaping distRoot
    if (
      !filePath.startsWith(`${distRootResolved}${path.sep}`) &&
      filePath !== distRootResolved
    ) {
      filePath = path.join(distRootResolved, 'index.html');
    }

    try {
      if (fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distRootResolved, 'index.html');
      }
    } catch {
      filePath = path.join(distRootResolved, 'index.html');
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
