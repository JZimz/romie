import { BrowserWindow } from 'electron';
import logger from 'electron-log/main';
import { listRoms } from '@main/roms/romDatabase';
import { hasCachedArtwork, writeCachedArtwork } from './cache';
import { resolveArtworkSource, downloadArtwork } from './source';

const log = logger.scope('artwork-fetcher');

const CONCURRENCY = 4;

export interface ArtworkFetchProgress {
  isRunning: boolean;
  total: number;
  fetched: number;
  failed: number;
  skipped: number;
}

const state: ArtworkFetchProgress = {
  isRunning: false,
  total: 0,
  fetched: 0,
  failed: 0,
  skipped: 0,
};

let cancelled = false;

function emitProgress() {
  const window = BrowserWindow.getAllWindows()[0];
  window?.webContents.send('artwork:progress', { ...state });
}

function resetState(total: number) {
  state.isRunning = true;
  state.total = total;
  state.fetched = 0;
  state.failed = 0;
  state.skipped = 0;
  cancelled = false;
}

export function getFetchProgress(): ArtworkFetchProgress {
  return { ...state };
}

export function cancelFetch(): void {
  if (!state.isRunning) return;
  log.info('Cancelling artwork fetch');
  cancelled = true;
}

export async function startFetch(): Promise<ArtworkFetchProgress> {
  if (state.isRunning) {
    log.debug('Artwork fetch already running — ignoring start request');
    return getFetchProgress();
  }

  const allRoms = await listRoms();
  resetState(allRoms.length);
  emitProgress();

  log.info(`Starting artwork fetch for ${allRoms.length} ROMs`);

  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }, () => worker());

  async function worker() {
    while (!cancelled) {
      const index = cursor++;
      if (index >= allRoms.length) return;

      const rom = allRoms[index];

      if (await hasCachedArtwork(rom.id)) {
        state.skipped++;
        emitProgress();
        continue;
      }

      const resolved = resolveArtworkSource(rom);
      if (!resolved) {
        state.skipped++;
        emitProgress();
        continue;
      }

      try {
        const data = await downloadArtwork(resolved.url);
        await writeCachedArtwork(rom.id, data);
        state.fetched++;
      } catch (err) {
        state.failed++;
        log.warn(`Artwork fetch failed for ${rom.displayName}:`, err);
      }
      emitProgress();
    }
  }

  await Promise.all(workers);

  state.isRunning = false;
  emitProgress();

  log.info(
    `Artwork fetch finished — fetched=${state.fetched} skipped=${state.skipped} failed=${state.failed} cancelled=${cancelled}`
  );
  return getFetchProgress();
}
