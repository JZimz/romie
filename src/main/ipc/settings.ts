import { ipcMain } from 'electron';
import { addRetroAchievementsConfig } from '@main/roms/romDatabase';
import { settings, integrations } from '@main/db/queries';
import { getUserProfile, getGameInfoAndUserProgress } from '@main/retroachievements';
import { AppSettings, RetroAchievementsConfig } from '@/types/settings';

export function registerSettingsIpc() {
  // App settings
  ipcMain.handle('settings:get', async (_) => {
    const allSettings = settings.getAll();
    return {
      theme: (allSettings.theme as AppSettings['theme']) || 'system',
    };
  });
  ipcMain.handle('settings:update', async (_, update: Partial<AppSettings>) => {
    const next: Record<string, string> = {};
    if (update.theme) next.theme = update.theme;
    settings.setMany(next);
    return { theme: (settings.get('theme') as AppSettings['theme']) ?? 'system' };
  });

  // TODO: Move to own ipc file.
  // RetroAchievements integration
  ipcMain.handle('ra:setConfig', (_, config: RetroAchievementsConfig) =>
    addRetroAchievementsConfig(config)
  );
  ipcMain.handle('ra:getConfig', (_) => integrations.getRetroAchievements());
  ipcMain.handle('ra:removeConfig', (_) => integrations.removeRetroAchievements());
  ipcMain.handle('ra:getUserProfile', () => getUserProfile());
  ipcMain.handle('ra:getGameInfoAndUserProgress', (_, romHash: string) =>
    getGameInfoAndUserProgress(romHash)
  );
}
