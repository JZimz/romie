import path from 'node:path';

export const ARCHIVE_CONTAINER_EXTENSIONS_V1 = ['.zip', '.7z'] as const;

// Runtime-supported archive container extensions.
// If this list changes, any data migration keyed off it may need a new version.
export const ARCHIVE_CONTAINER_EXTENSIONS = ARCHIVE_CONTAINER_EXTENSIONS_V1;

export function isArchiveContainerPath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return (ARCHIVE_CONTAINER_EXTENSIONS as readonly string[]).includes(ext);
}
