import { eq } from 'drizzle-orm';
import logger from 'electron-log/main';

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { crc32sum } from '../roms/romUtils';
import { isArchiveContainerPath } from '../roms/archive.utils';

const log = logger.scope('db:data-migrations');

type AppDatabase = BetterSQLite3Database<typeof schema>;

const ARCHIVE_FILE_CRC32_MIGRATION_KEY = 'dataMigration.archiveFileCrc32.v1';
const ARCHIVE_FILE_CRC32_MIGRATION_STARTED_KEY = `${ARCHIVE_FILE_CRC32_MIGRATION_KEY}.started`;

export async function runDataMigrations(db: AppDatabase) {
  await migrateArchiveFileCrc32(db);
}

async function migrateArchiveFileCrc32(db: AppDatabase) {
  const existingMarker =
    db
      .select()
      .from(schema.metadata)
      .where(eq(schema.metadata.key, ARCHIVE_FILE_CRC32_MIGRATION_KEY))
      .limit(1)
      .get() ?? null;

  if (existingMarker) {
    return;
  }

  const startedMarker =
    db
      .select()
      .from(schema.metadata)
      .where(eq(schema.metadata.key, ARCHIVE_FILE_CRC32_MIGRATION_STARTED_KEY))
      .limit(1)
      .get() ?? null;

  if (!startedMarker) {
    db.insert(schema.metadata)
      .values({
        key: ARCHIVE_FILE_CRC32_MIGRATION_STARTED_KEY,
        value: Date.now().toString(),
      })
      .onConflictDoNothing()
      .run();
  } else {
    log.info(
      `Resuming archive fileCrc32 regeneration (previous run started at ${startedMarker.value})`
    );
  }

  const allRoms = db
    .select({
      id: schema.roms.id,
      filePath: schema.roms.filePath,
      filename: schema.roms.filename,
      fileCrc32: schema.roms.fileCrc32,
    })
    .from(schema.roms)
    .all();

  const archiveRoms = allRoms.filter((rom) => isArchiveContainerPath(rom.filePath));

  if (archiveRoms.length === 0) {
    const timestamp = Date.now().toString();
    db.insert(schema.metadata)
      .values({
        key: ARCHIVE_FILE_CRC32_MIGRATION_KEY,
        value: timestamp,
      })
      .onConflictDoUpdate({
        target: schema.metadata.key,
        set: { value: timestamp },
      })
      .run();
    return;
  }

  log.info(`Regenerating fileCrc32 for ${archiveRoms.length} archive ROMs...`);

  let updated = 0;
  let processed = 0;

  for (const rom of archiveRoms) {
    processed++;
    try {
      const nextCrc32 = await crc32sum({ filePath: rom.filePath });
      if (nextCrc32 === rom.fileCrc32) {
        continue;
      }

      db.update(schema.roms)
        .set({
          fileCrc32: nextCrc32,
          updatedAt: new Date(),
        })
        .where(eq(schema.roms.id, rom.id))
        .run();

      updated++;
    } catch (error) {
      log.warn(`Failed to regenerate CRC32 for archive ROM ${rom.filename} (${rom.id}): ${error}`);
    }

    if (processed % 100 === 0) {
      log.info(`Archive fileCrc32 regeneration progress: ${processed}/${archiveRoms.length}`);
    }

    if (processed % 25 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  const timestamp = Date.now().toString();

  db.insert(schema.metadata)
    .values({
      key: ARCHIVE_FILE_CRC32_MIGRATION_KEY,
      value: timestamp,
    })
    .onConflictDoUpdate({
      target: schema.metadata.key,
      set: { value: timestamp },
    })
    .run();

  log.info(`Archive fileCrc32 regeneration complete (${updated}/${archiveRoms.length} updated)`);
}
