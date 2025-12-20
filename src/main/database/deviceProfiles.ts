import { getDatabase } from './connection';
import logger from 'electron-log/main';
import { v4 as uuid } from 'uuid';
import {
  getAllDeviceProfiles,
  type DeviceProfile,
  type DeviceProfileDraft,
} from '@romie/device-profiles';
import { isSystemCode } from '@/utils/systems';
import { SYSTEM_CODES, type SystemCode } from '@/types/system';
import { AppError } from '@/errors';

const log = logger.scope('db:profiles');

// Database row type (internal to this module)
interface DeviceProfileRow {
  id: string;
  name: string;
  romBasePath: string;
  systemMappings: string;
  isBuiltIn: number;
  createdAt: number;
  updatedAt: number;
  version: number | null;
}

export function listDeviceProfiles(): DeviceProfile[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM deviceProfiles').all() as DeviceProfileRow[];

  const customProfiles = rows.map(rowToProfile);
  const builtInProfiles = getAllDeviceProfiles();

  return [...builtInProfiles, ...customProfiles].sort((a, b) => a.name.localeCompare(b.name));
}

export function getDeviceProfileById(id: string): DeviceProfile | null {
  log.debug(`Getting device profile: ${id}`);

  // Check built-in profiles first
  const builtInProfiles = getAllDeviceProfiles();
  const builtIn = builtInProfiles.find((profile) => profile.id === id);

  if (builtIn) {
    return builtIn;
  }

  // Check custom profiles in database
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM deviceProfiles WHERE id = ?').get(id) as
    | DeviceProfileRow
    | undefined;

  if (!row) {
    return null;
  }

  return rowToProfile(row);
}

export function addDeviceProfile(candidate: DeviceProfileDraft): DeviceProfile {
  const db = getDatabase();
  const now = Date.now();
  log.debug(`Adding device profile: ${candidate.name}`);

  // Validate custom device profile
  if (!candidate.name || !candidate.romBasePath || !candidate.systemMappings) {
    throw AppError.simple('Profile name and ROM base path are required');
  }

  // System mappings must have at least one entry
  if (Object.keys(candidate.systemMappings).length === 0) {
    throw AppError.simple('At least one system mapping is required');
  }

  // Each entry must use a valid system code and include a folderName and at least one supported file extension
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

  // Device profile must have a unique name
  const nameExists = db
    .prepare('SELECT COUNT(*) as count FROM deviceProfiles WHERE LOWER(name) = LOWER(?)')
    .pluck()
    .get(candidate.name) as number;

  if (nameExists > 0) {
    throw AppError.simple(
      `A device profile named "${candidate.name}" already exists. Please choose a different name.`
    );
  }

  const profile: DeviceProfile = {
    ...candidate,
    isBuiltIn: false,
    createdAt: now,
    lastModified: now,
    version: 1,
    id: uuid(),
  };

  db.prepare(
    `
    INSERT INTO deviceProfiles (
      id, name, romBasePath, systemMappings, isBuiltIn, createdAt, updatedAt, version
    ) VALUES (
      @id, @name, @romBasePath, @systemMappings, @isBuiltIn, @createdAt, @updatedAt, @version
    )
  `
  ).run({
    id: profile.id,
    name: profile.name,
    romBasePath: profile.romBasePath,
    systemMappings: JSON.stringify(profile.systemMappings),
    isBuiltIn: 0,
    createdAt: now,
    updatedAt: now,
    version: profile.version,
  });

  log.info(`Device profile added: ${profile.name}`);
  return profile;
}

// Helper: Convert DB row to DeviceProfile type
function rowToProfile(row: DeviceProfileRow): DeviceProfile {
  return {
    id: row.id,
    name: row.name,
    romBasePath: row.romBasePath,
    systemMappings: JSON.parse(row.systemMappings),
    isBuiltIn: row.isBuiltIn === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version ?? 1,
  };
}
