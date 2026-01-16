import { autoUpdater, dialog, type BrowserWindow } from 'electron';
import logger from 'electron-log/main';
import { updateElectronApp, UpdateSourceType } from 'update-electron-app';
import { setUpdateMenuStatus } from '@main/menu/state';

const log = logger.scope('updater');

let isChecking = false;

export function initializeUpdater(mainWindow: BrowserWindow): void {
  log.info(`Initializing auto-updates for ${process.platform} ${process.arch}`);
  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.StaticStorage,
      baseUrl: `https://romie.jzimz.com/releases/${process.platform}/${process.arch}`,
    },
    logger: log,
    onNotifyUser: ({ releaseName }) => {
      log.debug('Notifying user of update:', releaseName);
      mainWindow.webContents.send('update:ready', releaseName);
    },
  });

  autoUpdater.on('update-downloaded', () => {
    setUpdateMenuStatus('ready');
  });
}

export function checkForUpdates(mainWindow: BrowserWindow): void {
  if (isChecking) return;
  isChecking = true;

  log.info('Manual update check triggered');
  setUpdateMenuStatus('checking');

  const cleanup = () => {
    isChecking = false;
    autoUpdater.removeListener('update-downloaded', onUpdateDownloaded);
    autoUpdater.removeListener('update-not-available', onUpdateNotAvailable);
    autoUpdater.removeListener('error', onError);
  };

  const onUpdateDownloaded = async () => {
    cleanup();
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: 'A new version is ready to install!',
      detail: 'Restart ROMie to apply the update.',
      buttons: ['Restart', 'Later'],
      defaultId: 0,
    });
    if (response === 0) {
      quitAndInstall();
    }
  };

  const onUpdateNotAvailable = () => {
    cleanup();
    setUpdateMenuStatus('idle');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'No Updates Available',
      message: "You're up to date!",
      detail: 'ROMie is running the latest version.',
      buttons: ['OK'],
    });
  };

  const onError = (error: Error) => {
    cleanup();
    setUpdateMenuStatus('idle');
    log.error('Update check failed:', error);
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Update Check Failed',
      message: 'Could not check for updates',
      detail: 'Please check your internet connection and try again.',
      buttons: ['OK'],
    });
  };

  autoUpdater.once('update-downloaded', onUpdateDownloaded);
  autoUpdater.once('update-not-available', onUpdateNotAvailable);
  autoUpdater.once('error', onError);

  autoUpdater.checkForUpdates();
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}
