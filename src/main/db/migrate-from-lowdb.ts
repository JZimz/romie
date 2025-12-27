import logger from 'electron-log/main';
import fs from 'node:fs';
import path from 'node:path';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { RomDatabase } from '@/types/rom';
import { schema } from './index';

const log = logger.scope('db:migration');

type AppDatabase = BetterSQLite3Database<typeof schema>;

export function migrateLowdbToSqlite(db: AppDatabase, baseDir: string) {
  const lowdbPath = path.join(baseDir, 'roms.json');

  // Skip if no old database exists
  if (!fs.existsSync(lowdbPath)) {
    log.info('No LowDB database found, skipping migration');
    return;
  }

  log.info('Migrating from LowDB to SQLite...');

  try {
    const oldData: RomDatabase = JSON.parse(fs.readFileSync(lowdbPath, 'utf-8'));

    // Wrap entire migration in atomic transaction
    db.transaction(() => {
      migrateRoms(db, oldData.roms);
      migrateProfiles(db, oldData.profiles);
      migrateDevices(db, oldData.devices);
      migrateIntegrations(db, oldData.integrations);
      migrateSettings(db, oldData.settings);
    });

    // Backup old db (only after successful transaction)
    // Renaming the file serves as the "migration complete" marker
    const backupPath = `${lowdbPath}.backup-${Date.now()}`;
    fs.renameSync(lowdbPath, backupPath);

    log.info(`Migration completed successfully. Old database backed up to: ${backupPath}`);
  } catch (error) {
    log.error('Migration failed:', error);
    throw error; // Let app startup fail if migration fails
  }
}

function migrateRoms(db: AppDatabase, data: RomDatabase['roms']) {
  if (!data || data.length === 0) {
    log.info('No ROMs to migrate');
    return;
  }

  log.info(`Migrating ${data.length} ROMs...`);

  for (const rom of data) {
    db.insert(schema.roms)
      .values({
        id: rom.id,
        system: rom.system,
        displayName: rom.displayName,
        region: rom.region,
        filePath: rom.filePath,
        filename: rom.filename,
        romFilename: rom.romFilename,
        size: rom.size,
        md5: rom.md5,
        fileCrc32: rom.fileCrc32,
        ramd5: rom.ramd5,
        verified: rom.verified,
        tags: rom.tags,
        favorite: rom.favorite,
        notes: rom.notes,
        // LowDB stored timestamps as unix ms, convert to Date
        createdAt: rom.importedAt ? new Date(rom.importedAt) : rom.createdAt,
        updatedAt: rom.lastUpdated ? new Date(rom.lastUpdated) : rom.updatedAt,
      })
      .onConflictDoNothing()
      .run();
  }

  log.info(`Successfully migrated ${data.length} ROMs`);
}

function migrateDevices(db: AppDatabase, data: RomDatabase['devices']) {
  if (!data || data.length === 0) {
    log.info('No Devices to migrate');
    return;
  }

  log.info(`Migrating ${data.length} Devices...`);

  for (const device of data) {
    db.insert(schema.devices)
      .values({
        id: device.id,
        name: device.name,
        profileId: device.profileId,
        deviceInfo: device.deviceInfo,
        // LowDB stored addedAt as unix ms, convert to Date
        createdAt: device.addedAt ? new Date(device.addedAt) : new Date(),
        updatedAt: device.updatedAt ? new Date(device.updatedAt) : new Date(),
      })
      .onConflictDoNothing()
      .run();
  }

  log.info(`Successfully migrated ${data.length} Devices`);
}

function migrateProfiles(db: AppDatabase, data: RomDatabase['profiles']) {
  if (!data || data.length === 0) {
    log.info('No Device Profiles to migrate');
    return;
  }

  log.info(`Migrating ${data.length} Device Profiles...`);

  for (const profile of data) {
    db.insert(schema.deviceProfiles)
      .values({
        id: profile.id,
        name: profile.name,
        romBasePath: profile.romBasePath,
        systemMappings: profile.systemMappings,
        version: profile.version,
        createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
        updatedAt: profile.lastModified ? new Date(profile.lastModified) : new Date(),
      })
      .onConflictDoNothing()
      .run();
  }

  log.info(`Successfully migrated ${data.length} Device Profiles`);
}

function migrateIntegrations(db: AppDatabase, data: RomDatabase['integrations']) {
  if (!data) {
    log.info('No Integrations to migrate');
    return;
  }

  log.info('Migrating Integrations...');

  if (data.retroachievements) {
    const { username, apiKey } = data.retroachievements;

    // API key is already encrypted in LowDB, store as-is
    db.insert(schema.settings)
      .values({
        key: 'integration.retroachievements.username',
        value: username,
      })
      .onConflictDoNothing()
      .run();

    db.insert(schema.settings)
      .values({
        key: 'integration.retroachievements.apiKey',
        value: apiKey,
      })
      .onConflictDoNothing()
      .run();

    log.info('Migrated RetroAchievements integration');
  }
}

function migrateSettings(db: AppDatabase, data: RomDatabase['settings']) {
  if (!data) {
    log.info('No Settings to migrate');
    return;
  }

  log.info('Migrating Settings...');

  if (data.theme) {
    db.insert(schema.settings)
      .values({
        key: 'theme',
        value: data.theme,
      })
      .onConflictDoNothing()
      .run();
    log.info('Migrated theme setting');
  }
}
