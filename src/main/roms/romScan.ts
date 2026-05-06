import logger from 'electron-log/main';
import { app, BrowserWindow } from 'electron';
import yauzl from 'yauzl';
import path from 'path';
import fs from 'fs/promises';
import Seven from 'node-7z';
import { processRomFile } from './romImport';
import { get7zBinaryPath } from '@main/utils/zip.utils';
import { getAllSupportedExtensions } from '@/utils/systems';
import { RomProcessingError } from '@/errors';

import type { PathLike } from 'node:fs';
import type { ImportStatus } from '@/types/electron-api';
import type { RomFile } from '@/types/rom';

interface ScanResult {
  processed: number;
  errors: RomProcessingError[];
  skipped: string[];
}

const SUPPORTED_EXTENSIONS = getAllSupportedExtensions();
const SEVEN_ZIP_PATH = get7zBinaryPath();
const LARGE_DISC_EXTENSIONS = new Set(['.iso', '.rvz', '.gcm']);
const log = logger.scope('rom-scan');

export async function processRomDirectory(dirPath: PathLike): Promise<ScanResult> {
  log.debug(`Scanning for ROMs in ${dirPath}`);
  const results: ScanResult = { processed: 0, errors: [], skipped: [] };

  let files;
  try {
    files = await fs.readdir(dirPath);
  } catch (error) {
    const dirError = new RomProcessingError(
      `Failed to read directory`,
      dirPath.toString(),
      error instanceof Error ? error.message : 'Unknown error',
      error instanceof Error ? error : undefined
    );
    results.errors.push(dirError);
    return results;
  }

  for (const file of files) {
    const subResults = await processFile(dirPath, file);

    results.processed += subResults.processed;
    results.errors.push(...subResults.errors);
  }

  return results;
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

      // Handle manifest-based multi-file ROM formats before generic ROM processing
      if (ext === '.cue') {
        emitProgress({ currentFile: filename });
        return await processManifestRom(fullPath, 'cue');
      }
      if (ext === '.gdi') {
        emitProgress({ currentFile: filename });
        return await processManifestRom(fullPath, 'gdi');
      }

      if (!isRomFile(filename)) {
        log.debug('Skipping unsupported file', filename);
        return { processed: 0, errors: [], skipped: [filename] };
      }

      emitProgress({ currentFile: filename });

      let fileBuffer: Buffer | undefined;

      // Large disc images can be several GB, so avoid reading them fully into memory.
      if (!LARGE_DISC_EXTENSIONS.has(ext)) {
        fileBuffer = await fs.readFile(fullPath);
      }

      await processRomFile({
        sourcePath: fullPath,
        romBuffer: fileBuffer,
        romFilename: filename,
        filename,
        isArchive: false,
      });

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
    const romFile = await readRomFromSevenZip(archivePath);

    if (!romFile) {
      log.warn(`No ROM files found in 7z: ${archivePath}`);
      return { processed: 0, errors: [], skipped: [archivePath] };
    }

    await processRomFile(romFile);

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
    const romFile = await readRomFromZip(zipPath);

    if (!romFile) {
      log.warn(`No ROM files found in zip: ${zipPath}`);
      return { processed: 0, errors: [], skipped: [zipPath] };
    }

    await processRomFile(romFile);

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

async function listRomEntriesInSevenZip(archivePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const listStream = Seven.list(archivePath, {
      $bin: SEVEN_ZIP_PATH,
    });

    const romEntries: string[] = [];

    listStream.on('data', (data) => {
      const file = data.file;
      if (isRomFile(file)) {
        log.debug(`Found ROM in 7z: ${file}`);
        romEntries.push(file);
      }
    });

    listStream.on('end', () => {
      resolve(romEntries);
    });

    listStream.on('error', (error) => {
      log.error(`Error listing 7z file ${archivePath}:`, error);
      reject(
        new RomProcessingError(
          `Failed to list 7z file contents`,
          archivePath,
          error instanceof Error ? error.message : 'Unknown error',
          error instanceof Error ? error : undefined
        )
      );
    });
  });
}

async function readRomFromSevenZip(archivePath: string): Promise<RomFile | null> {
  const romEntries = await listRomEntriesInSevenZip(archivePath);

  // No ROM files found
  if (romEntries.length === 0) {
    log.warn(`No ROM files found in 7z: ${archivePath}`);
    return null;
  }

  // Multiple ROMs found
  if (romEntries.length > 1) {
    throw new RomProcessingError(
      `Multiple ROMs found in 7z file`,
      archivePath,
      `Found multiple ROM files in 7z file.`
    );
  }

  const romEntry = romEntries[0];
  const romExt = path.extname(romEntry).toLowerCase();

  // Check for large disc images before extraction
  if (LARGE_DISC_EXTENSIONS.has(romExt)) {
    throw new RomProcessingError(
      'Large disc images in archives are not supported',
      archivePath,
      'Please extract disc images before importing. They are too large (15-20s extraction time) to efficiently process from archives.'
    );
  }

  // Now extract the single cartridge ROM
  return new Promise((resolve, reject) => {
    const extractDir = path.join(app.getPath('temp'), `rom-${Date.now().toString()}`);
    const cleanTempDir = () => fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});

    const extractStream = Seven.extractFull(archivePath, extractDir, {
      $bin: SEVEN_ZIP_PATH,
    });

    extractStream.on('end', async () => {
      const fullPath = path.join(extractDir, romEntry);

      try {
        const romBuffer = await fs.readFile(fullPath);
        resolve({
          sourcePath: archivePath,
          filename: path.basename(archivePath),
          romFilename: path.basename(romEntry),
          romBuffer,
          isArchive: true,
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

    extractStream.on('error', (error) => {
      log.error(`Error extracting 7z file ${archivePath}:`, error);
      cleanTempDir();
      reject(
        new RomProcessingError(
          `Failed to extract 7z file`,
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
async function readRomFromZip(zipPath: string): Promise<RomFile | null> {
  return new Promise((resolve, reject) => {
    let romFileName: string | null = null;
    let romBuffer: Buffer | null = null;

    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        log.error(`Failed to open zip file ${zipPath}:`, err);

        reject(new RomProcessingError(`Failed to open zip file`, zipPath, err.message, err));
        return;
      }

      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        log.debug(`Processing zip entry: ${entry.fileName}`);
        // Directory file names end with '/' so skip them since we only care about files.
        if (/\/$/.test(entry.fileName)) {
          log.debug('Skipping directory', entry.fileName);
          zipfile.readEntry();
          return;
        }

        if (isRomFile(entry.fileName)) {
          log.debug(`Found rom file in zip: ${entry.fileName}`);

          if (romBuffer) {
            // Already found a ROM, so this is a violation of the 1-ROM-per-zip rule.
            reject(
              new RomProcessingError(
                `Multiple ROMs found in zip file`,
                zipPath,
                `Found multiple ROM files in zip file.`
              )
            );
            zipfile.close();
            return;
          }
          const romExt = path.extname(entry.fileName).toLowerCase();

          if (LARGE_DISC_EXTENSIONS.has(romExt)) {
            reject(
              new RomProcessingError(
                'Large disc images in archives are not supported',
                zipPath,
                'Please extract disc images before importing. They are too large (15-20s extraction time) to efficiently process from archives.'
              )
            );
            return;
          }

          zipfile.openReadStream(entry, (err, readStream) => {
            log.debug('Starting read stream for', entry.fileName);
            if (err) {
              reject(
                new RomProcessingError(
                  `Failed to open read stream for ROM in zip`,
                  zipPath,
                  err.message,
                  err
                )
              );
              return;
            }

            const chunks: Buffer[] = [];
            readStream.on('data', (chunk) => chunks.push(chunk));
            readStream.on('end', function () {
              log.debug(`Read stream completed for: ${entry.fileName}`);
              romFileName = entry.fileName;
              romBuffer = Buffer.concat(chunks);
              zipfile.readEntry();
            });
            readStream.on('error', (err) => {
              log.error(`Error decompressing ROM from zip ${zipPath}:`, err);
              reject(
                new RomProcessingError(
                  `Failed to decompress ROM from zip`,
                  zipPath,
                  err.message,
                  err
                )
              );
              zipfile.close();
            });
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on('error', (err) => {
        log.error(`Zip parsing error for ${zipPath}:`, err);
        reject(new RomProcessingError(`Zip file parsing failed`, zipPath, err.message, err));
      });

      zipfile.on('end', () => {
        log.debug(`Zip processing completed. ROM found: ${romFileName || 'none'}`);
        if (romBuffer && romFileName) {
          resolve({
            sourcePath: zipPath,
            filename: path.basename(zipPath),
            romFilename: romFileName,
            romBuffer,
            isArchive: true,
          });
        } else {
          resolve(null);
        }
      });
    });
  });
}

/**
 * Processes a manifest-based multi-file ROM (.cue or .gdi).
 * Parses the manifest to find associated data files, then imports the ROM
 * with relatedFiles populated so they can be copied alongside during sync.
 */
async function processManifestRom(
  manifestPath: string,
  format: 'cue' | 'gdi'
): Promise<ScanResult> {
  log.debug(`Processing ${format.toUpperCase()} manifest: ${manifestPath}`);

  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifestDir = path.dirname(manifestPath);
    const filename = path.basename(manifestPath);

    let dataFiles: string[];
    if (format === 'cue') {
      dataFiles = parseCueFile(content, manifestDir);
    } else {
      dataFiles = parseGdiFile(content, manifestDir);
    }

    log.debug(`Found ${dataFiles.length} related file(s) in ${filename}`);

    // Verify all referenced data files exist
    for (const dataFile of dataFiles) {
      try {
        await fs.access(dataFile);
      } catch {
        throw new RomProcessingError(
          `Missing data file referenced by ${format.toUpperCase()} manifest`,
          manifestPath,
          `Referenced file not found: ${path.basename(dataFile)}`
        );
      }
    }

    await processRomFile({
      sourcePath: manifestPath,
      romFilename: filename,
      filename,
      isArchive: false,
      relatedFiles: dataFiles,
    });

    return { processed: 1, errors: [], skipped: [] };
  } catch (error) {
    log.error(`Error processing ${format.toUpperCase()} file ${manifestPath}:`, error);
    const romError =
      error instanceof RomProcessingError
        ? error
        : new RomProcessingError(
            `Failed to process ${format.toUpperCase()} file`,
            manifestPath,
            error instanceof Error ? error.message : 'Unknown error',
            error instanceof Error ? error : undefined
          );
    return { processed: 0, errors: [romError], skipped: [] };
  }
}

/**
 * Parses a .cue file and returns the absolute paths of all referenced data files.
 *
 * CUE format example:
 *   FILE "Track 01.bin" BINARY
 *     TRACK 01 MODE2/2352
 *       INDEX 01 00:00:00
 *   FILE "Track 02.bin" BINARY
 *     TRACK 02 AUDIO
 *       INDEX 01 00:00:00
 */
function parseCueFile(content: string, baseDir: string): string[] {
  const dataFiles: string[] = [];
  const seen = new Set<string>();

  // Match FILE "filename" <format> lines (format can be BINARY, WAVE, AIFF, MP3, etc.)
  const linePattern = /^FILE\s+"([^"]+)"\s+\S+/gim;

  let match;
  while ((match = linePattern.exec(content)) !== null) {
    const referencedFile = match[1];
    const absolutePath = path.resolve(baseDir, referencedFile);

    if (!seen.has(absolutePath)) {
      seen.add(absolutePath);
      dataFiles.push(absolutePath);
      log.debug(`CUE references: ${referencedFile}`);
    }
  }

  return dataFiles;
}

/**
 * Parses a .gdi file and returns the absolute paths of all referenced data files.
 *
 * GDI format (one track per line after the count):
 *   3
 *   1 0 4 2352 track01.bin 0
 *   2 600 0 2352 track02.raw 0
 *   3 45000 4 2352 track03.bin 0
 */
function parseGdiFile(content: string, baseDir: string): string[] {
  const dataFiles: string[] = [];
  const seen = new Set<string>();
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and the track count line (pure number)
    if (!trimmed || /^\d+$/.test(trimmed)) continue;

    // Each track line: <num> <lba> <type> <sectorSize> <filename> <padding>
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 5) {
      const referencedFile = parts[4];
      const absolutePath = path.resolve(baseDir, referencedFile);

      if (!seen.has(absolutePath)) {
        seen.add(absolutePath);
        dataFiles.push(absolutePath);
        log.debug(`GDI references: ${referencedFile}`);
      }
    }
  }

  return dataFiles;
}

function emitProgress(progress: ImportStatus) {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  mainWindow?.webContents.send('rom:import-progress', progress);
}

function isRomFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();

  return SUPPORTED_EXTENSIONS.includes(ext);
}
