import path from 'node:path';

export function isArchiveContainerPath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.zip' || ext === '.7z';
}
