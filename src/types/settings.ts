import type { SystemCode } from '@/types/system';

export type AppTheme = 'light' | 'dark' | 'system';

export interface WindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export interface WindowState {
  bounds: WindowBounds;
  isMaximized: boolean;
}

export type DocumentCategoryKey = 'pdf' | 'docx' | 'xls' | 'xlsx';

export type DocumentCategoryNames = Partial<Record<DocumentCategoryKey, string>>;

export interface AppSettings {
  theme: AppTheme;
  windowState?: WindowState;
  systemOrder?: SystemCode[];
  documentCategoryNames?: DocumentCategoryNames;
}

export interface RetroAchievementsConfig {
  username: string;
  apiKey: string;
}

export interface AppIntegrations {
  retroachievements: RetroAchievementsConfig;
}
