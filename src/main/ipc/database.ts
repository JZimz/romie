import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  type OpenDialogOptions,
  type SaveDialogOptions,
} from 'electron';
import logger from 'electron-log/main';
import path from 'node:path';

import type { ApiResult, DatabaseBackupDialogResult } from '@/types/electron-api';
import {
  createDatabaseBackupZip,
  resetDatabase,
  restoreDatabaseFromZip,
} from '@main/db/databaseManagement';

const log = logger.scope('ipc:database');

export function registerDatabaseIpc() {
  ipcMain.handle(
    'db:exportBackup',
    async (event): Promise<ApiResult<DatabaseBackupDialogResult>> => {
      const browserWindow = BrowserWindow.fromWebContents(event.sender);

      const dateStr = new Date().toISOString().slice(0, 10);
      const defaultFileName = `romie-backup-${dateStr}.zip`;

      const saveDialogOptions: SaveDialogOptions = {
        title: 'Export Database Backup',
        defaultPath: path.join(app.getPath('downloads'), defaultFileName),
        buttonLabel: 'Save Backup',
        filters: [
          { name: 'ROMie Backup', extensions: ['zip'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      };

      const { filePath, canceled } = browserWindow
        ? await dialog.showSaveDialog(browserWindow, saveDialogOptions)
        : await dialog.showSaveDialog(saveDialogOptions);

      if (canceled || !filePath) {
        return { success: true, data: { canceled: true } };
      }

      try {
        await createDatabaseBackupZip(filePath);
        return { success: true, data: { canceled: false } };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        log.error('Failed to export database backup:', error);

        return {
          success: false,
          error: message,
          userMessage: 'Failed to export database backup.',
        };
      }
    }
  );

  ipcMain.handle(
    'db:importBackup',
    async (event): Promise<ApiResult<DatabaseBackupDialogResult>> => {
      const browserWindow = BrowserWindow.fromWebContents(event.sender);
      const openDialogOptions: OpenDialogOptions = {
        title: 'Restore Database Backup',
        buttonLabel: 'Restore',
        properties: ['openFile'],
        filters: [
          { name: 'ROMie Backup', extensions: ['zip'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      };

      const { filePaths, canceled } = browserWindow
        ? await dialog.showOpenDialog(browserWindow, openDialogOptions)
        : await dialog.showOpenDialog(openDialogOptions);

      if (canceled || filePaths.length === 0) {
        return { success: true, data: { canceled: true } };
      }

      const zipPath = filePaths[0];

      try {
        await restoreDatabaseFromZip(zipPath);

        setTimeout(() => {
          app.relaunch();
          app.exit(0);
        }, 1500);

        return { success: true, data: { canceled: false } };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        log.error('Failed to restore database from zip:', error);

        return {
          success: false,
          error: message,
          userMessage: 'Failed to restore database from backup zip.',
        };
      }
    }
  );

  ipcMain.handle('db:reset', async (): Promise<ApiResult<void>> => {
    try {
      await resetDatabase();

      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 1500);

      return { success: true, data: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to reset database:', error);

      return {
        success: false,
        error: message,
        userMessage: 'Failed to reset database.',
      };
    }
  });
}
