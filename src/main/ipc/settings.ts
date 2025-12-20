import { ipcMain } from 'electron';
import {
  getAppSettings,
  updateAppSettings,
  addRetroAchievementsConfig,
  getRetroAchievementsConfig,
  removeRetroAchievementsConfig,
} from '@main/database';
import { getUserProfile, getGameInfoAndUserProgress } from '@main/retroachievements';
import { AppSettings, RetroAchievementsConfig } from '@/types/settings';

export function registerSettingsIpc() {
  // App settings
  ipcMain.handle('settings:get', (_) => getAppSettings());
  ipcMain.handle('settings:update', (_, settingsUpdate: Partial<AppSettings>) =>
    updateAppSettings(settingsUpdate)
  );

  // TODO: Move to own ipc file.
  // RetroAchievements integration
  ipcMain.handle('ra:setConfig', (_, config: RetroAchievementsConfig) =>
    addRetroAchievementsConfig(config)
  );
  ipcMain.handle('ra:getConfig', (_) => getRetroAchievementsConfig());
  ipcMain.handle('ra:removeConfig', (_) => removeRetroAchievementsConfig());
  ipcMain.handle('ra:getUserProfile', () => getUserProfile());
  ipcMain.handle('ra:getGameInfoAndUserProgress', (_, romHash: string) =>
    getGameInfoAndUserProgress(romHash)
  );
}
