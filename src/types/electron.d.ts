import type {
  RomApi,
  DeviceApi,
  SyncApi,
  DarkModeApi,
  UpdateApi,
  UtilApi,
  SettingsApi,
  DatabaseApi,
  DiagnosticsApi,
  RetroAchievementsApi,
  ArtworkApi,
} from './electron-api';

declare global {
  interface Window {
    rom: RomApi;
    device: DeviceApi;
    sync: SyncApi;
    settings: SettingsApi;
    db: DatabaseApi;
    diagnostics: DiagnosticsApi;
    ra: RetroAchievementsApi;
    darkMode: DarkModeApi;
    util: UtilApi;
    update: UpdateApi;
    artwork: ArtworkApi;
  }
}
