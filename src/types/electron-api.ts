import { SyncError } from '@/errors';
import type { DeviceProfile } from '@romie/device-profiles';
import type { Rom, RomDatabaseStats } from './rom';
import type { Device, StorageDevice } from '@/types/device';
import { AppSettings, RetroAchievementsConfig } from './settings';

import type { UserProfile, GameInfoAndUserProgress } from '@retroachievements/api';

export type ApiResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      userMessage?: string;
    };

export type RomImportResult = {
  canceled: boolean;
  imported: Rom[];
  failed: {
    file: string;
    reason: string;
  }[];
  totalProcessed: number;
};

export interface ImportStatus {
  currentFile: string;
}

export interface RomApi {
  list(): Promise<Rom[]>;
  remove(ids: string | string[]): Promise<void>;
  update(id: string, romUpdate: Partial<Rom>): Promise<void>;
  scan(): Promise<RomImportResult>;
  stats(): Promise<RomDatabaseStats>;
  refresh(): Promise<void>;
  onImportProgress(callback: (progress: ImportStatus) => void): () => void;
}

export interface DeviceMountStatus {
  accessible: boolean;
  freeSpace?: string;
  totalSpace?: string;
  freeBytes?: number;
  totalBytes?: number;
}

export interface DeviceApi {
  list(): Promise<Device[]>;
  listStorage(): Promise<StorageDevice[]>;
  listProfiles(): Promise<DeviceProfile[]>;
  create(data: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>): Promise<Device>;
  update(id: string, deviceUpdate: Partial<Device>): Promise<Device>;
  remove(id: string): Promise<void>;
  checkDeviceMount(deviceId: string): Promise<DeviceMountStatus>;
  uploadProfile(): Promise<ApiResult<DeviceProfile>>;
}

export interface SettingsApi {
  get(): Promise<AppSettings>;
  update(settingsUpdate: Partial<AppSettings>): Promise<AppSettings>;
}

export type DatabaseBackupDialogResult = {
  canceled: boolean;
};

export interface DatabaseApi {
  exportBackup(): Promise<ApiResult<DatabaseBackupDialogResult>>;
  importBackup(): Promise<ApiResult<DatabaseBackupDialogResult>>;
  reset(): Promise<ApiResult<void>>;
}

export interface DiagnosticsApi {
  exportLogs(): Promise<ApiResult<{ canceled: boolean }>>;
}

export interface RetroAchievementsApi {
  setConfig(config: RetroAchievementsConfig): Promise<void>;
  getConfig(): Promise<RetroAchievementsConfig | null>;
  removeConfig(): Promise<void>;
  getUserProfile(): Promise<UserProfile>;
  getGameInfoAndUserProgress(romHash: string): Promise<GameInfoAndUserProgress | null>;
}

export interface SyncOptions {
  cleanDestination: boolean;
  verifyFiles: boolean;
  useCleanNames: boolean;
}

/**
 * Real-time status of a sync operation.
 *
 * All files are accounted for: totalFiles = processed + skipped + failed
 */
export interface SyncStatus {
  phase: 'idle' | 'preparing' | 'copying' | 'verifying' | 'done' | 'error';
  currentFile?: string;
  error?: SyncError;
  /** Total files selected for sync */
  totalFiles: number;
  /** Files successfully processed */
  filesProcessed: number;
  /** Progress as percentage (0-100) */
  progressPercent: number;
  /** Files skipped (unsupported format, already exists, etc.) */
  filesSkipped: SyncSkipReason[];
  /** Files that failed to copy or verify */
  filesFailed: SyncFailReason[];
}

export interface SyncWarning {
  rom: Rom;
  message: string;
}

export interface SyncFailReason {
  rom: Rom;
  error: SyncError;
}
export interface SyncSkipReason {
  rom: Rom;
  reason: 'unsupported_system' | 'unsupported_format' | 'file_exists' | 'missing_system_mapping';
  details: string;
}

export interface DarkModeApi {
  onChange: (callback: (value: boolean) => void) => () => void;
  value: () => Promise<boolean>;
  toggle: () => Promise<boolean>;
  system: () => Promise<void>;
}

export interface SyncApi {
  start(tagIds: string[], deviceId: string, options: SyncOptions): Promise<SyncStatus>;
  cancel(): Promise<void>;
  onProgress(callback: (progress: SyncStatus) => void): () => void;
}

export interface UtilApi {
  openExternalLink: (url: string) => Promise<void>;
}

export interface UpdateApi {
  onUpdateAvailable(callback: (version: string) => void): () => void;
  quitAndInstall(): Promise<void>;
}
