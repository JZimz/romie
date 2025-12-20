import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import logger from 'electron-log/main';
import { runMigrations } from './migrations';

const log = logger.scope('db');

function getBaseDir(): string {
  // Development environment
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), '.romie');
  }

  // Production environment
  return app.getPath('userData');
}

const baseDir = getBaseDir();
const DB_PATH = path.join(baseDir, 'romie.db');

let db: Database.Database | null = null;

const LATEST_VERSION = 1;

export function getDatabase(): Database.Database {
  if (!db) {
    // Ensure the database directory exists before opening the file
    fs.mkdirSync(baseDir, { recursive: true });

    log.info(`Opening database at ${DB_PATH}`);
    db = new Database(DB_PATH, {
      verbose: process.env.NODE_ENV === 'development' ? (sql) => log.debug(sql) : undefined,
    });

    // WAL mode: Write-Ahead Logging allows reads to happen while writes are in progress
    // This means the app can query ROMs while importing new ones without blocking
    db.pragma('journal_mode = WAL');

    // Foreign keys: Enforce referential integrity (e.g., can't have device pointing to non-existent profile)
    // SQLite doesn't enable this by default for backwards compatibility
    db.pragma('foreign_keys = ON');

    // Synchronous NORMAL: Only sync critical writes to disk immediately, batch the rest
    // Faster than FULL, still safe with WAL mode, won't corrupt DB if app crashes
    db.pragma('synchronous = NORMAL');

    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database) {
  const currentVersion = getUserVersion(db);

  if (currentVersion === 0) {
    // Fresh database
    log.info('Initializing fresh database schema');
    createSchema(db);
  }

  if (currentVersion < LATEST_VERSION) {
    // Run migrations
    log.info(`Migrating database from version ${currentVersion} to ${LATEST_VERSION}`);
    runMigrations(db, currentVersion);
    setUserVersion(db, LATEST_VERSION);
  }
}

function getUserVersion(db: Database.Database): number {
  return db.pragma('user_version', { simple: true }) as number;
}

function setUserVersion(db: Database.Database, version: number) {
  db.pragma(`user_version = ${version}`);
}

function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roms (
      id TEXT PRIMARY KEY,
      displayName TEXT NOT NULL,
      system TEXT NOT NULL,
      region TEXT NOT NULL,
      filePath TEXT NOT NULL,
      filename TEXT NOT NULL,
      romFilename TEXT NOT NULL,
      size INTEGER NOT NULL,
      md5 TEXT NOT NULL UNIQUE,
      fileCrc32 TEXT,
      ramd5 TEXT,
      verified INTEGER DEFAULT 0,
      tags TEXT,
      favorite INTEGER DEFAULT 0,
      notes TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_roms_system ON roms(system);
    CREATE INDEX IF NOT EXISTS idx_roms_verified ON roms(verified);
    CREATE INDEX IF NOT EXISTS idx_roms_md5 ON roms(md5);

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      profileId TEXT NOT NULL,
      deviceInfo TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deviceProfiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      romBasePath TEXT NOT NULL,
      systemMappings TEXT NOT NULL,
      isBuiltIn INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      version INTEGER
    );

    CREATE TABLE IF NOT EXISTS appSettings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS integrations (
      service TEXT PRIMARY KEY,
      config TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    INSERT OR IGNORE INTO appSettings (key, value, createdAt, updatedAt)
    VALUES ('theme', '"system"', strftime('%s','now') * 1000, strftime('%s','now') * 1000);
  `);

  log.info('Database schema created successfully');
}

export function closeDatabase() {
  if (db) {
    log.info('Closing database connection');
    db.close();
    db = null;
  }
}

// Close on app quit (only in non-test environments)
if (!process.env.VITEST) {
  app.on('quit', closeDatabase);
}
