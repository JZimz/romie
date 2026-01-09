import { app } from 'electron';
import logger from 'electron-log/main';
import Database from 'better-sqlite3';
import yauzl from 'yauzl';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { get7zBinaryPath } from '@main/roms/romUtils';
import {
  closeDatabase,
  getDatabaseBaseDir,
  getDatabasePath,
  getSqlite,
  initializeDatabase,
} from './index';

const log = logger.scope('db-management');
const SEVEN_ZIP_PATH = get7zBinaryPath();

export async function createDatabaseBackupZip(zipPath: string) {
  const tempDir = await fs.mkdtemp(path.join(app.getPath('temp'), 'romie-db-backup-'));
  const tempDbPath = path.join(tempDir, 'romie.db');

  try {
    await getSqlite().backup(tempDbPath);
    await createZip(zipPath, tempDir, ['romie.db']);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function restoreDatabaseFromZip(zipPath: string) {
  const tempDir = await fs.mkdtemp(path.join(app.getPath('temp'), 'romie-db-restore-'));
  const extractedDbPath = path.join(tempDir, 'romie.db');

  try {
    await extractRomieDbFromZip(zipPath, extractedDbPath);
    validateDatabaseFile(extractedDbPath);

    closeDatabase();
    try {
      await replaceDatabaseFile(extractedDbPath);
    } catch (error) {
      initializeDatabase();
      throw error;
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function resetDatabase() {
  closeDatabase();

  const dbPath = getDatabasePath();
  try {
    await deleteDatabaseFiles(dbPath);
  } catch (error) {
    initializeDatabase();
    throw error;
  }
}

async function replaceDatabaseFile(nextDbPath: string) {
  const baseDir = getDatabaseBaseDir();
  const dbPath = getDatabasePath();
  const backupSuffix = `.bak-${Date.now().toString()}`;
  const dbBackupPath = `${dbPath}${backupSuffix}`;
  const walBackupPath = `${dbPath}-wal${backupSuffix}`;
  const shmBackupPath = `${dbPath}-shm${backupSuffix}`;

  await fs.mkdir(baseDir, { recursive: true });

  await moveIfExists(dbPath, dbBackupPath);
  await moveIfExists(`${dbPath}-wal`, walBackupPath);
  await moveIfExists(`${dbPath}-shm`, shmBackupPath);

  try {
    await deleteDatabaseFiles(dbPath);
    await fs.copyFile(nextDbPath, dbPath);
    await fs.rm(dbBackupPath, { force: true });
    await fs.rm(walBackupPath, { force: true });
    await fs.rm(shmBackupPath, { force: true });
  } catch (error) {
    await deleteDatabaseFiles(dbPath);
    await moveIfExists(dbBackupPath, dbPath);
    await moveIfExists(walBackupPath, `${dbPath}-wal`);
    await moveIfExists(shmBackupPath, `${dbPath}-shm`);

    throw error;
  }
}

async function deleteDatabaseFiles(dbPath: string) {
  await fs.rm(dbPath, { force: true });
  await fs.rm(`${dbPath}-wal`, { force: true });
  await fs.rm(`${dbPath}-shm`, { force: true });
}

async function moveIfExists(from: string, to: string) {
  try {
    await fs.rename(from, to);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

function validateDatabaseFile(dbPath: string) {
  const tempDb = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    // Check integrity
    const integrityResult = tempDb.pragma('integrity_check', { simple: true });
    if (integrityResult !== 'ok') {
      throw new Error('Database file is corrupted');
    }

    // Check for roms table (core table since v0.1)
    const romsTable = tempDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='roms'")
      .get();

    if (!romsTable) {
      throw new Error('Not a valid ROMie database backup');
    }
  } finally {
    tempDb.close();
  }
}

async function extractRomieDbFromZip(zipPath: string, outDbPath: string) {
  await new Promise<void>((resolve, reject) => {
    let extracted = false;
    let settled = false;

    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    yauzl.open(zipPath, { lazyEntries: true }, (error, zipfile) => {
      if (error || !zipfile) {
        rejectOnce(error ?? new Error('Failed to open zip file'));
        return;
      }

      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        const entryBaseName = path.basename(entry.fileName);

        if (/\/$/.test(entry.fileName)) {
          zipfile.readEntry();
          return;
        }

        if (entryBaseName !== 'romie.db') {
          zipfile.readEntry();
          return;
        }

        if (extracted) {
          zipfile.close();
          rejectOnce(new Error('Backup zip contains multiple romie.db files'));
          return;
        }

        extracted = true;

        zipfile.openReadStream(entry, (err, readStream) => {
          if (err || !readStream) {
            zipfile.close();
            rejectOnce(err ?? new Error('Failed to read zip entry'));
            return;
          }

          const writeStream = createWriteStream(outDbPath);
          readStream.pipe(writeStream);

          writeStream.on('finish', () => {
            zipfile.close();
            resolveOnce();
          });

          writeStream.on('error', (writeError) => {
            zipfile.close();
            rejectOnce(writeError);
          });

          readStream.on('error', (readError) => {
            zipfile.close();
            rejectOnce(readError);
          });
        });
      });

      zipfile.on('error', (err) => {
        rejectOnce(err);
      });

      zipfile.on('end', () => {
        if (!extracted && !settled) {
          rejectOnce(new Error('Backup zip does not contain romie.db'));
        }
      });
    });
  });
}

async function createZip(zipPath: string, cwd: string, fileNames: string[]) {
  log.debug(`Creating zip at ${zipPath} from ${cwd}`);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(SEVEN_ZIP_PATH, ['a', '-tzip', zipPath, ...fileNames], { cwd });

    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      const details = stderr.trim();
      reject(new Error(details ? `7zip failed: ${details}` : `7zip failed with exit code ${code}`));
    });
  });
}
