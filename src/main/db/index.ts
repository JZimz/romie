import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import logger from 'electron-log/main';
import * as schema from './schema';
import { runDataMigrations } from './migrations';

const log = logger.scope('db');

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export let db: AppDatabase = null!; // Will be set in initializeDatabase()

let sqlite: Database.Database | null = null;

export function getDatabaseBaseDir(): string {
  return app.isPackaged ? app.getPath('userData') : path.join(process.cwd(), '.romie');
}

export function getDatabasePath(): string {
  return path.join(getDatabaseBaseDir(), 'romie.db');
}

export function getSqlite(): Database.Database {
  if (!sqlite) {
    throw new Error('Database is not initialized');
  }

  return sqlite;
}

export function closeDatabase() {
  if (!sqlite) return;

  try {
    sqlite.close();
  } catch (error) {
    log.warn('Failed to close database:', error);
  } finally {
    sqlite = null;
  }
}

export async function initializeDatabase() {
  const baseDir = getDatabaseBaseDir();

  // Ensure directory exists (mainly for development, userData should always exist)
  fs.mkdirSync(baseDir, { recursive: true });

  const dbPath = getDatabasePath();

  log.info(`Initializing database at: ${dbPath}`);

  const sqliteDb = new Database(dbPath, {
    verbose: (_msg) => {
      // Uncomment to enable verbose SQL logging
      // log.debug(_msg)
    },
  });

  sqlite = sqliteDb;

  // WAL mode: Write-Ahead Logging allows reads to happen while writes are in progress
  // This means the app can query ROMs while importing new ones without blocking
  sqliteDb.pragma('journal_mode = WAL');

  // Foreign keys: Enforce referential integrity (e.g., can't have device pointing to non-existent profile)
  // SQLite doesn't enable this by default for backwards compatibility
  sqliteDb.pragma('foreign_keys = ON');

  // Synchronous NORMAL: Only sync critical writes to disk immediately, batch the rest
  // Faster than FULL, still safe with WAL mode, won't corrupt DB if app crashes
  sqliteDb.pragma('synchronous = NORMAL');

  db = drizzle(sqliteDb, { schema });

  // Run schema migrations (creates tables for new users)
  const migrationsPath = app.isPackaged
    ? path.join(process.resourcesPath, 'drizzle')
    : path.join(process.cwd(), 'drizzle');

  log.info('Running database migrations...', migrationsPath);
  migrate(db, { migrationsFolder: migrationsPath });

  // Run data migrations (LowDB migration, region detection fix, etc.)
  await runDataMigrations(db, baseDir);

  log.info('Database initialized successfully');

  return db;
}

export { schema };
