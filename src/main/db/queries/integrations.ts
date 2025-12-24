import { safeStorage } from 'electron';
import logger from 'electron-log/main';
import { settingsQueries } from './settings';
import type { RetroAchievementsConfig } from '@/types/settings';

const log = logger.scope('db:integrations');

const RA_USERNAME_KEY = 'integration.retroachievements.username';
const RA_API_KEY = 'integration.retroachievements.apiKey';

export const integrationsQueries = {
  getRetroAchievements(): RetroAchievementsConfig | null {
    const username = settingsQueries.get(RA_USERNAME_KEY);
    const encryptedApiKey = settingsQueries.get(RA_API_KEY);

    if (!username || !encryptedApiKey) {
      return null;
    }

    if (!safeStorage.isEncryptionAvailable()) {
      log.warn('Encryption not available on this system, cannot decrypt RetroAchievements API key');
      return null;
    }

    try {
      const encryptedBuffer = Buffer.from(encryptedApiKey, 'base64');
      const apiKey = safeStorage.decryptString(encryptedBuffer);
      return { username, apiKey };
    } catch (error) {
      log.error('Failed to decrypt RetroAchievements API key:', error);
      return null;
    }
  },

  setRetroAchievements(config: RetroAchievementsConfig) {
    const { username, apiKey } = config;

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available on this system, cannot store API key securely');
    }

    const encryptedApiKey = safeStorage.encryptString(apiKey);

    settingsQueries.setMany({
      [RA_USERNAME_KEY]: username,
      [RA_API_KEY]: encryptedApiKey.toString('base64'),
    });
  },

  removeRetroAchievements() {
    settingsQueries.remove(RA_USERNAME_KEY);
    settingsQueries.remove(RA_API_KEY);
  },
};
