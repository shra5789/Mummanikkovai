// Mummanikkovai lyrics widget — Electron main process.
// A small, frameless, transparent, always-on-top window that plays the
// recording through YouTube's embedded player and shows the lyrics in sync.

const { app, BrowserWindow, Tray, Menu, ipcMain, screen, globalShortcut, nativeImage, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const ICON = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
const PREFERRED_PORT = 47823; // fixed so the page origin (and YouTube's view of it) stays stable
const FULL_DEFAULT = { width: 420, height: 300 };
const COMPACT = { width: 320, height: 52 };

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let win = null;
let tray = null;
let settings = {};
let settingsFile = '';
let compact = false;
let quitting = false;

// ---------- settings ----------
function loadSettings() {
  settingsFile = path.join(app.getPath('userData'), 'settings.json');
  try { settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); } catch { settings = {}; }
}
let saveTimer = null;
function saveSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2)); } catch (e) { console.error(e); }
  }, 250);
}

// ---------- tiny static server (YouTube embeds need a real http origin, not file://) ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function startServer() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
    const file = path.normalize(path.join(SRC_DIR, rel));
    if (!file.startsWith(SRC_DIR)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.once('error', () => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
    server.listen(PREFERRED_PORT, '127.0.0.1', () => resolve(server.address().port));
  });
}

// ---------- window ----------
function visibleBounds(b) {
  // keep the saved position on a screen that still exists
  const area = screen.getDisplayMatching(b).workArea;
  const inside = b.x < area.x + area.width - 40 && b.x + b.width > area.x + 40 && b.y >= area.y - 10 && b.y < area.y + area.height - 40;
  if (inside) return b;
  return { ...b, x: area.x + area.width - b.width - 24, y: area.y + area.height - b.height - 24 };
}

function createWindow(port) {
  const area = screen.getPrimaryDisplay().workArea;
  const saved = settings.bounds || { ...FULL_DEFAULT, x: area.x + area.width - FULL_DEFAULT.width - 24, y: area.y + area.height - FULL_DEFAULT.height - 24 };
  const b = visibleBounds(saved);

  win = new BrowserWindow({
    ...b,
    minWidth: 260, minHeight: 140,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    title: 'Mummanikkovai',
    icon: ICON,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // keep audio + timing alive when the widget isn't focused
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver'); // stay above normal windows, including maximised ones
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.loadURL(`http://127.0.0.1:${port}/index.html`);
  win.once('ready-to-show', () => win.show());

  const remember = () => {
    if (!win || compact || win.isMinimized()) return;
    settings.bounds = win.getBounds();
    saveSettings();
  };
  win.on('moved', remember);
  win.on('resized', remember);
  win.on('close', (e) => {
    // the × button only hides to the tray; quitting happens from the tray menu
    if (!quitting) { e.preventDefault(); win.hide(); }
  });

  // open any external link (e.g. "open on YouTube") in the user's browser
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

function setCompact(on) {
  if (!win || on === compact) return;
  if (on) {
    settings.bounds = win.getBounds();
    saveSettings();
    const b = win.getBounds();
    compact = true;
    win.setMinimumSize(200, COMPACT.height);
    win.setResizable(false);
    // keep the pill anchored to the bottom-right of where the widget was
    win.setBounds({ x: b.x + b.width - COMPACT.width, y: b.y + b.height - COMPACT.height, ...COMPACT });
  } else {
    compact = false;
    const pill = win.getBounds();
    const full = settings.bounds || { ...FULL_DEFAULT };
    win.setResizable(true);
    win.setMinimumSize(260, 140);
    win.setBounds(visibleBounds({
      x: pill.x + pill.width - full.width, y: pill.y + pill.height - full.height, width: full.width, height: full.height,
    }));
  }
  win.webContents.send('compact-changed', compact);
  rebuildTrayMenu();
}

function toggleVisible() {
  if (!win) return;
  if (win.isVisible()) win.hide(); else { win.show(); win.setAlwaysOnTop(true, 'screen-saver'); }
  rebuildTrayMenu();
}

function rebuildTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: win && win.isVisible() ? 'Hide widget' : 'Show widget', click: toggleVisible },
    { label: compact ? 'Expand' : 'Minimize to pill', click: () => { if (!win.isVisible()) win.show(); setCompact(!compact); } },
    { label: 'Play / Pause', click: () => win && win.webContents.send('command', 'toggle-play') },
    { type: 'separator' },
    {
      label: 'Always on top', type: 'checkbox', checked: settings.alwaysOnTop !== false,
      click: (item) => {
        settings.alwaysOnTop = item.checked; saveSettings();
        win.setAlwaysOnTop(item.checked, 'screen-saver');
      },
    },
    {
      label: 'Start with Windows', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { type: 'separator' },
    { label: 'Quit', click: () => { quitting = true; app.quit(); } },
  ]));
}

function createTray() {
  const img = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip('Mummanikkovai lyrics  (Ctrl+Alt+L)');
  tray.on('click', toggleVisible);
  rebuildTrayMenu();
}

// ---------- IPC ----------
ipcMain.handle('settings:get', () => settings);
ipcMain.on('settings:set', (_e, patch) => { Object.assign(settings, patch); saveSettings(); });
ipcMain.on('win:compact', (_e, on) => setCompact(!!on));
ipcMain.on('win:hide', () => { win && win.hide(); rebuildTrayMenu(); });
ipcMain.on('win:quit', () => { quitting = true; app.quit(); });

// ---------- app lifecycle ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { win.show(); setCompact(false); } });
  app.whenReady().then(async () => {
    if (process.platform === 'win32') app.setAppUserModelId('com.mummanikkovai.widget');
    loadSettings();
    const port = await startServer();
    createWindow(port);
    if (settings.alwaysOnTop === false) win.setAlwaysOnTop(false);
    createTray();
    globalShortcut.register('CommandOrControl+Alt+L', toggleVisible);
  });
  app.on('before-quit', () => { quitting = true; });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => app.quit());
}
