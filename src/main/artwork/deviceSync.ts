import path from 'node:path';
import fs from 'node:fs/promises';
import logger from 'electron-log/main';
import { getCachedArtworkPath, hasCachedArtwork } from './cache';

import type { DeviceProfile } from '@romie/device-profiles';
import type { Device } from '@/types/device';
import type { Rom } from '@/types/rom';

const log = logger.scope('artwork-sync');

interface CopyArgs {
  rom: Rom;
  device: Device;
  profile: DeviceProfile;
  /** Sanitized destination filename for the ROM, e.g. "Super Metroid.sfc" */
  destinationFilename: string;
}

/**
 * Resolves the on-device directory where artwork should land for a given system,
 * applying the profile's `pathPattern` template (`{romBasePath}`, `{folderName}`).
 *
 * Exported for unit tests; sync callers should use `copyArtworkToDevice`.
 */
export function resolveArtworkDir(
  mount: string,
  profile: Pick<DeviceProfile, 'romBasePath' | 'artworkConfig'>,
  systemFolderName: string
): string | null {
  const config = profile.artworkConfig;
  if (!config?.enabled || !config.pathPattern) return null;

  const relative = config.pathPattern
    .replace(/\{romBasePath\}/g, profile.romBasePath || '')
    .replace(/\{folderName\}/g, systemFolderName);

  return path.join(mount, relative);
}

/**
 * Copies cached artwork to the device alongside a freshly synced ROM. Best-effort:
 * a missing cache entry, an unsupported system, or a write failure are logged but
 * never throw — the ROM copy itself stays the source of truth for sync success.
 */
export async function copyArtworkToDevice({
  rom,
  device,
  profile,
  destinationFilename,
}: CopyArgs): Promise<boolean> {
  if (!profile.artworkConfig?.enabled) return false;

  const systemMapping = profile.systemMappings[rom.system];
  if (!systemMapping) return false;

  if (!(await hasCachedArtwork(rom.id))) return false;

  const artDir = resolveArtworkDir(device.deviceInfo.mount, profile, systemMapping.folderName);
  if (!artDir) return false;

  const stem = path.parse(destinationFilename).name;
  const targetPath = path.join(artDir, `${stem}.png`);

  try {
    await fs.mkdir(artDir, { recursive: true });
  } catch (err) {
    log.warn(`Failed to create artwork dir ${artDir}:`, err);
    return false;
  }

  try {
    await fs.access(targetPath);
    log.debug(`Artwork already on device: ${targetPath}`);
    return false;
  } catch {
    // missing — copy
  }

  try {
    const sourcePath = await getCachedArtworkPath(rom.id);
    await fs.copyFile(sourcePath, targetPath);
    log.debug(`Copied artwork: ${sourcePath} -> ${targetPath}`);
    return true;
  } catch (err) {
    log.warn(`Failed to copy artwork for ${rom.displayName}:`, err);
    return false;
  }
}
