import { getDatabase } from './connection';
import { safeStorage } from 'electron';
import logger from 'electron-log/main';
import type { RetroAchievementsConfig } from '@/types/settings';

const log = logger.scope('db:integrations');

export function addRetroAchievementsConfig(config: RetroAchievementsConfig): void {
  const { username, apiKey } = config;

  // Validate params
  if (!username || !apiKey) {
    throw new Error('Both username and API key are required');
  }

  // Validate API key format
  if (!apiKey.trim() || apiKey.includes(' ') || apiKey.length < 10) {
    throw new Error('API key format appears invalid');
  }

  // Check if encryption is available on this system
  if (!safeStorage.isEncryptionAvailable()) {
    log.error('Secure storage not available on this system');
    throw new Error(
      'Secure storage is not available. Please ensure your system supports encryption.'
    );
  }

  // Encrypt the API key before storing
  let encryptedApiKey: Buffer;
  try {
    encryptedApiKey = safeStorage.encryptString(apiKey);
  } catch (error) {
    log.error('Failed to encrypt API key:', error);
    throw new Error('Failed to encrypt API key for secure storage');
  }

  const db = getDatabase();
  const now = Date.now();

  const configJson = JSON.stringify({
    username,
    apiKey: encryptedApiKey.toString('base64'),
  });

  db.prepare(
    `
    INSERT INTO integrations (service, config, enabled, createdAt, updatedAt)
    VALUES (@service, @config, @enabled, @createdAt, @updatedAt)
    ON CONFLICT(service) DO UPDATE SET config = @config, updatedAt = @updatedAt
  `
  ).run({
    service: 'retroachievements',
    config: configJson,
    enabled: 1,
    createdAt: now,
    updatedAt: now,
  });

  log.info('RetroAchievements config saved');
}

export function getRetroAchievementsConfig(): RetroAchievementsConfig | null {
  const db = getDatabase();

  const row = db
    .prepare('SELECT config FROM integrations WHERE service = @service')
    .get({ service: 'retroachievements' }) as { config: string } | undefined;

  if (!row) {
    return null;
  }

  let configData: { username: string; apiKey: string };
  try {
    configData = JSON.parse(row.config);
  } catch (error) {
    log.error('Failed to parse RetroAchievements config:', error);
    throw new Error('Failed to parse stored config');
  }

  // Decrypt the API key
  let decryptedApiKey: string;
  try {
    const encryptedBuffer = Buffer.from(configData.apiKey, 'base64');
    decryptedApiKey = safeStorage.decryptString(encryptedBuffer);
  } catch (error) {
    log.error('Failed to decrypt API key:', error);
    throw new Error('Failed to decrypt stored API key');
  }

  return {
    username: configData.username,
    apiKey: decryptedApiKey,
  };
}

export function removeRetroAchievementsConfig(): void {
  const db = getDatabase();

  const result = db
    .prepare('DELETE FROM integrations WHERE service = @service')
    .run({ service: 'retroachievements' });

  if (result.changes > 0) {
    log.info('RetroAchievements config removed');
  }
}
