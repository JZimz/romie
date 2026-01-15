import { eq, sql, type SQL } from 'drizzle-orm';
import logger from 'electron-log/main';

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { crc32sum } from '../roms/romUtils';
import { ARCHIVE_CONTAINER_EXTENSIONS_V1 } from '../roms/archive.utils';

const log = logger.scope('db:data-migrations');

type AppDatabase = BetterSQLite3Database<typeof schema>;

const ARCHIVE_FILE_CRC32_MIGRATION_KEY = 'dataMigration.archiveFileCrc32.v1';
const ARCHIVE_FILE_CRC32_MIGRATION_STARTED_KEY = `${ARCHIVE_FILE_CRC32_MIGRATION_KEY}.started`;

export async function runDataMigrations(db: AppDatabase) {
  await migrateArchiveFileCrc32(db);
}

function buildArchivePathWhereClause(): SQL {
  if (ARCHIVE_CONTAINER_EXTENSIONS_V1.length === 0) {
    throw new Error('ARCHIVE_CONTAINER_EXTENSIONS_V1 must not be empty');
  }

  const clauses = ARCHIVE_CONTAINER_EXTENSIONS_V1.map((ext) => {
    return sql`lower(substr(${schema.roms.filePath}, -${ext.length})) = ${ext}`;
  });

  let clause = clauses[0]!;
  for (const condition of clauses.slice(1)) {
    clause = sql`${clause} OR ${condition}`;
  }

  return sql`(${clause})`;
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

  // This is a one-shot, best-effort migration. If the app exits mid-run, it will restart from
  // the beginning on the next launch.

  const archiveRoms = db
    .select({
      id: schema.roms.id,
      filePath: schema.roms.filePath,
      fileCrc32: schema.roms.fileCrc32,
    })
    .from(schema.roms)
    .where(buildArchivePathWhereClause())
    .all();

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

  // Recompute for all archive containers (even if fileCrc32 is already set), since legacy values
  // may have been computed from extracted ROM contents rather than the on-disk archive bytes.
  log.info(`Regenerating fileCrc32 for ${archiveRoms.length} archive ROMs...`);

  let updated = 0;
  let processed = 0;
  let failed = 0;

  for (const rom of archiveRoms) {
    processed++;
    try {
      const nextCrc32 = await crc32sum({ filePath: rom.filePath });
      if (nextCrc32 === rom.fileCrc32) {
        continue;
      }

      db.update(schema.roms).set({ fileCrc32: nextCrc32 }).where(eq(schema.roms.id, rom.id)).run();

      updated++;
    } catch (error) {
      failed++;
      log.warn(`Failed to regenerate CRC32 for archive ROM ${rom.id} at ${rom.filePath}: ${error}`);

      db.update(schema.roms).set({ fileCrc32: '00000000' }).where(eq(schema.roms.id, rom.id)).run();
    }

    if (processed % 100 === 0) {
      log.info(`Archive fileCrc32 regeneration progress: ${processed}/${archiveRoms.length}`);
    }

    if (processed % 25 === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  const timestamp = Date.now().toString();

  if (failed > 0) {
    db.insert(schema.metadata)
      .values({
        key: `${ARCHIVE_FILE_CRC32_MIGRATION_KEY}.failed`,
        value: failed.toString(),
      })
      .onConflictDoUpdate({
        target: schema.metadata.key,
        set: { value: failed.toString() },
      })
      .run();
  }

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

  log.info(
    `Archive fileCrc32 regeneration complete (${updated}/${archiveRoms.length} updated, ${failed} failed)`
  );
}
