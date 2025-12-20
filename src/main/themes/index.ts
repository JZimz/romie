import { nativeTheme } from 'electron';
import log from 'electron-log/main';
import { getAppSettings } from '@main/database';
import type { AppTheme } from '@/types/settings';

export async function initializeTheme(): Promise<void> {
  try {
    const settings = await getAppSettings();
    const theme = settings.theme || 'system';

    log.debug(`[THEME] Initializing theme: ${theme}`);
    applyTheme(theme);
  } catch (error) {
    log.warn('[THEME] Failed to load theme settings, using system default:', error);
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
