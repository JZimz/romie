import logger from 'electron-log/main';
import fs from 'node:fs';
import path from 'node:path';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { extractRegionFromFilename } from '@/main/roms/romUtils';
import { schema } from '@/main/db';
import { getMigrationsDir } from './index';

const log = logger.scope('db:region-migration');

type AppDatabase = BetterSQLite3Database<typeof schema>;

/**
 * Migrates ROM regions to fix false positives from old detection logic.
 *
 * This migration re-calculates regions for all existing ROMs using the improved
 * region detection logic that:
 * - Only matches regions in proper tags like (USA) or [Europe]
 * - No longer matches substrings (e.g., "kr" in "arkretrn.zip")
 * - Supports additional European countries
 *
 * Addresses issue #97: Region detection has false positives and missing mappings
 */
export async function migrateRegionDetection(db: AppDatabase, baseDir: string) {
  const migrationsDir = getMigrationsDir(baseDir);
  fs.mkdirSync(migrationsDir, { recursive: true });
  const markerPath = path.join(migrationsDir, 'region-detection-v1');

  // Skip if migration already ran (check both locations)
  if (fs.existsSync(markerPath)) {
    log.info('Region detection migration already completed, skipping');
    return;
  }

  log.info('Starting region detection migration...');

  try {
    // Select only columns needed for migration to reduce memory usage
    const allRoms = await db
      .select({
        id: schema.roms.id,
        filename: schema.roms.filename,
        region: schema.roms.region,
      })
      .from(schema.roms);
    let updatedCount = 0;
    let unchangedCount = 0;

    log.info(`Found ${allRoms.length} ROMs to check`);

    // Process in transaction for atomicity
    db.transaction(() => {
      for (const rom of allRoms) {
        const newRegion = extractRegionFromFilename(rom.filename);

        if (newRegion !== rom.region) {
          db.update(schema.roms).set({ region: newRegion }).where(eq(schema.roms.id, rom.id)).run();

          updatedCount++;

          // Log notable changes for debugging
          if (rom.region !== 'Unknown' && newRegion === 'Unknown') {
            log.debug(`Corrected false positive: "${rom.filename}" ${rom.region} → ${newRegion}`);
          }
        } else {
          unchangedCount++;
        }
      }
    });

    // Mark migration as complete in new location
    fs.writeFileSync(markerPath, new Date().toISOString());

    log.info(
      `Region detection migration completed: ${updatedCount} ROMs updated, ${unchangedCount} unchanged`
    );
  } catch (error) {
    log.error('Region detection migration failed:', error);
    throw error;
  }
}
