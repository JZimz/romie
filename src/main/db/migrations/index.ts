import path from 'node:path';
import logger from 'electron-log/main';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { schema } from '@/main/db';
import { migrateLowdbToSqlite } from './migrate-from-lowdb';
import { migrateRegionDetection } from './migrate-region-detection';
import { migrateFileCrc32 } from './migrate-filecrc32';

const log = logger.scope('db:migrations');

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export function getMigrationsDir(baseDir: string): string {
  return path.join(baseDir, '.migrations');
}

/**
 * Runs all data migrations in order.
 * These are distinct from Drizzle schema migrations - they transform
 * existing data to match updated business logic.
 *
 * Each migration is self-contained and responsible for:
 * - Creating its marker directory if needed
 * - Checking if it has already run (via marker file)
 * - Performing the migration atomically
 * - Writing its completion marker
 */
export async function runDataMigrations(db: AppDatabase, baseDir: string): Promise<void> {
  log.info('Running data migrations...');

  // Run migrations in order - add new migrations to the end
  await migrateLowdbToSqlite(db, baseDir);
  await migrateRegionDetection(db, baseDir);
  await migrateFileCrc32(db, baseDir);

  log.info('Data migrations completed');
}
