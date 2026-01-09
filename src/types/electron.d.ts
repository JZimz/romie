import type {
  RomApi,
  DeviceApi,
  SyncApi,
  DarkModeApi,
  UpdateApi,
  UtilApi,
  SettingsApi,
  DatabaseApi,
  RetroAchievementsApi,
} from './electron-api';

declare global {
  interface Window {
    rom: RomApi;
    device: DeviceApi;
    sync: SyncApi;
    settings: SettingsApi;
    db: DatabaseApi;
    ra: RetroAchievementsApi;
    darkMode: DarkModeApi;
    util: UtilApi;
    update: UpdateApi;
  }
}
