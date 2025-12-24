import { nativeTheme } from 'electron';
import logger from 'electron-log/main';
import { settings } from '@main/db/queries';
import type { AppTheme } from '@/types/settings';

const log = logger.scope('themes');

export async function initializeTheme(): Promise<void> {
  try {
    const allSettings = settings.getAll();
    const theme = (allSettings.theme as AppTheme) || 'system';

    log.debug(`Initializing theme: ${theme}`);
    applyTheme(theme);
  } catch (error) {
    log.warn('Failed to load theme settings, using system default:', error);
    applyTheme('system');
  }
}

export function applyTheme(theme: AppTheme): void {
  nativeTheme.themeSource = theme;
}

export function getCurrentTheme(): boolean {
  return nativeTheme.shouldUseDarkColors;
}

export function toggleTheme(): boolean {
  nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
  return nativeTheme.shouldUseDarkColors;
}

export function setSystemTheme(): void {
  nativeTheme.themeSource = 'system';
}
