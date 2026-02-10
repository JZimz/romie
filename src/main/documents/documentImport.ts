import path from 'path';
import fs from 'fs/promises';
import logger from 'electron-log/main';
import { documents } from '@main/db/queries';
import { md5sum } from '@main/roms/romUtils';

import type { Document, DocumentFileType } from '@/types/document';

const log = logger.scope('document-import');

const MIME_BY_EXTENSION: Record<DocumentFileType, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export async function processDocumentFile(filePath: string): Promise<Document | null> {
  const filename = path.basename(filePath);
  const extension = path.extname(filename).toLowerCase().slice(1);

  if (!isSupportedDocumentExtension(extension)) {
    return null;
  }

  const existing = documents.findByPath(filePath);
  if (existing) {
    log.debug(`Skipping existing document: ${filePath}`);
    return existing;
  }

  const stats = await fs.stat(filePath);
  const fileType = extension as DocumentFileType;
  const checksum = await md5sum({ filePath });

  const now = new Date();
  const payload: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> = {
    fileType,
    filePath,
    filename,
    extension: `.${extension}`,
    mimeType: MIME_BY_EXTENSION[fileType] ?? null,
    size: stats.size,
    checksum,
    title: filename.replace(/\.[^/.]+$/, ''),
    author: null,
    subject: null,
    pageCount: null,
    sheetCount: null,
    language: null,
    textContent: null,
    tags: [],
    favorite: false,
    notes: '',
    importedAt: now,
    modifiedAt: new Date(stats.mtimeMs),
  };

  return documents.insert(payload);
}

function isSupportedDocumentExtension(extension: string): extension is DocumentFileType {
  return extension === 'pdf' || extension === 'docx' || extension === 'xls' || extension === 'xlsx';
}
