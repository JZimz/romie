import { app, BrowserWindow, nativeTheme, dialog } from 'electron';
import log from 'electron-log/main';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { init, setUser } from '@sentry/electron/main';
import { registerAllIpc } from '@main/ipc';
import { SENTRY_DSN, SENTRY_SAMPLE_RATE } from './sentry.config';
import { getInstanceId } from '@main/analytics';
import { initializeTheme } from '@main/themes';
import { initializeUpdater } from '@main/updater';
import { initializeDatabase } from '@main/db';

// Initialize sentry for error tracking
if (process.env.NODE_ENV !== 'development') {
  init({
    dsn: SENTRY_DSN,
    tracesSampleRate: SENTRY_SAMPLE_RATE,
  });
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 900,
    minHeight: 480,
    // Remove the window frame
    frame: 'false',
    // Hide the title bar but keep traffic lights on MacOS
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    // Hide the menu bar in windows and linux
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  if (process.env.NODE_ENV === 'development') {
    app.whenReady().then(async () => {
      try {
        const { default: installExtension, VUEJS_DEVTOOLS } =
          await import('electron-devtools-installer');
        const { name } = await installExtension(VUEJS_DEVTOOLS);
        log.debug(`Added Extension: ${name}`);
      } catch (err) {
        log.debug('An error occurred: ', err);
      } finally {
        mainWindow.webContents.openDevTools();
      }
    });
  }

  // Notify the renderer process when the native theme changes.
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const { shouldUseDarkColors } = nativeTheme;
      log.debug(`Native theme updated: isDark=${shouldUseDarkColors}`);
      mainWindow.webContents.send('dark-mode:change', shouldUseDarkColors);
    }
  });

  // Initialize the auto-updater
  initializeUpdater(mainWindow);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
  .whenReady()
  .then(async () => {
    // Initialize the logger for any renderer process
    log.initialize();
    // Use debug level in production during alpha testing
    log.transports.file.level = 'debug';
    log.info(
      `Romie v${app.getVersion()} is ready to rip on ${process.platform} with chrome@${process.versions.chrome}`
    );

    // Set up anonymous user tracking for analytics
    const instanceId = await getInstanceId();
    setUser({ id: instanceId });
    log.debug(`Analytics instance ID: ${instanceId}`);

    // Initialize app services
    initializeDatabase();
    registerAllIpc();
    await initializeTheme();

    createWindow();

    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Failed to initialize app:', error);

    dialog.showErrorBox(
      'ROMie Failed to Start',
      `An error occurred during startup:\n\n${message}\n\nCheck the logs for more details.`
    );

    // Exit the app
    app.quit();
  });

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
