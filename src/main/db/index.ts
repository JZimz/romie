import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import logger from 'electron-log/main';
import * as schema from './schema';
import { migrateLowdbToSqlite } from './migrate-from-lowdb';

const log = logger.scope('db');

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export let db: AppDatabase = null!; // Will be set in initializeDatabase()

export async function initializeDatabase() {
  const baseDir = app.isPackaged ? app.getPath('userData') : path.join(process.cwd(), '.romie');

  // Ensure directory exists (mainly for development, userData should always exist)
  fs.mkdirSync(baseDir, { recursive: true });

  const dbPath = path.join(baseDir, 'romie.db');

  log.info(`Initializing database at: ${dbPath}`);

  const sqlite = new Database(dbPath, {
    verbose: (_msg) => {
      // Uncomment to enable verbose SQL logging
      // log.verbose(_msg)
    },
  });

  // WAL mode: Write-Ahead Logging allows reads to happen while writes are in progress
  // This means the app can query ROMs while importing new ones without blocking
  sqlite.pragma('journal_mode = WAL');

  // Foreign keys: Enforce referential integrity (e.g., can't have device pointing to non-existent profile)
  // SQLite doesn't enable this by default for backwards compatibility
  sqlite.pragma('foreign_keys = ON');

  // Synchronous NORMAL: Only sync critical writes to disk immediately, batch the rest
  // Faster than FULL, still safe with WAL mode, won't corrupt DB if app crashes
  sqlite.pragma('synchronous = NORMAL');

  db = drizzle(sqlite, { schema });

  // Run schema migrations (creates tables for new users)
  const migrationsPath = app.isPackaged
    ? path.join(process.resourcesPath, 'drizzle')
    : path.join(process.cwd(), 'drizzle');

  log.info('Running database migrations...', migrationsPath);
  migrate(db, { migrationsFolder: migrationsPath });

  // Migrate from LowDB if needed (existing users)
  migrateLowdbToSqlite(db, baseDir);

  log.info('Database initialized successfully');

  return db;
}

export { schema };
