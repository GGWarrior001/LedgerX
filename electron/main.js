const { app, BrowserWindow, protocol, net, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Register 'app' as a privileged scheme before the app is ready.
// This gives the renderer a stable, secure origin (app://localhost) instead
// of file://, which Firebase Auth's SDK rejects in some environments.
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

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
  });

  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  win.webContents.on('will-navigate', (event, url) => {
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

app.whenReady().then(() => {
  const distRoot = path.join(__dirname, '../dist');

  // Serve all app:// requests from the dist folder.
  // Unknown paths fall back to index.html so that the React Router SPA works.
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

    if (!filePath.startsWith(`${distRootResolved}${path.sep}`) && filePath !== distRootResolved) {
      filePath = path.join(distRootResolved, 'index.html');
    }

    try {
      if (fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distRootResolved, 'index.html');
      }
    } catch {
      // File does not exist; serve index.html for SPA client-side routing
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
