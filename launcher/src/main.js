const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, protocol, shell } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const { execFile, exec } = require('child_process');
const os = require('os');

const STORE_API = 'https://primers-store.onrender.com/api';
const INSTALL_DIR = path.join(os.homedir(), 'AppData', 'Local', 'PrimersStore', 'installers');
const DIST_DIR = path.join(__dirname, '..', '..', 'client', 'dist');

let mainWindow = null;
let tray = null;

// Serve React build via custom protocol so React Router works
function registerProtocol() {
  protocol.registerFileProtocol('primers', (request, callback) => {
    let url = request.url.replace('primers://', '').split('?')[0].split('#')[0];
    if (!url || url === '/') url = 'index.html';
    url = url.replace(/^\//, '');
    const filePath = path.join(DIST_DIR, url);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      callback(filePath);
    } else {
      // All unknown paths → index.html so React Router handles them
      callback(path.join(DIST_DIR, 'index.html'));
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#f9fafb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // allow local file loads
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    show: false,
  });

  mainWindow.loadURL('primers://index.html');

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Keep React Router working on reload
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('primers://')) {
      e.preventDefault();
      if (url.startsWith('http') || url.startsWith('https')) {
        shell.openExternal(url);
      }
    }
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Primers Store');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Primers Store', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.exit(0) },
  ]));
  tray.on('click', () => { mainWindow.show(); mainWindow.focus(); });
}

// Stream download a file with real progress events
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const file = fs.createWriteStream(destPath);
    const proto = url.startsWith('https') ? https : http;

    const get = (targetUrl) => {
      proto.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          return get(res.headers.location); // follow redirect
        }
        if (res.statusCode !== 200) {
          file.close();
          return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let received = 0;
        res.on('data', chunk => {
          received += chunk.length;
          if (total > 0) onProgress(Math.round((received / total) * 100));
        });
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(destPath); });
      }).on('error', (err) => { file.close(); fs.unlinkSync(destPath); reject(err); });
    };

    get(url);
  });
}

// IPC: install app natively
ipcMain.handle('native:install', async (event, { slug, name, version, fileUrl }) => {
  const safe = slug.replace(/[^a-z0-9-]/g, '');
  const destPath = path.join(INSTALL_DIR, `${safe}-${version}.exe`);

  try {
    await downloadFile(fileUrl, destPath, (pct) => {
      event.sender.send('native:progress', { slug, pct, phase: 'downloading' });
    });

    event.sender.send('native:progress', { slug, pct: 100, phase: 'installing' });

    // Run installer silently
    await new Promise((resolve, reject) => {
      execFile(destPath, ['/S'], { timeout: 120000 }, (err) => {
        if (err) reject(err); else resolve();
      });
    });

    event.sender.send('native:installed', { slug });
    return { success: true };
  } catch (err) {
    event.sender.send('native:error', { slug, error: err.message });
    return { success: false, error: err.message };
  }
});

// IPC: uninstall via Windows registry
ipcMain.handle('native:uninstall', async (event, { slug, name }) => {
  // Search both HKLM and HKCU
  const keys = [
    `HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall`,
    `HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall`,
    `HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall`,
  ];

  for (const key of keys) {
    try {
      const stdout = await new Promise((res, rej) =>
        exec(`reg query "${key}" /s /f "${name}" /t REG_SZ`, (e, o) => e ? rej(e) : res(o))
      );
      const match = stdout.match(/UninstallString\s+REG_SZ\s+(.+)/i);
      if (match) {
        const cmd = match[1].trim().replace(/"/g, '');
        await new Promise((res, rej) =>
          exec(`"${cmd}" /S`, (e) => e ? rej(e) : res())
        );
        event.sender.send('native:uninstalled', { slug });
        return { success: true };
      }
    } catch {}
  }

  return { success: false, error: 'App not found in Windows registry' };
});

// IPC: window controls
ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.on('win:close', () => mainWindow?.hide());

app.whenReady().then(() => {
  protocol.registerSchemesAsPrivileged
    ? null
    : null; // handled in app.on('ready')
  registerProtocol();
  createWindow();
  createTray();
});

app.on('before-quit', () => tray?.destroy());

module.exports = {};
