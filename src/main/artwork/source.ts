import logger from 'electron-log/main';
import { lookupRomByHashSync } from '@main/roms/romLookup';

import type { Rom } from '@/types/rom';

const log = logger.scope('artwork-source');

const RA_MEDIA_BASE_URL = 'https://media.retroachievements.org';

export interface ResolvedArtwork {
  /** Stable identifier for the source so the cache can invalidate later */
  source: 'ra-icon';
  url: string;
}

/**
 * Resolves the artwork source URL for a ROM.
 *
 * First pass uses RetroAchievements `imageIcon` from the bundled game database.
 * The image is served directly from `media.retroachievements.org` — no API call,
 * no credentials. Returns `null` when the ROM isn't verified or has no entry.
 *
 * Future sources (libretro-thumbnails, ScreenScraper, TheGamesDB) can plug in
 * here as ranked fallbacks.
 */
export function resolveArtworkSource(rom: Rom): ResolvedArtwork | null {
  if (!rom.verified || !rom.ramd5) return null;

  const game = lookupRomByHashSync(rom.ramd5);
  const imagePath = game?.imageIcon;
  if (!imagePath) return null;

  // Skip the placeholder icon RA uses for games with no artwork yet.
  if (imagePath === '/Images/000001.png') return null;

  return {
    source: 'ra-icon',
    url: `${RA_MEDIA_BASE_URL}${imagePath}`,
  };
}

export async function downloadArtwork(url: string): Promise<Buffer> {
  log.debug(`Fetching artwork: ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Artwork download failed (${response.status}): ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
