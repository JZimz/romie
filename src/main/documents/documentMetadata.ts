import fs from 'fs/promises';
import yauzl from 'yauzl';

import type { DocumentFileType } from '@/types/document';

export interface ExtractedDocumentMetadata {
  title?: string | null;
  author?: string | null;
  subject?: string | null;
  language?: string | null;
  pageCount?: number | null;
  sheetCount?: number | null;
  textContent?: string | null;
}

interface ZipEntries {
  [entryName: string]: Buffer;
}

export async function extractDocumentMetadata(
  filePath: string,
  fileType: DocumentFileType
): Promise<ExtractedDocumentMetadata> {
  if (fileType === 'pdf') {
    return extractPdfMetadata(filePath);
  }

  if (fileType === 'docx') {
    return extractDocxMetadata(filePath);
  }

  if (fileType === 'xlsx') {
    return extractXlsxMetadata(filePath);
  }

  // Legacy binary XLS is intentionally kept as a minimal fallback for now.
  return {
    title: null,
    author: null,
    subject: null,
    language: null,
    pageCount: null,
    sheetCount: null,
    textContent: null,
  };
}

async function extractPdfMetadata(filePath: string): Promise<ExtractedDocumentMetadata> {
  const buffer = await fs.readFile(filePath);
  const text = buffer.toString('latin1');

  const title = readPdfInfoString(text, 'Title');
  const author = readPdfInfoString(text, 'Author');
  const subject = readPdfInfoString(text, 'Subject');

  const pageCountMatch = text.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageCountMatch?.length ?? null;

  // Very lightweight content extraction fallback: collects plain-text tokens inside parentheses.
  const snippets = [...text.matchAll(/\(([^()]{3,200})\)/g)]
    .map((match) => sanitizeText(match[1]))
    .filter(Boolean);

  return {
    title,
    author,
    subject,
    pageCount,
    textContent: snippets.length > 0 ? snippets.slice(0, 400).join(' ') : null,
  };
}

function readPdfInfoString(content: string, key: string): string | null {
  const match = content.match(new RegExp(`/${key}\\s*\\(([^)]*)\\)`));
  if (!match?.[1]) return null;
  return sanitizeText(match[1]);
}

async function extractDocxMetadata(filePath: string): Promise<ExtractedDocumentMetadata> {
  const entries = await readZipEntries(filePath, ['docProps/core.xml', 'word/document.xml']);

  const coreXml = entries['docProps/core.xml']?.toString('utf8') ?? '';
  const documentXml = entries['word/document.xml']?.toString('utf8') ?? '';

  const title = readXmlTag(coreXml, 'dc:title');
  const author = readXmlTag(coreXml, 'dc:creator');
  const subject = readXmlTag(coreXml, 'dc:subject');
  const language = readXmlTag(coreXml, 'dc:language') || readXmlTag(coreXml, 'cp:language');

  const textContent = extractDocxText(documentXml);

  return {
    title,
    author,
    subject,
    language,
    textContent,
    pageCount: null,
    sheetCount: null,
  };
}

async function extractXlsxMetadata(filePath: string): Promise<ExtractedDocumentMetadata> {
  const entries = await readZipEntries(filePath, [
    'docProps/core.xml',
    'xl/workbook.xml',
    'xl/sharedStrings.xml',
  ]);

  const coreXml = entries['docProps/core.xml']?.toString('utf8') ?? '';
  const workbookXml = entries['xl/workbook.xml']?.toString('utf8') ?? '';
  const sharedStringsXml = entries['xl/sharedStrings.xml']?.toString('utf8') ?? '';

  const title = readXmlTag(coreXml, 'dc:title');
  const author = readXmlTag(coreXml, 'dc:creator');
  const subject = readXmlTag(coreXml, 'dc:subject');
  const language = readXmlTag(coreXml, 'dc:language') || readXmlTag(coreXml, 'cp:language');

  const sheetCount = [...workbookXml.matchAll(/<sheet\b/gi)].length || null;
  const sharedStrings = [...sharedStringsXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/gi)]
    .map((match) => decodeXmlEntities(match[1]))
    .map(sanitizeText)
    .filter(Boolean);

  return {
    title,
    author,
    subject,
    language,
    sheetCount,
    pageCount: null,
    textContent: sharedStrings.length > 0 ? sharedStrings.slice(0, 400).join(' ') : null,
  };
}

function extractDocxText(documentXml: string): string | null {
  if (!documentXml) return null;

  const texts = [...documentXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi)]
    .map((match) => decodeXmlEntities(match[1]))
    .map(sanitizeText)
    .filter(Boolean);

  return texts.length > 0 ? texts.slice(0, 400).join(' ') : null;
}

function readXmlTag(xml: string, tag: string): string | null {
  if (!xml) return null;

  const escapedTag = tag.replace(':', '\\:');
  const match = xml.match(new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i'));
  if (!match?.[1]) return null;

  return sanitizeText(decodeXmlEntities(match[1]));
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#xA;/gi, '\n')
    .replace(/&#xD;/gi, '\r');
}

function sanitizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

async function readZipEntries(filePath: string, targetEntries: string[]): Promise<ZipEntries> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(err ?? new Error('Failed to open zip-based document'));
        return;
      }

      const result: ZipEntries = {};
      let remainingEntries = [...targetEntries];

      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        if (!remainingEntries.includes(entry.fileName)) {
          zipfile.readEntry();
          return;
        }

        zipfile.openReadStream(entry, (streamErr, stream) => {
          if (streamErr || !stream) {
            zipfile.close();
            reject(streamErr ?? new Error(`Failed to open ${entry.fileName}`));
            return;
          }

          const chunks: Buffer[] = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('end', () => {
            result[entry.fileName] = Buffer.concat(chunks);
            remainingEntries = remainingEntries.filter((name) => name !== entry.fileName);

            if (remainingEntries.length === 0) {
              zipfile.close();
              resolve(result);
              return;
            }

            zipfile.readEntry();
          });
          stream.on('error', (streamError) => {
            zipfile.close();
            reject(streamError);
          });
        });
      });

      zipfile.on('end', () => resolve(result));
      zipfile.on('error', (zipError) => reject(zipError));
    });
  });
}
