import path from 'path';
import logger from 'electron-log/main';
import { RomDatabase } from '@/types/rom';
import { crc32sum, ramd5sum } from './romUtils';
import { lookupRomByHash, unloadHashDatabase } from './romLookup';
import { determineSystemFromRAConsoleId, getConsoleIdForSystem } from '@/utils/systems';

const log = logger.scope('romdb:migrations');

export async function ensureDatabaseSchema(data: RomDatabase) {
  log.info('Starting database migration');
  switch (data.version) {
    case '1.0.0':
      migrateToVersion_2_0_0(data);
    // falls through
    case '2.0.0':
      await migrateToVersion_3_0_0(data);
    // falls through
    case '3.0.0':
      await migrateToVersion_4_0_0(data);
    // falls through
    case '4.0.0':
      await migrateToVersion_5_0_0(data);
    // falls through
    case '5.0.0':
      await migrateToVersion_6_0_0(data);
  }

  data.lastUpdated = Date.now();
  log.info('Database migration completed');
}

//== Internal migration functions ==//

function migrateToVersion_2_0_0(data: RomDatabase) {
  log.info(`Migrating rom database from ${data.version} to version 2.0.0`);
  data.version = '2.0.0';

  data.roms.forEach((rom) => {
    rom.source ??= 'import';
  });
}

async function migrateToVersion_3_0_0(data: RomDatabase) {
  log.info(`Migrating rom database from ${data.version} to version 3.0.0`);
  data.version = '3.0.0';
  // New fields for app settings and RA integration.
  data.integrations ??= {};
  data.settings ??= {
    theme: 'system',
  };

  for (const rom of data.roms) {
    // ROM hashes should be lowercase for consistency with RA data.
    rom.crc32 = rom?.crc32?.toLowerCase();
    rom.md5 = rom.md5.toLowerCase();
    rom.sha1 = rom?.sha1?.toLowerCase();
    // New field to mark RA verified ROMs. Default to false.
    rom.verified ??= false;

    // Attempt to verify existing ROMs against RA database. This happens during import now.
    const game = await lookupRomByHash(rom.md5);
    if (game) {
      rom.verified = true;
      rom.displayName = game.title;
      rom.system = determineSystemFromRAConsoleId(game.consoleId) || rom.system;
    }
  }
  unloadHashDatabase();
}

async function migrateToVersion_4_0_0(data: RomDatabase) {
  log.info(`Migrating rom database from ${data.version} to version 4.0.0`);
  data.version = '4.0.0';

  // Attempt to re-verify existing ROMs against RA database using the new hashing strategy.
  log.info(`Regenerating hashes for ${data.roms.length} roms`);
  for (const rom of data.roms) {
    const consoleId = getConsoleIdForSystem(rom.system);
    if (!consoleId) {
      log.warn(`Skipping RA MD5 generation for ROM ${rom.id} with unknown system ${rom.system}`);
      rom.ramd5 = null;
      continue;
    }

    try {
      const ramd5 = ramd5sum(consoleId, {
        sourcePath: rom.filePath,
        filename: rom.filename,
        romFilename: rom.romFilename,
        isArchive: false,
      });

      if (!ramd5) {
        rom.ramd5 = null;
        continue;
      }

      const game = await lookupRomByHash(ramd5);
      if (game) {
        rom.verified = true;
        rom.displayName = game.title;
      }
      rom.ramd5 = ramd5;
    } catch (error) {
      log.error(`Error generating RA MD5 for ROM ${rom.id}: ${error}`);
      rom.ramd5 = null;
    }
  }

  unloadHashDatabase();
}

async function migrateToVersion_5_0_0(data: RomDatabase) {
  log.info(`Migrating rom database from ${data.version} to version 5.0.0`);
  data.version = '5.0.0';

  for (const rom of data.roms) {
    try {
      // Add the new fileCrc32 field for file integrity checking
      rom.fileCrc32 ??= await crc32sum({ filePath: rom.filePath });
      // Add the new romFilename field for clarity with archive formats
      // (e.g. "Super Mario World.sfc" inside "Super Mario World.zip")
      rom.romFilename ??= rom.originalFilename ?? rom.filename;
      // Update filename field to represent actual file on disk. Previously this was just
      // a duplicate of originalFilename.
      rom.filename = path.basename(rom.filePath);
    } catch (error) {
      log.error(`Error generating file CRC32 for ROM ${rom.id}: ${error}`);
      rom.fileCrc32 = '00000000';
    }

    // Remove deprecated fields
    delete rom.originalFilename;
    delete rom.source;
    delete rom.crc32;
    delete rom.sha1;
  }
}

async function migrateToVersion_6_0_0(data: RomDatabase) {
  log.info(`Migrating rom database from ${data.version} to version 6.0.0`);
  data.version = '6.0.0';
  data.profiles ??= [];
}
