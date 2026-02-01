import { safeStorage } from 'electron';
import logger from 'electron-log/main';
import { isSystemCode } from '@/utils/systems';
import { SYSTEM_CODES } from '@/types/system';
import {
  getAllDeviceProfiles,
  type DeviceProfile,
  type DeviceProfileDraft,
} from '@romie/device-profiles';
import { AppError } from '@/errors';
import { loadHashDatabase, lookupRomByHashSync } from './romLookup';
import { roms, devices, deviceProfiles, integrations } from '@main/db/queries';

import type { Rom, RomDraft, RomDatabaseStats } from '@/types/rom';
import type { SystemCode } from '@/types/system';
import type { Device } from '@/types/device';
import type { RetroAchievementsConfig } from '@/types/settings';
import { validateRomExists } from './romValidation';

const log = logger.scope('rom-db');

export async function addRom(rom: RomDraft): Promise<Rom> {
  log.debug(`Adding ROM: ${rom.filename} (${rom.romFilename})`);

  // Check for duplicates
  const existing = roms.findByMd5(rom.md5);

  if (existing) {
    log.warn(`Duplicate ROM rejected: ${rom.filename} (matches ${existing.filename})`);
    throw new Error(`ROM "${rom.filename}" already exists (duplicate of "${existing.filename}")`);
  }

  // Insert ROM
  const inserted = roms.insert(rom);

  log.info(`ROM added: ${rom.filename} (${rom.romFilename})`);
  return inserted;
}

export async function removeRomById(ids: string | string[]): Promise<void> {
  const idArray = Array.isArray(ids) ? ids : [ids];
  log.debug(`Removing ${idArray.length} ROM(s)`);
  roms.remove(idArray);
  log.info(`Removed ${idArray.length} ROM(s)`);
}

export async function updateRom(id: string, romUpdate: Partial<Rom>): Promise<void> {
  log.debug(`Updating ROM: ${id}`);

  const { displayName, tags, favorite, notes } = romUpdate;
  roms.update(id, { displayName, tags, favorite, notes });

  log.info(`ROM updated: ${id}`);
}

export async function listRoms(): Promise<Rom[]> {
  const allRoms = roms.list();

  await loadHashDatabase();

  // Enrich ROMs with achievement count and availability data.
  const enrichedRoms = await Promise.all(
    allRoms.map(async (rom) => {
      const filePathExists = await validateRomExists(rom);
      const enrichedRom: Rom = { ...rom, filePathExists };

      if (rom.verified && rom.ramd5) {
        const game = lookupRomByHashSync(rom.ramd5);
        enrichedRom.numAchievements = game?.numAchievements ?? 0;
      }

      return enrichedRom;
    })
  );

  return enrichedRoms;
}

export async function getRomStats(): Promise<RomDatabaseStats> {
  const totalRoms = roms.count();
  const totalSizeBytes = roms.getTotalSize();
  const systemCounts = roms.getSystemCounts();
  const tagStats = roms.getTagStats();

  return {
    totalRoms,
    totalSizeBytes,
    systemCounts,
    tagStats,
  };
}

// = DEVICES ==
// TODO: This is starting to beyond roms so it should be refactored.
export async function addDevice(
  candidate: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Device> {
  const { name, profileId, deviceInfo } = candidate;
  log.debug(`Adding device: ${name}`);

  // Validate device info
  if (!deviceInfo.mount) {
    throw new Error('No mount path detected.');
  }
  if (!deviceInfo.size || deviceInfo.size <= 0) {
    throw new Error('Invalid device size.');
  }
  if (!profileId) {
    throw new Error('Missing device profile.');
  }

  const inserted = devices.insert(candidate);
  log.info(`Device added: ${name}`);

  return inserted;
}

export async function listDeviceProfiles(): Promise<DeviceProfile[]> {
  const customProfiles = deviceProfiles.list();
  const builtInProfiles = getAllDeviceProfiles();

  return [...builtInProfiles, ...customProfiles].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDeviceProfile(id: string): Promise<DeviceProfile | null> {
  log.debug(`Getting device profile: ${id}`);

  const profiles = await listDeviceProfiles();

  return profiles.find((profile) => profile.id === id) || null;
}

export async function addDeviceProfile(candidate: DeviceProfileDraft): Promise<DeviceProfile> {
  log.debug(`Adding device profile: ${candidate.name}`);

  // Validate custom device profile
  if (!candidate.name || !candidate.romBasePath || !candidate.systemMappings) {
    throw AppError.simple('Profile name and ROM base path are required');
  }

  if (Object.keys(candidate.systemMappings).length === 0) {
    throw AppError.simple('At least one system mapping is required');
  }

  // Validate each system mapping
  Object.entries(candidate.systemMappings).forEach(([key, systemMapping]) => {
    const systemCode = key as SystemCode;

    if (!isSystemCode(systemCode)) {
      const validCodes = SYSTEM_CODES.join(', ');
      throw AppError.simple(`Invalid system code: "${systemCode}". Valid codes are: ${validCodes}`);
    }
    if (!systemMapping.folderName) {
      throw AppError.simple(`Missing folderName for system: ${systemCode}`);
    }
    if (!systemMapping.supportedFormats?.length) {
      throw AppError.simple(
        `At least one file extension is required in supportedFormats for system: ${systemCode}`
      );
    }
  });

  // Check for duplicate name
  const existing = deviceProfiles.findByName(candidate.name);
  if (existing) {
    throw AppError.simple(
      `A device profile named "${candidate.name}" already exists. Please choose a different name.`
    );
  }

  const profileData: Omit<DeviceProfile, 'id' | 'createdAt' | 'updatedAt'> = {
    ...candidate,
    isBuiltIn: false,
    version: 1,
  };

  const inserted = deviceProfiles.insert(profileData);
  log.info(`Device profile added: ${candidate.name}`);

  return inserted;
}

//= Integrations =

export async function addRetroAchievementsConfig(config: RetroAchievementsConfig) {
  const { username, apiKey } = config;

  // Validate params
  if (!username || !apiKey) {
    throw new Error('Both username and API key are required');
  }
  if (!apiKey.trim() || apiKey.includes(' ') || apiKey.length < 10) {
    throw new Error('API key format appears invalid');
  }
  if (!safeStorage.isEncryptionAvailable()) {
    log.error('Secure storage not available on this system');
    throw new Error(
      'Secure storage is not available. Please ensure your system supports encryption.'
    );
  }

  integrations.setRetroAchievements(config);
  log.info(`RetroAchievements config added for user: ${username}`);
}
