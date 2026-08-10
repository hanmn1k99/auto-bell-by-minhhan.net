const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
let mainWindow = null;
let tray = null;
let isQuiting = false;

// Kích hoạt chạy cùng Windows
app.setLoginItemSettings({
  openAtLogin: true,
  path: app.getPath('exe'),
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: path.join(__dirname, 'tray-icon.png'),
    autoHideMenuBar: true, // Ẩn thanh menu
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // Tắt autoplay policy để web có thể tự động phát nhạc mà không cần click
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  // Chặn tắt app, thu nhỏ xuống tray
  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  loadAppContent();
}

function loadAppContent() {
  const serverUrl = store.get('serverUrl');

  if (serverUrl) {
    // Tự động append /player
    const targetUrl = serverUrl.endsWith('/player') ? serverUrl : `${serverUrl}/player`;
    
    mainWindow.loadURL(targetUrl).catch(() => {
      // Nếu không kết nối được, có thể tải lại setup hoặc hiện thông báo
      // Tạm thời quay về setup nếu lỗi nặng
      mainWindow.loadFile('setup.html');
    });
  } else {
    mainWindow.loadFile('setup.html');
  }
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'tray-icon.png')); // Hãy đảm bảo có file tray-icon.png
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
  tray.setToolTip('AutoBell Player');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  // Khởi tạo tray
  // Lưu ý: Cần tạo 1 file tray-icon.png giả tạm nếu chưa có
  try {
    createTray();
  } catch (err) {
    console.error('Tray icon not found, please add tray-icon.png', err);
  }

  ipcMain.on('save-config', (event, config) => {
    if (config.serverUrl) {
      store.set('serverUrl', config.serverUrl);
      loadAppContent(); // Load lại player
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
