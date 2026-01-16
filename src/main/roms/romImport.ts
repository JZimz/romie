import path from 'path';
import logger from 'electron-log/main';
import fs from 'fs/promises';
import { getConsoleIdForSystem, determineSystem } from '@/utils/systems';
import { RomProcessingError } from '@/errors';
import {
  extractRegionFromFilename,
  cleanDisplayName,
  ramd5sum,
  md5sum,
  crc32sum,
} from './romUtils';
import { addRom } from './romDatabase';
import { lookupRomByHash } from './romLookup';

import type { Rom, RomFile } from '@/types/rom';

const log = logger.scope(`rom-process`);

/**
 * Process a ROM file and add it to the database
 * @param romFile - ROM file information
 * @returns Promise that resolves to the created ROM metadata
 */
export async function processRomFile(
  romFile: RomFile
): Promise<Omit<Rom, 'id' | 'createdAt' | 'updatedAt' | 'numAchievements'>> {
  const { filename, romFilename, sourcePath } = romFile;
  const fileExtension = path.extname(romFilename);

  log.info(`Processing ROM file: ${filename} (${romFilename})`);

  try {
    // Determine system information from extension
    log.debug(`Determining system from extension ${fileExtension}`);
    const system = determineSystem(romFile);
    const consoleId = getConsoleIdForSystem(system);
    log.debug(`Detected system: ${system}, consoleId: ${consoleId}`);

    const ramd5 = ramd5sum(consoleId, romFile);
    const md5 = await md5sum({ filePath: romFile.sourcePath, buffer: romFile.romBuffer });
    const fileCrc32 = await crc32sum({ filePath: romFile.sourcePath });
    const hashes = { ramd5, md5, fileCrc32 };

    log.debug(
      `Generated hashes: ` +
        `MD5=${hashes.md5?.substring(0, 8)}..., ` +
        `RAMD5=${hashes.ramd5?.substring(0, 8)}..., ` +
        `CRC32=${hashes.fileCrc32}`
    );

    // Attempt to identify game and system from file hash.
    // If no match by hash, fallback to extension-based detection and filename cleaning.
    log.debug('Checking if rom exists in retroachievements db...');
    const game = hashes.ramd5 ? await lookupRomByHash(hashes.ramd5) : null;
    let displayName: string;
    let verified = false;

    if (game) {
      log.debug(`Found matching game in database: ${game.title} (${game.consoleName})`);

      displayName = game.title;
      verified = true;
    } else {
      log.warn(`No matching game found in database for hash.`);

      // Create displayName by stripping: region tag, dump tags ([!], [v1.1]), punctuation
      displayName = cleanDisplayName(romFilename);
      log.debug(`Clean display name: ${displayName}`);
    }

    // Extract region tag from filename e.g. (USA), (JPN) fallback: "Unknown"
    log.debug(`Extracting region from filename`);
    const region = extractRegionFromFilename(romFilename);
    log.debug(`Detected region: ${region}`);

    // Get file size
    log.debug(`Getting file statistics`);
    const stats = await fs.stat(sourcePath);
    const size = stats.size;

    // Create metadata object
    const metadata: Omit<Rom, 'id' | 'createdAt' | 'updatedAt' | 'numAchievements'> = {
      system,
      displayName,
      region,
      // Actual file basename (e.g., "Super Metroid.zip")
      filename: filename,
      // ROM filename for system detection (e.g., "Super Metroid.sfc")
      romFilename,
      filePath: sourcePath,
      size,
      tags: [],
      notes: '',
      favorite: false,
      verified,
      ...hashes,
    };

    // Update ROM database
    await addRom(metadata);

    log.info(`Successfully processed ROM: ${displayName} (${system})`);

    return metadata;
  } catch (error) {
    log.error(`Failed to process ROM file: ${filename} (${romFilename})`, error);

    const romError = new RomProcessingError(
      `Failed to process ROM: ${filename} (${romFilename})`,
      sourcePath,
      error instanceof Error ? error.message : 'Unknown error',
      error instanceof Error ? error : undefined
    );

    throw romError;
  }
}
