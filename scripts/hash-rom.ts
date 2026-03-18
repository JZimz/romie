/**
 * Test script to check what rcheevos hashes a ROM file to.
 * Usage: npx tsx scripts/hash-rom.ts <consoleId> <path-to-rom>
 *
 * Console IDs: 4=GB, 5=GBA, 7=NES, 16=GameCube, 19=Wii, 41=PSP, etc.
 * Full list: node_modules/node-rcheevos/lib/index.d.ts
 */
import { rhash, ConsoleId } from 'node-rcheevos';

const [, , consoleIdArg, romPath] = process.argv;

if (!consoleIdArg || !romPath) {
  console.error('Usage: npx tsx scripts/hash-rom.ts <consoleId> <path-to-rom>');
  console.error('Example: npx tsx scripts/hash-rom.ts 16 /path/to/game.rvz');
  process.exit(1);
}

const consoleId = Number(consoleIdArg);
const consoleName = Object.entries(ConsoleId).find(([, v]) => v === consoleId)?.[0] ?? 'UNKNOWN';

console.log(`Console: ${consoleName} (${consoleId})`);
console.log(`File:    ${romPath}`);

try {
  const hash = rhash(consoleId, romPath);
  console.log(`Hash:    ${hash}`);
  console.log(`RA URL:  https://retroachievements.org/game/0?md5=${hash}`);
} catch (err) {
  console.error('Hashing failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}
