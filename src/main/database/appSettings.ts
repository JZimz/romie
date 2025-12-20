import { getDatabase } from './connection';
import logger from 'electron-log/main';
import type { AppSettings } from '@/types/settings';

const log = logger.scope('db:settings');

export function getAppSettings(): AppSettings {
  const db = getDatabase();
  const rows = db.prepare('SELECT key, value FROM appSettings').all() as Array<{
    key: string;
    value: string;
  }>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings: any = {};

  rows.forEach(({ key, value }) => {
    try {
      settings[key] = JSON.parse(value);
    } catch {
      settings[key] = value;
    }
  });

  return settings as AppSettings;
}

export function updateAppSettings(settingsUpdate: Partial<AppSettings>): void {
  const db = getDatabase();
  const now = Date.now();

  const upsert = db.prepare(`
    INSERT INTO appSettings (key, value, createdAt, updatedAt)
    VALUES (@key, @value, @now, @now)
    ON CONFLICT(key) DO UPDATE SET value = @value, updatedAt = @now
  `);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transaction = db.transaction((updates: Record<string, any>) => {
    Object.entries(updates).forEach(([key, value]) => {
      upsert.run({
        key,
        value: JSON.stringify(value),
        now,
      });
    });
  });

  transaction(settingsUpdate);

  log.info(`Settings updated: ${Object.keys(settingsUpdate).join(', ')}`);
}
