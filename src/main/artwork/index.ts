import { ipcMain } from 'electron';
import logger from 'electron-log/main';
import { readCachedArtwork } from './cache';
import { startFetch, cancelFetch, getFetchProgress } from './fetcher';

const log = logger.scope('artwork');

export { copyArtworkToDevice } from './deviceSync';
export { startFetch as startArtworkFetch } from './fetcher';
export type { ArtworkFetchProgress } from './fetcher';

export function registerArtworkIpc() {
  ipcMain.handle('artwork:fetchAll', async () => {
    // Fire-and-forget so the renderer can react to progress events without
    // waiting on the full job to finish.
    startFetch().catch((err) => log.error('Artwork fetch crashed:', err));
    return getFetchProgress();
  });

  ipcMain.handle('artwork:cancel', () => {
    cancelFetch();
    return getFetchProgress();
  });

  ipcMain.handle('artwork:status', () => getFetchProgress());

  ipcMain.handle('artwork:get', async (_, romId: string) => {
    const buffer = await readCachedArtwork(romId);
    if (!buffer) return null;
    return `data:image/png;base64,${buffer.toString('base64')}`;
  });
}
