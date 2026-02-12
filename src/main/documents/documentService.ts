import { dialog } from 'electron';
import { processDocumentDirectory } from './documentScan';
import { documents } from '@main/db/queries';

import type { DocumentImportResult } from '@/types/electron-api';

export async function scanDocumentDirectory(): Promise<DocumentImportResult> {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  const response: DocumentImportResult = {
    canceled,
    imported: [],
    failed: [],
    totalProcessed: 0,
    totalImported: 0,
  };

  if (canceled) {
    return response;
  }

  const documentDir = filePaths[0];
  const { processed, imported, failed } = await processDocumentDirectory(documentDir);

  response.totalProcessed = processed;
  response.totalImported = imported;
  response.failed = failed;
  response.imported = documents.list();

  return response;
}
