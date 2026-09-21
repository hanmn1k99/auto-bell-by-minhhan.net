const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();

// ÉP CHROMIUM KHÔNG BAO GIỜ NGỦ ĐÔNG KHI CHẠY NGẦM
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
let mainWindow = null;
let tray = null;
let isQuiting = false;

// Kích hoạt chạy cùng Windows
function setupLoginSettings() {
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe'),
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.webContents.on('page-favicon-updated', (event, favicons) => {
    if (favicons && favicons.length > 0) {
      const faviconUrl = favicons[0];
      const { nativeImage, net } = require('electron');
      const request = net.request(faviconUrl);
      request.on('response', (response) => {
        const chunks = [];
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const image = nativeImage.createFromBuffer(buffer);
          if (mainWindow) mainWindow.setIcon(image);
          if (tray) tray.setImage(image);
        });
      });
      request.on('error', (err) => console.error('Failed to fetch favicon:', err));
      request.end();
    }
  });

  loadAppContent();
}

function loadAppContent() {
  const serverUrl = store.get('serverUrl');

  if (serverUrl) {
    const targetUrl = serverUrl.endsWith('/player') ? serverUrl : `${serverUrl}/player`;
    
    mainWindow.loadURL(targetUrl).catch((err) => {
      const { dialog } = require('electron');
      dialog.showErrorBox('Lỗi kết nối', 'Không thể kết nối tới server: ' + targetUrl + '\nLỗi chi tiết: ' + err.message);
      mainWindow.loadFile('setup.html');
    });
  } else {
    mainWindow.loadFile('setup.html');
  }
}

function createTray() {
  const trayPath = process.platform === 'win32' ? app.getPath('exe') : path.join(__dirname, 'icon.png');
  tray = new Tray(trayPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Mở Player', click: () => mainWindow.show() },
    { 
      label: 'Cài đặt lại Server (Domain)', 
      click: () => {
        store.delete('serverUrl');
        loadAppContent();
        mainWindow.show();
      } 
    },
    { type: 'separator' },
    { 
      label: 'Thoát hoàn toàn', 
      click: () => {
        isQuiting = true;
        app.quit();
      } 
    }
  ]);
  tray.setToolTip('Automation Audio System');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
  });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    setupLoginSettings();
    try {
      createTray();
    } catch (err) {
      console.error('Tray icon error', err);
    }

    ipcMain.on('save-config', (event, config) => {
      if (config.serverUrl) {
        store.set('serverUrl', config.serverUrl);
        loadAppContent();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
