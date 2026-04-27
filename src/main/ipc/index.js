import { shell, ipcMain } from 'electron';
import { quitAndInstall } from '@main/updater';
import { registerDarkModeIpc } from './darkMode';
import { registerRomIpc } from './rom';
import { registerDeviceIpc } from './device';
import { registerSyncIpc } from './sync';
import { registerSettingsIpc } from './settings';
import { registerDatabaseIpc } from './database';
import { registerDiagnosticsIpc } from './diagnostics';
import { registerArtworkIpc } from '@main/artwork';

export function registerAllIpc() {
  registerDarkModeIpc();
  registerRomIpc();
  registerDeviceIpc();
  registerSyncIpc();
  registerSettingsIpc();
  registerDatabaseIpc();
  registerDiagnosticsIpc();
  registerArtworkIpc();

  // General utilities
  ipcMain.handle('util:openExternal', (_, url) => shell.openExternal(url));
  ipcMain.handle('update:quitAndInstall', () => quitAndInstall());
}
