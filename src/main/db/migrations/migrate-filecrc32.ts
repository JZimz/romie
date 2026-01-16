import logger from 'electron-log/main';
import fs from 'node:fs';
import path from 'node:path';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, sql } from 'drizzle-orm';
import { crc32sum, fileExists } from '@/main/roms/romUtils';
import { schema } from '@/main/db';
import { getMigrationsDir } from './index';

const log = logger.scope('db:filecrc32-migration');

type AppDatabase = BetterSQLite3Database<typeof schema>;

/**
 * Migrates fileCrc32 for archive ROMs to use the source file hash.
 *
 * Previously, fileCrc32 was calculated from the ROM content inside archives.
 * This migration recalculates it from the actual archive file on disk so that
 * post-sync verification works correctly.
 *
 * Addresses issue #103: ZIP files fail hash verification after syncing
 */
export async function migrateFileCrc32(db: AppDatabase, baseDir: string) {
  const migrationsDir = getMigrationsDir(baseDir);
  fs.mkdirSync(migrationsDir, { recursive: true });
  const markerPath = path.join(migrationsDir, 'filecrc32-v1');

  if (fs.existsSync(markerPath)) {
    log.info('fileCrc32 migration already completed, skipping');
    return;
  }

  log.info('Starting fileCrc32 migration for archive ROMs...');

  try {
    // Only select ROMs with archive file extensions (case-insensitive)
    // Select only columns needed for migration to reduce memory usage
    const archiveRoms = await db
      .select({
        id: schema.roms.id,
        filePath: schema.roms.filePath,
        filename: schema.roms.filename,
        fileCrc32: schema.roms.fileCrc32,
      })
      .from(schema.roms)
      .where(
        sql`lower(${schema.roms.filename}) like '%.zip' or lower(${schema.roms.filename}) like '%.7z'`
      );

    let updatedCount = 0;
    let skippedCount = 0;
    let missingCount = 0;

    log.info(`Found ${archiveRoms.length} archive ROMs to migrate`);

    for (const rom of archiveRoms) {
      // Verify source file still exists
      if (!(await fileExists(rom.filePath))) {
        log.warn(`Source file missing, skipping: ${rom.filePath}`);
        missingCount++;
        continue;
      }

      try {
        const newCrc32 = await crc32sum({ filePath: rom.filePath });

        if (newCrc32 !== rom.fileCrc32) {
          await db
            .update(schema.roms)
            .set({ fileCrc32: newCrc32 })
            .where(eq(schema.roms.id, rom.id));

          updatedCount++;
          log.debug(`Updated CRC32 for "${rom.filename}": ${rom.fileCrc32} → ${newCrc32}`);
        } else {
          skippedCount++;
        }
      } catch (error) {
        log.error(`Failed to hash ${rom.filename}:`, error);
        skippedCount++;
      }
    }

    fs.writeFileSync(markerPath, new Date().toISOString());

    log.info(
      `fileCrc32 migration completed: ${updatedCount} updated, ${skippedCount} unchanged, ${missingCount} missing`
    );
  } catch (error) {
    log.error('fileCrc32 migration failed:', error);
    throw error;
  }
}
