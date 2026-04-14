const { app, BrowserWindow, protocol, net } = require('electron');
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
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    title: 'LedgerX',
  });

  win.loadURL('app://localhost/index.html');
}

app.whenReady().then(() => {
  const distRoot = path.join(__dirname, '../dist');

  // Serve all app:// requests from the dist folder.
  // Unknown paths fall back to index.html so that the React Router SPA works.
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    let filePath = path.join(distRoot, pathname);
    try {
      if (fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distRoot, 'index.html');
      }
    } catch {
      // File does not exist; serve index.html for SPA client-side routing
      filePath = path.join(distRoot, 'index.html');
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
