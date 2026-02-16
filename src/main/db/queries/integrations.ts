import { safeStorage } from 'electron';
import logger from 'electron-log/main';
import { settingsQueries } from './settings';
import type { RetroAchievementsConfig } from '@/types/settings';

const log = logger.scope('db:integrations');

const RA_USERNAME_KEY = 'integration.retroachievements.username';
const RA_API_KEY = 'integration.retroachievements.apiKey';
const PLAINTEXT_PREFIX = 'plain:';

export const integrationsQueries = {
  getRetroAchievements(): RetroAchievementsConfig | null {
    const username = settingsQueries.get(RA_USERNAME_KEY);
    const storedApiKey = settingsQueries.get(RA_API_KEY);

    if (!username || !storedApiKey) {
      return null;
    }

    if (storedApiKey.startsWith(PLAINTEXT_PREFIX)) {
      return { username, apiKey: storedApiKey.slice(PLAINTEXT_PREFIX.length) };
    }

    if (!safeStorage.isEncryptionAvailable()) {
      log.warn('Encryption not available and no plaintext fallback found');
      return null;
    }

    try {
      const encryptedBuffer = Buffer.from(storedApiKey, 'base64');
      const apiKey = safeStorage.decryptString(encryptedBuffer);
      return { username, apiKey };
    } catch (error) {
      log.error('Failed to decrypt RetroAchievements API key:', error);
      return null;
    }
  },

  setRetroAchievements(config: RetroAchievementsConfig) {
    const { username, apiKey } = config;

    if (safeStorage.isEncryptionAvailable()) {
      const encryptedApiKey = safeStorage.encryptString(apiKey);
      settingsQueries.setMany({
        [RA_USERNAME_KEY]: username,
        [RA_API_KEY]: encryptedApiKey.toString('base64'),
      });
    } else {
      log.warn('Secure storage unavailable, storing API key in plaintext');
      settingsQueries.setMany({
        [RA_USERNAME_KEY]: username,
        [RA_API_KEY]: PLAINTEXT_PREFIX + apiKey,
      });
    }
  },

  removeRetroAchievements() {
    settingsQueries.remove(RA_USERNAME_KEY);
    settingsQueries.remove(RA_API_KEY);
  },
};
