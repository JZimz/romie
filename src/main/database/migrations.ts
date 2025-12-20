import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import logger from 'electron-log/main';

import type { RomDatabase } from '@/types/rom';
import type { Device } from '@/types/device';
import type { DeviceProfile } from '@romie/device-profiles';

const log = logger.scope('db:migrations');

// Determine the legacy lowdb location (matches previous implementation)
function getLegacyDbPath(): string {
  const baseDir =
    process.env.NODE_ENV === 'development'
      ? path.join(process.cwd(), '.romie')
      : app.getPath('userData');

  return path.join(baseDir, 'roms.json');
}

export function runMigrations(db: Database.Database, fromVersion: number) {
  if (fromVersion < 1) {
    migrateLowdbToSqlite(db);
  }
}

function migrateLowdbToSqlite(db: Database.Database) {
  const legacyPath = getLegacyDbPath();
  if (!fs.existsSync(legacyPath)) {
    log.info('No legacy lowdb found, skipping import');
    return;
  }

  log.info(`Importing legacy lowdb at ${legacyPath} into SQLite`);

  const raw = fs.readFileSync(legacyPath, 'utf8');
  const legacy = JSON.parse(raw) as RomDatabase;
  const now = Date.now();

  const insertRom = db.prepare(`
    INSERT INTO roms (
      id, displayName, system, region, filePath, filename, romFilename,
      size, md5, fileCrc32, ramd5, verified, tags, favorite, notes,
      createdAt, updatedAt
    ) VALUES (
      @id, @displayName, @system, @region, @filePath, @filename, @romFilename,
      @size, @md5, @fileCrc32, @ramd5, @verified, @tags, @favorite, @notes,
      @createdAt, @updatedAt
    )
  `);
  const insertDevice = db.prepare(`
    INSERT INTO devices (
      id, name, profileId, deviceInfo, createdAt, updatedAt
    ) VALUES (
      @id, @name, @profileId, @deviceInfo, @createdAt, @updatedAt
    )
  `);
  const insertProfile = db.prepare(`
    INSERT INTO deviceProfiles (
      id, name, romBasePath, systemMappings, isBuiltIn, createdAt, updatedAt, version
    ) VALUES (
      @id, @name, @romBasePath, @systemMappings, @isBuiltIn, @createdAt, @updatedAt, @version
    )
  `);
  const insertSetting = db.prepare(`
    INSERT INTO appSettings (key, value, createdAt, updatedAt)
    VALUES (@key, @value, @createdAt, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updatedAt = excluded.updatedAt
  `);
  const insertIntegration = db.prepare(`
    INSERT INTO integrations (service, config, enabled, createdAt, updatedAt)
    VALUES (@service, @config, @enabled, @createdAt, @updatedAt)
  `);

  const transaction = db.transaction(() => {
    legacy.roms?.forEach((rom) => {
      // Map legacy fields to new schema. All tables were normalized to createdAt/updatedAt
      // along with the switch to sqlite.
      const createdAt = rom.createdAt ?? rom.importedAt ?? now;
      const updatedAt = rom.updatedAt ?? rom.lastUpdated ?? createdAt;

      insertRom.run({
        id: rom.id,
        displayName: rom.displayName,
        system: rom.system,
        region: rom.region ?? 'Unknown',
        filePath: rom.filePath,
        filename: rom.filename,
        romFilename: rom.romFilename,
        size: rom.size,
        md5: rom.md5,
        fileCrc32: rom.fileCrc32 ?? null,
        ramd5: rom.ramd5 ?? null,
        verified: rom.verified ? 1 : 0,
        tags: JSON.stringify(rom.tags ?? []),
        favorite: rom.favorite ? 1 : 0,
        notes: rom.notes ?? null,
        createdAt,
        updatedAt,
      });
    });

    legacy.devices?.forEach((device: Device) => {
      const createdAt = device.createdAt ?? device.addedAt ?? now;
      const updatedAt = device.updatedAt ?? createdAt;

      insertDevice.run({
        id: device.id,
        name: device.name,
        profileId: device.profileId,
        deviceInfo: JSON.stringify(device.deviceInfo),
        createdAt,
        updatedAt,
      });
    });

    legacy.profiles?.forEach((profile: DeviceProfile) => {
      const createdAt = profile.createdAt ?? now;
      const updatedAt = profile.updatedAt ?? profile.lastModified ?? createdAt;

      insertProfile.run({
        id: profile.id,
        name: profile.name,
        romBasePath: profile.romBasePath,
        systemMappings: JSON.stringify(profile.systemMappings),
        isBuiltIn: profile.isBuiltIn ? 1 : 0,
        createdAt,
        updatedAt,
        version: profile.version ?? 1,
      });
    });

    if (legacy.settings) {
      Object.entries(legacy.settings).forEach(([key, value]) => {
        insertSetting.run({
          key,
          value: JSON.stringify(value),
          createdAt: legacy.created ?? now,
          updatedAt: legacy.lastUpdated ?? now,
        });
      });
    }

    if (legacy.integrations?.retroachievements) {
      insertIntegration.run({
        service: 'retroachievements',
        config: JSON.stringify(legacy.integrations.retroachievements),
        enabled: 1,
        createdAt: legacy.created ?? now,
        updatedAt: legacy.lastUpdated ?? now,
      });
    }
  });

  transaction();
  log.info('Legacy lowdb import completed');
}
