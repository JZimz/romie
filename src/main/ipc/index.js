import { shell, ipcMain } from 'electron';
import { quitAndInstall } from '@main/updater';
import { registerDarkModeIpc } from './darkMode';
import { registerRomIpc } from './rom';
import { registerDocumentIpc } from './document';
import { registerDeviceIpc } from './device';
import { registerSyncIpc } from './sync';
import { registerSettingsIpc } from './settings';
import { registerDatabaseIpc } from './database';
import { registerDiagnosticsIpc } from './diagnostics';

export function registerAllIpc() {
  registerDarkModeIpc();
  registerRomIpc();
  registerDocumentIpc();
  registerDeviceIpc();
  registerSyncIpc();
  registerSettingsIpc();
  registerDatabaseIpc();
  registerDiagnosticsIpc();

  // General utilities
  ipcMain.handle('util:openExternal', (_, url) => shell.openExternal(url));
  ipcMain.handle('update:quitAndInstall', () => quitAndInstall());
}
