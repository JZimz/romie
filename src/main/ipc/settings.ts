import { ipcMain } from 'electron';
import { addRetroAchievementsConfig } from '@main/roms/romDatabase';
import { settings, integrations } from '@main/db/queries';
import { getUserProfile, getGameInfoAndUserProgress } from '@main/retroachievements';
import { AppSettings, RetroAchievementsConfig } from '@/types/settings';

function parseSystemOrder(raw: string | undefined): AppSettings['systemOrder'] {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) && value.every((v) => typeof v === 'string')
      ? (value as AppSettings['systemOrder'])
      : undefined;
  } catch {
    return undefined;
  }
}

function getUiSettings() {
  const { theme, systemOrder } = settings.getAll();

  return {
    theme: (theme as AppSettings['theme']) || 'system',
    systemOrder: parseSystemOrder(systemOrder),
  };
}

export function registerSettingsIpc() {
  ipcMain.handle('settings:get', getUiSettings);
  ipcMain.handle('settings:update', (_, update: Partial<AppSettings>) => {
    const next: Record<string, string> = {};
    if (update.theme) next.theme = update.theme;
    if (update.systemOrder) next.systemOrder = JSON.stringify(update.systemOrder);
    settings.setMany(next);

    return getUiSettings();
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
