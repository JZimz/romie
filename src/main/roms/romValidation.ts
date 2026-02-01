import { access, constants } from 'node:fs/promises';
import logger from 'electron-log/main';
import { roms } from '@/main/db/queries';

import type { Rom } from '@/types/rom';

const log = logger.scope('rom-validation');
const availabilityCache = new Map<string, boolean>();

export async function checkRomAvailability(): Promise<void> {
  log.info('Checking ROM file availability on disk...');
  availabilityCache.clear();
  const allRoms = roms.list();

  await Promise.all(allRoms.map((rom) => validateRomExists(rom)));
}

export async function validateRomExists(rom: Rom): Promise<boolean> {
  const cached = availabilityCache.get(rom.id);
  if (cached !== undefined) {
    return cached;
  }

  try {
    await access(rom.filePath, constants.R_OK);
    availabilityCache.set(rom.id, true);
    return true;
  } catch {
    availabilityCache.set(rom.id, false);
    return false;
  }
}
