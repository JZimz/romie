import { shell, ipcMain } from 'electron';
import { quitAndInstall } from '@main/updater';
import { registerDarkModeIpc } from './darkMode';
import { registerRomIpc } from './rom';
import { registerDeviceIpc } from './device';
import { registerSyncIpc } from './sync';
import { registerSettingsIpc } from './settings';
import { registerDatabaseIpc } from './database';

export function registerAllIpc() {
  registerDarkModeIpc();
  registerRomIpc();
  registerDeviceIpc();
  registerSyncIpc();
  registerSettingsIpc();
  registerDatabaseIpc();

  // General utilities
  ipcMain.handle('util:openExternal', (_, url) => shell.openExternal(url));
  ipcMain.handle('update:quitAndInstall', () => quitAndInstall());
}
