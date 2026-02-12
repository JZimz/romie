import fs from 'fs/promises';
import path from 'path';
import logger from 'electron-log/main';
import { BrowserWindow } from 'electron';
import { processDocumentFile } from './documentImport';

import type { PathLike } from 'node:fs';
import type { DocumentImportStatus } from '@/types/electron-api';

const log = logger.scope('document-scan');

interface DocumentScanResult {
  processed: number;
  imported: number;
  failed: {
    file: string;
    reason: string;
  }[];
  skipped: string[];
}

const SUPPORTED_DOC_EXTENSIONS = new Set(['.pdf', '.docx', '.xls', '.xlsx']);

export async function processDocumentDirectory(dirPath: PathLike): Promise<DocumentScanResult> {
  const results: DocumentScanResult = {
    processed: 0,
    imported: 0,
    failed: [],
    skipped: [],
  };

  let files: string[];
  try {
    files = await fs.readdir(dirPath);
  } catch (error) {
    results.failed.push({
      file: dirPath.toString(),
      reason: error instanceof Error ? error.message : 'Unknown error',
    });
    return results;
  }

  for (const file of files) {
    const subResult = await processFile(dirPath, file);
    results.processed += subResult.processed;
    results.imported += subResult.imported;
    results.failed.push(...subResult.failed);
    results.skipped.push(...subResult.skipped);
  }

  return results;
}

async function processFile(dirPath: PathLike, filename: string): Promise<DocumentScanResult> {
  const fullPath = path.join(dirPath.toString(), filename);

  try {
    if (filename.startsWith('.')) {
      return { processed: 0, imported: 0, failed: [], skipped: [] };
    }

    const fileStats = await fs.stat(fullPath);

    if (fileStats.isDirectory()) {
      return processDocumentDirectory(fullPath);
    }

    if (!fileStats.isFile()) {
      return { processed: 0, imported: 0, failed: [], skipped: [] };
    }

    const ext = path.extname(filename).toLowerCase();
    if (!SUPPORTED_DOC_EXTENSIONS.has(ext)) {
      return { processed: 0, imported: 0, failed: [], skipped: [filename] };
    }

    emitProgress({ currentFile: filename });

    const inserted = await processDocumentFile(fullPath);
    return {
      processed: 1,
      imported: inserted ? 1 : 0,
      failed: [],
      skipped: [],
    };
  } catch (error) {
    log.error(`Failed to process document file ${fullPath}:`, error);
    return {
      processed: 1,
      imported: 0,
      failed: [
        { file: fullPath, reason: error instanceof Error ? error.message : 'Unknown error' },
      ],
      skipped: [],
    };
  }
}

function emitProgress(progress: DocumentImportStatus) {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  mainWindow?.webContents.send('document:import-progress', progress);
}
