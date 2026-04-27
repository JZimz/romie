import path from 'node:path';
import fs from 'node:fs/promises';
import { app } from 'electron';
import logger from 'electron-log/main';

const log = logger.scope('artwork-cache');

let cacheDirPromise: Promise<string> | null = null;

function resolveCacheDir(): string {
  // Mirrors getDatabaseBaseDir() — userData when packaged, ./.romie in dev
  const baseDir = app.isPackaged ? app.getPath('userData') : path.join(process.cwd(), '.romie');
  return path.join(baseDir, 'artwork');
}

export async function getArtworkCacheDir(): Promise<string> {
  if (!cacheDirPromise) {
    cacheDirPromise = (async () => {
      const dir = resolveCacheDir();
      await fs.mkdir(dir, { recursive: true });
      log.debug(`Artwork cache directory ready: ${dir}`);
      return dir;
    })();
  }
  return cacheDirPromise;
}

export async function getCachedArtworkPath(romId: string): Promise<string> {
  const dir = await getArtworkCacheDir();
  return path.join(dir, `${romId}.png`);
}

export async function hasCachedArtwork(romId: string): Promise<boolean> {
  try {
    const filePath = await getCachedArtworkPath(romId);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readCachedArtwork(romId: string): Promise<Buffer | null> {
  try {
    const filePath = await getCachedArtworkPath(romId);
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function writeCachedArtwork(romId: string, data: Buffer): Promise<string> {
  const filePath = await getCachedArtworkPath(romId);
  await fs.writeFile(filePath, data);
  return filePath;
}

export async function removeCachedArtwork(romId: string): Promise<void> {
  try {
    const filePath = await getCachedArtworkPath(romId);
    await fs.unlink(filePath);
  } catch {
    // Already gone — fine
  }
}
