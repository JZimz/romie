/**
 * RetroAchievements API Wrapper
 *
 * These functions wrap functions from the `@retroachievements/api` package to automatically
 * include the stored user credentials from the app settings.
 */
import log from 'electron-log/main';
import {
  buildAuthorization,
  getUserProfile as raGetUserProfile,
  getUserCompletionProgress as raGetUserCompletionProgress,
  getGameInfoAndUserProgress as raGetGameInfoAndUserProgress,
} from '@retroachievements/api';
import { integrations } from '@main/db/queries';
import { lookupRomByHash } from '@main/roms/romLookup';

export async function isConfigured() {
  const authorization = await getAuth();

  return !!authorization;
}

export async function syncAchievementProgress() {
  if (!(await isConfigured())) return;
  log.info('[RA] Syncing achievement progress with RetroAchievements...');

  try {
    await getUserCompletionProgress();
  } catch (error) {
    log.error('[RA] Failed to sync achievement progress:', error);
    return;
  }
}

//== RA API functions ==//

export async function getUserProfile() {
  const authorization = await getAuth();

  return raGetUserProfile(authorization, { username: authorization.username });
}

export async function getUserCompletionProgress() {
  const authorization = await getAuth();

  return raGetUserCompletionProgress(authorization, {
    username: authorization.username,
  });
}

export async function getGameInfoAndUserProgress(romHash: string) {
  const authorization = await getAuth();
  // Lookup game by md5. If this becomes an issue we can explore storing
  // the gameId on verified ROMs but for now this is simpler.
  const game = await lookupRomByHash(romHash);

  if (!game) return null;

  return raGetGameInfoAndUserProgress(authorization, {
    gameId: game.id,
    username: authorization.username,
  });
}

//= Internal helpers =//

async function getAuth() {
  const config = integrations.getRetroAchievements();
  if (!config) {
    throw new Error('RetroAchievements config not set');
  }
  const { username, apiKey: webApiKey } = config;

  return buildAuthorization({ username, webApiKey });
}
