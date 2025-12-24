import path from 'path';
import logger from 'electron-log/main';
import fs from 'fs/promises';
import * as Sentry from '@sentry/electron/main';
import { hash } from '@romie/ra-hasher';
import { getConsoleIdForSystem, determineSystemFromExtension } from '@/utils/systems';
import { RomProcessingError } from '@/errors';
import { extractRegionFromFilename, cleanDisplayName, md5sum, crc32sum } from './romUtils';
import { addRom } from './romDatabase';
import { lookupRomByHash } from './romLookup';

import type { Rom } from '@/types/rom';

/**
 * Process a ROM file and add it to the database
 * @param filePath - Path to file (zip archive or individual ROM)
 * @param fileName - ROM filename (may differ from filePath basename if extracted from zip)
 * @param fileBuffer - ROM file data buffer
 * @returns Promise that resolves to the created ROM metadata
 */
export async function processRomFile(
  filePath: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<Omit<Rom, 'id' | 'createdAt' | 'updatedAt' | 'numAchievements'>> {
  const log = logger.scope(`rom-process`);
  const fileExtension = path.extname(fileName);
  log.debug(`Starting ROM processing for file: ${filePath}`);

  return await Sentry.startSpan(
    {
      op: 'rom.process',
      name: 'Process ROM File',
      attributes: {
        'rom.extension': fileExtension,
      },
    },
    async (span) => {
      const fileBaseName = path.basename(filePath);

      try {
        log.info(`Processing ROM file: ${fileBaseName} (${fileName})`);

        // Determine system information from extension
        log.debug(`Determining system from extension ${fileExtension}`);
        const system = determineSystemFromExtension(fileExtension);
        const consoleId = getConsoleIdForSystem(system);
        log.debug(`Detected system: ${system}, consoleId: ${consoleId}`);

        log.debug(`Generating hash for input file`);

        // Generate ROM hashes for deduplication and RetroAchievements lookups.
        log.debug(`Generating hashes for ROM file`);
        const hashes = await Sentry.startSpan(
          { op: 'rom.hash', name: 'Generate ROM Hashes' },
          async () => {
            // Generate the RetroAchievements specific hash for game verification if we know the console id.
            const ramd5 = consoleId
              ? (await hash({ consoleId, path: filePath, buffer: fileBuffer })).ramd5
              : null;
            // Generate MD5 hash of the ROM content for deduplication.
            const md5 = await md5sum({ buffer: fileBuffer });
            // Generate hash of the input file for integrity checks.
            const fileCrc32 = await crc32sum({ filePath });

            return { ramd5, md5, fileCrc32 };
          }
        );
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
          displayName = cleanDisplayName(fileName);
          log.debug(`Clean display name: ${displayName}`);
        }

        // Extract region tag from filename e.g. (USA), (JPN) fallback: "Unknown"
        log.debug(`Extracting region from filename`);
        const region = extractRegionFromFilename(fileName);
        log.debug(`Detected region: ${region}`);

        // Get file size
        log.debug(`Getting file statistics`);
        const stats = await fs.stat(filePath);
        const size = stats.size;
        log.debug(`File size: ${(size / 1024 / 1024).toFixed(2)} MB`);

        // Create metadata object
        const metadata: Omit<Rom, 'id' | 'createdAt' | 'updatedAt' | 'numAchievements'> = {
          system,
          displayName,
          region,
          // Actual file basename (e.g., "Super Metroid.zip")
          filename: fileBaseName,
          // ROM filename for system detection (e.g., "Super Metroid.sfc")
          romFilename: fileName,
          filePath,
          size,
          tags: [],
          notes: '',
          favorite: false,
          verified,
          ...hashes,
        };

        // Update ROM database
        await Sentry.startSpan({ op: 'rom.database', name: 'Add ROM to Database' }, () =>
          addRom(metadata)
        );

        span.setAttributes({
          'rom.system': system,
          'rom.size_mb': Math.round((size / 1024 / 1024) * 100) / 100,
        });

        log.info(`Successfully processed ROM: ${displayName} (${system})`);

        return metadata;
      } catch (error) {
        span.setStatus({ code: 2, message: 'ROM processing failed' });
        span.recordException(error instanceof Error ? error : new Error(String(error)));

        log.error(`Failed to process ROM file: ${fileBaseName} (${fileName})`, error);

        const romError = new RomProcessingError(
          `Failed to process ROM: ${fileBaseName} (${fileName})`,
          filePath,
          error instanceof Error ? error.message : 'Unknown error',
          error instanceof Error ? error : undefined
        );

        throw romError;
      }
    }
  );
}
