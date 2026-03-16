import { access, constants } from 'node:fs/promises';
import path from 'node:path';
import logger from 'electron-log/main';
import { roms } from '@/main/db/queries';

import type { Rom } from '@/types/rom';

const log = logger.scope('rom-validation');

export interface RomAvailability {
  filePathExists: boolean;
  volumeDisconnected: boolean;
}

const availabilityCache = new Map<string, RomAvailability>();
const volumeCache = new Map<string, boolean>();

/**
 * Returns the volume root to check for a given file path, or null if the path
 * is on a local filesystem that doesn't warrant a volume check.
 *
 * Covers common OS mount conventions:
 *   macOS:   /Volumes/<name>
 *   Windows: any drive root (C:\, D:\, F:\, etc.)
 *   Linux:   /mnt/<name>, /run/media/<user>/<name>
 *
 * Tradeoff: Simplicity over total accuracy. Volumes mounted outside these
 * conventions are treated as local, so if they disconnect they will show as
 * missing rather than disconnected.
 */
export function getVolumeRoot(filePath: string, platform = process.platform): string | null {
  if (platform === 'win32') {
    return path.win32.parse(filePath).root || null;
  }

  // macOS: all external/network volumes mount under /Volumes
  const mac = filePath.match(/^(\/Volumes\/[^/]+)/);
  if (mac) return mac[1];

  // Linux: common mount locations
  // /mnt/<name>              — manual mounts
  // /run/media/<user>/<name> — udisks2 automount (Arch, Fedora, modern Ubuntu)
  const linux = filePath.match(/^\/(mnt\/[^/]+|run\/media\/[^/]+\/[^/]+)/);
  if (linux) return '/' + linux[1];

  return null;
}

async function isVolumeAccessible(volumeRoot: string): Promise<boolean> {
  const cached = volumeCache.get(volumeRoot);
  if (cached !== undefined) return cached;

  try {
    await access(volumeRoot, constants.R_OK);
    volumeCache.set(volumeRoot, true);
    return true;
  } catch {
    volumeCache.set(volumeRoot, false);
    return false;
  }
}

export async function checkRomAvailability(): Promise<void> {
  log.info('Checking ROM file availability on disk...');
  availabilityCache.clear();
  volumeCache.clear();
  const allRoms = roms.list();

  await Promise.all(allRoms.map((rom) => validateRomExists(rom)));
}

export async function validateRomExists(rom: Rom, ignoreCache = false): Promise<RomAvailability> {
  if (!ignoreCache) {
    const cached = availabilityCache.get(rom.id);
    if (cached !== undefined) return cached;
  }

  const volumeRoot = getVolumeRoot(rom.filePath);
  const volumeAccessible = volumeRoot === null || (await isVolumeAccessible(volumeRoot));

  let result: RomAvailability;

  if (!volumeAccessible) {
    result = { filePathExists: false, volumeDisconnected: true };
  } else {
    try {
      await access(rom.filePath, constants.R_OK);
      result = { filePathExists: true, volumeDisconnected: false };
    } catch {
      result = { filePathExists: false, volumeDisconnected: false };
    }
  }

  availabilityCache.set(rom.id, result);
  return result;
}
