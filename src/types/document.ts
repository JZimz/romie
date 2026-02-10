export type DocumentFileType = 'pdf' | 'docx' | 'xls' | 'xlsx';

export interface Document {
  id: string;
  fileType: DocumentFileType;
  filePath: string;
  filename: string;
  extension: string;
  mimeType: string | null;
  size: number;
  checksum: string;
  title: string;
  author: string | null;
  subject: string | null;
  pageCount: number | null;
  sheetCount: number | null;
  language: string | null;
  textContent: string | null;
  tags: string[] | null;
  favorite: boolean | null;
  notes: string | null;
  importedAt: Date;
  modifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentCollection {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}
