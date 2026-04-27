import { ref } from 'vue';
import log from 'electron-log/renderer';

// Module-scoped cache so the data URL is reused across components and scrolls.
// `null` is cached too to short-circuit repeat lookups for ROMs without artwork.
const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

/** Bumped whenever a background fetch run completes so consumers can re-query. */
export const artworkVersion = ref(0);

let progressListenerAttached = false;
function attachProgressListener() {
  if (progressListenerAttached) return;
  progressListenerAttached = true;

  let wasRunning = false;
  window.artwork.onProgress((progress) => {
    if (wasRunning && !progress.isRunning) {
      // Drop negative-cache entries so ROMs that just got artwork show it.
      for (const [id, value] of cache) {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        if (value === null) cache.delete(id);
      }
      artworkVersion.value++;
    }
    wasRunning = progress.isRunning;
  });
}

export function useArtworkCache() {
  attachProgressListener();

  async function resolve(romId: string): Promise<string | null> {
    if (cache.has(romId)) return cache.get(romId) ?? null;

    const existing = inflight.get(romId);
    if (existing) return existing;

    const promise = window.artwork
      .get(romId)
      .then((dataUrl) => {
        cache.set(romId, dataUrl);
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        inflight.delete(romId);
        return dataUrl;
      })
      .catch((err) => {
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        inflight.delete(romId);
        log.warn(`Artwork lookup failed for ${romId}:`, err);
        return null;
      });

    inflight.set(romId, promise);
    return promise;
  }

  function invalidate(romId: string) {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    cache.delete(romId);
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    inflight.delete(romId);
  }

  function invalidateAll() {
    cache.clear();
    inflight.clear();
  }

  return { resolve, invalidate, invalidateAll };
}
