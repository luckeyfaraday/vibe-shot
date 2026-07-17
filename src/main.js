const { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, nativeImage, shell, Tray } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { captureToFile } = require('./capture');
const { fileUrl } = require('./platform');

const SHORTCUT = 'CommandOrControl+Shift+4';
const MAX_CAPTURES = 8;

let mainWindow;
let tray;
let isCapturing = false;
let captureHistory = [];
let startupNotice = '';

function trayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="3" y="6" width="26" height="20" rx="6" fill="#181b1a"/>
      <path d="M11 11h3l1.2-2h4.6l1.2 2h1.8c1.2 0 2.2 1 2.2 2.2v7.6c0 1.2-1 2.2-2.2 2.2H9.2A2.2 2.2 0 0 1 7 20.8v-7.6C7 12 8 11 9.2 11H11Z" fill="none" stroke="#b7f34a" stroke-width="2"/>
      <circle cx="16" cy="17" r="3.5" fill="#b7f34a"/>
    </svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`).resize({ width: 18, height: 18 });
}

function statePath() {
  return path.join(app.getPath('userData'), 'state.json');
}

function desktopExecPath(filePath) {
  return `"${filePath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function ensureLinuxAutostart() {
  const appImagePath = process.env.APPIMAGE;
  if (!appImagePath || !fs.existsSync(appImagePath)) return;

  const autostartDirectory = path.join(app.getPath('home'), '.config', 'autostart');
  const autostartPath = path.join(autostartDirectory, 'vibeshot.desktop');
  const entry = `[Desktop Entry]\nName=VibeShot\nComment=Keep the screenshot shortcut ready\nExec=${desktopExecPath(appImagePath)} --hidden\nTerminal=false\nType=Application\nX-GNOME-Autostart-enabled=true\nStartupNotify=false\nStartupWMClass=vibeshot\n`;

  try {
    fs.mkdirSync(autostartDirectory, { recursive: true });
    const existing = fs.existsSync(autostartPath) ? fs.readFileSync(autostartPath, 'utf8') : '';
    if (existing !== entry) {
      fs.writeFileSync(autostartPath, entry);
      startupNotice = 'Shortcut will be ready automatically at login';
    }
  } catch (error) {
    console.warn('Could not create the VibeShot autostart entry:', error.message);
  }
}

function ensureWindowsAutostart() {
  if (process.platform !== 'win32' || !app.isPackaged) return;

  try {
    const settings = { path: process.execPath, args: ['--hidden'] };
    const wasEnabled = app.getLoginItemSettings(settings).openAtLogin;
    app.setLoginItemSettings({ ...settings, openAtLogin: true });
    if (!wasEnabled) startupNotice = 'Shortcut will be ready automatically at login';
  } catch (error) {
    console.warn('Could not enable VibeShot at login:', error.message);
  }
}

function ensureAutostart() {
  if (process.platform === 'win32') ensureWindowsAutostart();
  else if (process.platform === 'linux') ensureLinuxAutostart();
}

function loadState() {
  try {
    const state = JSON.parse(fs.readFileSync(statePath(), 'utf8'));
    captureHistory = (state.captures || [])
      .filter((item) => item?.filePath && fs.existsSync(item.filePath))
      .slice(0, MAX_CAPTURES);
  } catch {
    captureHistory = [];
  }
}

function saveState() {
  fs.mkdirSync(path.dirname(statePath()), { recursive: true });
  fs.writeFileSync(statePath(), JSON.stringify({ captures: captureHistory }, null, 2));
}

function publicCapture(item) {
  return {
    ...item,
    imageUrl: fileUrl(item.filePath)
  };
}

function sendState(extra = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('state', {
    captures: captureHistory.map(publicCapture),
    shortcut: SHORTCUT.replace('CommandOrControl', process.platform === 'darwin' ? '⌘' : 'Ctrl'),
    isCapturing,
    ...extra
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 410,
    height: 360,
    minWidth: 360,
    minHeight: 300,
    maxWidth: 540,
    show: false,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.webContents.on('did-finish-load', () => sendState(startupNotice ? { notice: startupNotice } : {}));
}

function positionAndShow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const { screen } = require('electron');
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const [width, height] = mainWindow.getSize();
  const { x, y, width: workWidth, height: workHeight } = display.workArea;
  mainWindow.setPosition(x + workWidth - width - 18, y + workHeight - height - 18, false);
  mainWindow.showInactive();
}

function captureDirectory() {
  const directory = path.join(app.getPath('pictures'), 'VibeShot');
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function windowsCaptureScriptPath() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'capture-windows.ps1');
  return path.join(__dirname, 'capture-windows.ps1');
}

function captureErrorMessage(error) {
  if (error?.code === 'UNSUPPORTED_PLATFORM') return 'Screen capture is not supported on this platform';
  if (error?.code === 2) return 'Capture cancelled';
  if (error?.code === 'ENOENT' && process.platform === 'linux') return 'gnome-screenshot is required';
  if (error?.code === 'CAPTURE_OUTPUT_TIMEOUT') return 'No image was captured';
  if (error?.code === 'EMPTY_CAPTURE') return 'The captured image could not be read';
  if (error?.signal) return `Capture failed (${error.signal})`;
  return 'Could not capture the screen';
}

async function runCapture(mode = 'region') {
  if (isCapturing) return false;
  isCapturing = true;
  sendState();
  mainWindow?.hide();

  let stateUpdate;

  try {
    const filePath = path.join(captureDirectory(), `vibeshot-${timestamp()}.png`);
    await captureToFile(mode, filePath, {
      platform: process.platform,
      windowsScriptPath: windowsCaptureScriptPath()
    });

    const image = nativeImage.createFromPath(filePath);
    if (image.isEmpty()) {
      const error = new Error(`Capture output is not a readable image: ${filePath}`);
      error.code = 'EMPTY_CAPTURE';
      throw error;
    }

    const size = image.getSize();
    const capture = {
      id: `${Date.now()}`,
      filePath,
      fileName: path.basename(filePath),
      width: size.width,
      height: size.height,
      createdAt: new Date().toISOString()
    };
    captureHistory = [capture, ...captureHistory].slice(0, MAX_CAPTURES);
    saveState();
    clipboard.writeImage(image);
    stateUpdate = { notice: 'Captured and copied' };
    return true;
  } catch (error) {
    console.warn('Capture failed:', error.message);
    stateUpdate = { error: captureErrorMessage(error) };
    return false;
  } finally {
    isCapturing = false;
    sendState(stateUpdate);
    positionAndShow();
  }
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip(`VibeShot — ${SHORTCUT}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Capture region', accelerator: SHORTCUT, click: () => runCapture('region') },
    { label: 'Capture window', click: () => runCapture('window') },
    { label: 'Capture screen', click: () => runCapture('screen') },
    { type: 'separator' },
    { label: 'Show shelf', click: positionAndShow },
    { label: 'Open captures folder', click: () => shell.openPath(captureDirectory()) },
    { type: 'separator' },
    { label: 'Quit VibeShot', click: () => { app.isQuitting = true; app.quit(); } }
  ]));
  tray.on('click', () => mainWindow?.isVisible() ? mainWindow.hide() : positionAndShow());
}

function findCapture(id) {
  return captureHistory.find((capture) => capture.id === id);
}

ipcMain.handle('capture', (_event, mode) => runCapture(mode));
ipcMain.handle('copy', (_event, id) => {
  const capture = findCapture(id);
  if (!capture) return false;
  clipboard.writeImage(nativeImage.createFromPath(capture.filePath));
  return true;
});
ipcMain.handle('reveal', (_event, id) => {
  const capture = findCapture(id);
  if (capture) shell.showItemInFolder(capture.filePath);
});
ipcMain.handle('remove', (_event, id) => {
  captureHistory = captureHistory.filter((capture) => capture.id !== id);
  saveState();
  sendState();
});
ipcMain.handle('clear', () => {
  captureHistory = [];
  saveState();
  sendState();
});
ipcMain.handle('hide', () => mainWindow?.hide());
ipcMain.handle('open-folder', () => shell.openPath(captureDirectory()));
ipcMain.on('start-drag', (event, id) => {
  const capture = findCapture(id);
  if (!capture) return;
  const source = nativeImage.createFromPath(capture.filePath);
  const size = source.getSize();
  const scale = Math.min(1, 180 / Math.max(size.width, size.height));
  const icon = source.resize({
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale))
  });
  event.sender.startDrag({ file: capture.filePath, icon });
});

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (commandLine.includes('--capture')) runCapture('region');
    else positionAndShow();
  });
  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('dev.luckeyfaraday.vibeshot');
    ensureAutostart();
    loadState();
    createWindow();
    createTray();
    const registered = globalShortcut.register(SHORTCUT, () => runCapture('region'));
    if (!registered) sendState({ error: `Could not register ${SHORTCUT}` });
    if (process.argv.includes('--capture')) setTimeout(() => runCapture('region'), 150);
    else if (!process.argv.includes('--hidden')) positionAndShow();
  });
}

app.on('window-all-closed', () => {});
app.on('will-quit', () => globalShortcut.unregisterAll());
