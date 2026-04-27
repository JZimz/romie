import { dialog } from 'electron';
import logger from 'electron-log/main';
import { processRomDirectory } from './romScan';
import { startArtworkFetch } from '@main/artwork';

import type { RomImportResult } from '@/types/electron-api';

const log = logger.scope('rom-service');

export async function scanRomDirectory(): Promise<RomImportResult> {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  const response: RomImportResult = {
    canceled: false,
    imported: [],
    failed: [],
    totalProcessed: 0,
  };

  // Bail if the user canceled the file dialog
  if (canceled) {
    response.canceled = true;

    return response;
  }

  const romDir = filePaths[0];
  const { processed, errors } = await processRomDirectory(romDir);

  response.totalProcessed = processed;
  response.failed = errors.map((err) => ({
    file: err.file,
    reason: err.reason,
  }));

  // Kick off background artwork fetch for newly imported ROMs. Fire-and-forget
  // so the import call returns immediately; progress is reported via the
  // `artwork:progress` IPC event.
  if (processed > 0) {
    startArtworkFetch().catch((err) => log.warn('Artwork fetch failed to start:', err));
  }

  return response;
}
