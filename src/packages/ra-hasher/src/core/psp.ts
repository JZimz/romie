import type { RaHashOptions } from '../types';
import { md5 } from '../utils/hash';
import { readAll } from '../utils/files';
import SevenZip from '7z-wasm';

/**
 * PlayStation Portable hashing per RetroAchievements specification.
 *
 * PSP uses a custom hash that combines disc metadata and the primary executable:
 * 1. Contents of PSP_GAME/PARAM.SFO (game attributes/metadata)
 * 2. Contents of PSP_GAME/SYSDIR/EBOOT.BIN (primary executable)
 * 3. Hash the concatenated buffer
 *
 * @see https://docs.retroachievements.org/developer-docs/game-identification.html
 */
export async function hashPSP({ buffer, path }: RaHashOptions) {
  const isoData = buffer ?? (await readAll(path!));

  // Initialize 7z-wasm
  const sevenZip = await SevenZip();

  try {
    // Write ISO to virtual filesystem
    const isoName = 'game.iso';
    sevenZip.FS.writeFile(isoName, isoData);

    // Extract with full paths to avoid conflicts
    sevenZip.callMain([
      'x', // extract with full directory structure
      isoName,
      'PSP_GAME/PARAM.SFO',
      'PSP_GAME/SYSDIR/EBOOT.BIN',
      '-y', // yes to all prompts
    ]);

    // Read extracted files from virtual FS with full paths
    const paramsSfo = sevenZip.FS.readFile('PSP_GAME/PARAM.SFO');
    const ebootBin = sevenZip.FS.readFile('PSP_GAME/SYSDIR/EBOOT.BIN');

    // Concatenate PARAM.SFO + EBOOT.BIN
    const merged = new Uint8Array(paramsSfo.length + ebootBin.length);
    merged.set(paramsSfo, 0);
    merged.set(ebootBin, paramsSfo.length);

    // Hash the merged buffer
    return {
      ramd5: md5(Buffer.from(merged)),
      notes: `merged PARAM.SFO (${paramsSfo.length}B) + EBOOT.BIN (${ebootBin.length}B)`,
    };
  } finally {
    // Cleanup virtual filesystem
    try {
      sevenZip.FS.unlink('game.iso');
      sevenZip.FS.unlink('PSP_GAME/PARAM.SFO');
      sevenZip.FS.unlink('PSP_GAME/SYSDIR/EBOOT.BIN');
    } catch {
      // Ignore cleanup errors
    }
  }
}
