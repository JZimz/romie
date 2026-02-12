import type {
  RomApi,
  DocumentApi,
  DeviceApi,
  SyncApi,
  DarkModeApi,
  UpdateApi,
  UtilApi,
  SettingsApi,
  DatabaseApi,
  DiagnosticsApi,
  RetroAchievementsApi,
} from './electron-api';

declare global {
  interface Window {
    rom: RomApi;
    documents: DocumentApi;
    documentApi: DocumentApi; // backwards compatibility alias
    device: DeviceApi;
    sync: SyncApi;
    settings: SettingsApi;
    db: DatabaseApi;
    diagnostics: DiagnosticsApi;
    ra: RetroAchievementsApi;
    darkMode: DarkModeApi;
    util: UtilApi;
    update: UpdateApi;
  }
}
