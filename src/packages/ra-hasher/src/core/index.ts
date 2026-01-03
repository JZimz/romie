import type { RaHashOptions, RaHashResult } from '../types';
import { md5 } from '../utils/hash';
import { readAll } from '../utils/files';
import { hashNES } from './nes';
import { hashSNES } from './snes';
import { hashN64 } from './n64';
import { hashAtariLynx } from './atariLynx';
import { hashAtari7800 } from './atari7800';
import { hashArcade } from './arcade';
import { hashPSP } from './psp';

/**
 * Generates RetroAchievements-compatible hashes for ROM identification.
 *
 * Different systems use different hashing strategies - some strip headers, others
 * hash specific ROM sections. This function handles the quirks automatically
 * based on the console ID.
 *
 * @param opts - Hashing options (consoleId + ROM buffer or file path)
 * @returns Promise resolving to hash result with implementation notes
 * @see https://docs.retroachievements.org/developer-docs/game-identification.html
 */
export async function hash(opts: RaHashOptions): Promise<RaHashResult> {
  const fn = chooseHasher(opts.consoleId);
  const res = await fn(opts);

  return { ...res, impl: 'core' };
}

//== Internal helpers ==//

function chooseHasher(consoleId: number) {
  switch (consoleId) {
    case 2: // N64
      return hashN64;
    case 3: // SNES
      return hashSNES;
    case 7: // NES
      return hashNES;
    // TODO: re-enable when NDS hashing is verified
    // case 18: // Nintendo DS
    //   return hashNDS;
    case 13: // Atari Lynx
      return hashAtariLynx;
    case 51: // Atari 7800
      return hashAtari7800;
    case 27: // Arcade
      return hashArcade;
    case 41: // PlayStation Portable
      return hashPSP;
    default:
      // Full MD5
      return async ({ buffer, path }: RaHashOptions) => {
        const bytes = buffer ?? (await readAll(path!));

        return { ramd5: md5(bytes) };
      };
  }
}
