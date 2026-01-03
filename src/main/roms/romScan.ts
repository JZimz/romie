import logger from 'electron-log/main';
import { app, BrowserWindow } from 'electron';
import yauzl from 'yauzl';
import path from 'path';
import fs from 'fs/promises';
import * as Sentry from '@sentry/electron/main';
import Seven from 'node-7z';
import { processRomFile } from './romImport';
import { get7zBinaryPath } from './romUtils';
import { getAllSupportedExtensions } from '@/utils/systems';
import { RomProcessingError } from '@/errors';

import type { PathLike } from 'node:fs';
import type { Readable } from 'stream';
import type { ImportStatus } from '@/types/electron-api';

interface ScanResult {
  processed: number;
  errors: RomProcessingError[];
  skipped: string[];
}

const SUPPORTED_EXTENSIONS = getAllSupportedExtensions();
const SEVEN_ZIP_PATH = get7zBinaryPath();
const log = logger.scope('rom-scan');

export async function processRomDirectory(dirPath: PathLike): Promise<ScanResult> {
  return await Sentry.startSpan(
    {
      op: 'rom.scan',
      name: 'Scan ROM Directory',
      attributes: {
        'scan.directory': dirPath.toString(),
      },
    },
    async (span) => {
      log.debug(`Scanning for ROMs in ${dirPath}`);
      const results: ScanResult = { processed: 0, errors: [], skipped: [] };

      let files;
      try {
        files = await fs.readdir(dirPath);
      } catch (error) {
        span.setStatus({ code: 2, message: 'Failed to read directory' });
        span.recordException(error instanceof Error ? error : new Error(String(error)));

        const dirError = new RomProcessingError(
          `Failed to read directory`,
          dirPath.toString(),
          error instanceof Error ? error.message : 'Unknown error',
          error instanceof Error ? error : undefined
        );
        results.errors.push(dirError);
        return results;
      }

      span.setAttributes({
        'scan.files_found': files.length,
      });

      for (const file of files) {
        const subResults = await processFile(dirPath, file);

        results.processed += subResults.processed;
        results.errors.push(...subResults.errors);
      }

      span.setAttributes({
        'scan.files_processed': results.processed,
        'scan.errors_count': results.errors.length,
      });

      return results;
    }
  );
}

//= Helpers ==

async function processFile(dirPath: PathLike, filename: string): Promise<ScanResult> {
  const fullPath = path.join(dirPath.toString(), filename);

  try {
    if (filename.startsWith('.')) {
      return { processed: 0, errors: [], skipped: [] };
    }

    const fileStats = await fs.stat(fullPath);

    if (fileStats.isDirectory()) {
      return await processRomDirectory(fullPath);
    }

    if (fileStats.isFile()) {
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.7z') {
        emitProgress({ currentFile: filename });
        return await processSevenZipFile(fullPath);
      }
      if (ext === '.zip') {
        emitProgress({ currentFile: filename });
        const result = await processZipFile(fullPath);

        // If the zip was skipped for any reason then fall through to check if it's a direct ROM file
        // like an arcade game. This has the side effect of letting random zip files be treated as ROMs.
        if (result.skipped.length === 0) {
          return result;
        }
      }

      if (!isRomFile(filename)) {
        log.debug('Skipping unsupported file', filename);
        return { processed: 0, errors: [], skipped: [filename] };
      }

      emitProgress({ currentFile: filename });
      const fileBuffer = await fs.readFile(fullPath);
      await processRomFile(fullPath, filename, fileBuffer);

      return { processed: 1, errors: [], skipped: [] };
    }

    return { processed: 0, errors: [], skipped: [] };
  } catch (error) {
    const romError =
      error instanceof RomProcessingError
        ? error
        : new RomProcessingError(
            `Failed to process ROM: ${filename}`,
            fullPath,
            error instanceof Error ? error.message : 'Unknown error',
            error instanceof Error ? error : undefined
          );

    return {
      processed: 0,
      errors: [romError],
      skipped: [],
    };
  }
}

async function processSevenZipFile(archivePath: string): Promise<ScanResult> {
  log.debug(`Checking for ROMs in ${archivePath}`);

  try {
    const romBuffer = await readRomFromSevenZip(archivePath);

    if (!romBuffer) {
      log.warn(`No ROM files found in 7z: ${archivePath}`);
      return { processed: 0, errors: [], skipped: [archivePath] };
    }

    await processRomFile(archivePath, romBuffer.fileName, romBuffer.buffer);

    return { processed: 1, errors: [], skipped: [] };
  } catch (error) {
    log.error(`Error processing zip file ${archivePath}:`, error);
    const sevenZipError =
      error instanceof RomProcessingError
        ? error
        : new RomProcessingError(
            `Failed to process 7z file`,
            archivePath,
            error instanceof Error ? error.message : 'Unknown error',
            error instanceof Error ? error : undefined
          );

    return { processed: 0, errors: [sevenZipError], skipped: [] };
  }
}

async function processZipFile(zipPath: string): Promise<ScanResult> {
  log.debug(`Checking for ROMs in ${zipPath}`);

  try {
    const romBuffer = await readRomFromZip(zipPath);

    if (!romBuffer) {
      log.warn(`No ROM files found in zip: ${zipPath}`);
      return { processed: 0, errors: [], skipped: [zipPath] };
    }

    await processRomFile(zipPath, romBuffer.fileName, romBuffer.buffer);

    return { processed: 1, errors: [], skipped: [] };
  } catch (error) {
    log.error(`Error processing zip file ${zipPath}:`, error);
    const zipError =
      error instanceof RomProcessingError
        ? error
        : new RomProcessingError(
            `Failed to process zip file`,
            zipPath,
            error instanceof Error ? error.message : 'Unknown error',
            error instanceof Error ? error : undefined
          );

    return { processed: 0, errors: [zipError], skipped: [] };
  }
}

async function readRomFromSevenZip(archivePath: string): Promise<{
  fileName: string;
  buffer: Buffer;
} | null> {
  return new Promise((resolve, reject) => {
    const extractDir = path.join(app.getPath('temp'), `rom-${Date.now().toString()}`);
    const stream = Seven.extractFull(archivePath, extractDir, {
      $bin: SEVEN_ZIP_PATH,
    });
    const cleanTempDir = () => fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
    const romFiles: string[] = [];

    stream.on('data', ({ status, file }) => {
      if (status === 'extracted' && isRomFile(file)) {
        log.debug(`Found 7z entry: ${file}`);
        const fullPath = path.join(extractDir, file);

        if (romFiles.length) {
          // Already found a ROM, so this is a violation of the 1-ROM-per-zip rule.
          reject(
            new RomProcessingError(
              `Multiple ROMs found in 7z file`,
              archivePath,
              `Found multiple ROM files in 7z file.`
            )
          );
          stream.destroy();
          return;
        }

        romFiles.push(fullPath);
      }
    });

    stream.on('end', async () => {
      const romFilePath = romFiles[0];

      if (!romFilePath) {
        resolve(null);
        return;
      }

      try {
        const romBuffer = await fs.readFile(romFilePath);
        resolve({
          fileName: path.basename(romFilePath),
          buffer: romBuffer,
        });
      } catch (error) {
        log.error(`Error reading extracted ROM from 7z:`, error);
        reject(
          new RomProcessingError(
            `Failed to read extracted ROM from 7z`,
            archivePath,
            error instanceof Error ? error.message : 'Unknown error',
            error instanceof Error ? error : undefined
          )
        );
      } finally {
        cleanTempDir();
      }
    });

    stream.on('error', (error) => {
      log.error(`Error processing 7z file ${archivePath}:`, error);
      cleanTempDir();
      reject(
        new RomProcessingError(
          `Failed to process 7z file`,
          archivePath,
          error instanceof Error ? error.message : 'Unknown error',
          error instanceof Error ? error : undefined
        )
      );
    });
  });
}

/**
 * Enforces 1-ROM-per-zip constraint to maintain clean sync architecture.
 * Multiple ROMs in one zip would create mapping issues when syncing to devices
 * since each ROM entry needs a unique file path reference.
 */
async function readRomFromZip(zipPath: string): Promise<{
  fileName: string;
  buffer: Buffer;
} | null> {
  return new Promise((resolve, reject) => {
    let aborted = false;
    let settled = false;
    let zipfile: yauzl.ZipFile | undefined;
    let currentReadStream: Readable | undefined;
    let romFileName: string | null = null;
    let romBuffer: Buffer | null = null;

    const cleanup = () => {
      if (aborted) return;
      aborted = true;

      currentReadStream?.destroy();
      zipfile?.removeAllListeners();

      try {
        zipfile?.close();
      } catch {
        // ignore
      }
    };

    const safeResolve = (value: { fileName: string; buffer: Buffer } | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const safeReject = (error: RomProcessingError) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    yauzl.open(zipPath, { lazyEntries: true }, (err, zf) => {
      if (err) {
        log.error(`Failed to open zip file ${zipPath}:`, err);

        safeReject(new RomProcessingError(`Failed to open zip file`, zipPath, err.message, err));
        return;
      }

      if (aborted) {
        zf.close();
        return;
      }

      // Stored for cleanup after an early exit.
      zipfile = zf;

      zf.readEntry();

      zf.on('entry', (entry) => {
        if (aborted) return;
        log.debug(`Processing zip entry: ${entry.fileName}`);
        // Directory file names end with '/' so skip them since we only care about files.
        if (/\/$/.test(entry.fileName)) {
          log.debug('Skipping directory', entry.fileName);
          zf.readEntry();
          return;
        }

        if (isRomFile(entry.fileName)) {
          log.debug(`Found rom file in zip: ${entry.fileName}`);

          if (romBuffer) {
            // Already found a ROM, so this is a violation of the 1-ROM-per-zip rule.
            safeReject(
              new RomProcessingError(
                `Multiple ROMs found in zip file`,
                zipPath,
                `Found multiple ROM files in zip file: ${romFileName} and ${entry.fileName}`
              )
            );
            return;
          }

          zf.openReadStream(entry, (err, readStream) => {
            log.debug('Starting read stream for', entry.fileName);
            if (err) {
              safeReject(
                new RomProcessingError(
                  `Failed to open read stream for ROM in zip`,
                  zipPath,
                  err.message,
                  err
                )
              );
              return;
            }

            if (aborted) {
              readStream.destroy();
              return;
            }

            currentReadStream = readStream;
            const chunks: Buffer[] = [];
            readStream.on('data', (chunk) => {
              if (aborted) return;
              chunks.push(chunk);
            });
            readStream.on('error', (streamError) => {
              safeReject(
                new RomProcessingError(
                  `Failed to read ROM entry from zip`,
                  zipPath,
                  `Zip entry ${entry.fileName} failed to decompress: ${streamError.message}`,
                  streamError
                )
              );
            });
            readStream.on('end', function () {
              if (aborted) return;
              log.debug(`Read stream completed for: ${entry.fileName}`);
              romFileName = entry.fileName;
              romBuffer = Buffer.concat(chunks);
              currentReadStream = undefined;
              zf.readEntry();
            });
          });
        } else {
          zf.readEntry();
        }
      });

      zf.on('error', (err) => {
        if (aborted) return;
        log.error(`Zip parsing error for ${zipPath}:`, err);
        safeReject(new RomProcessingError(`Zip file parsing failed`, zipPath, err.message, err));
      });

      zf.on('end', () => {
        if (aborted) return;
        log.debug(`Zip processing completed. ROM found: ${romFileName || 'none'}`);
        safeResolve(romBuffer && romFileName ? { fileName: romFileName, buffer: romBuffer } : null);
      });
    });
  });
}

function emitProgress(progress: ImportStatus) {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  mainWindow?.webContents.send('rom:import-progress', progress);
}

function isRomFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();

  return SUPPORTED_EXTENSIONS.includes(ext);
}
