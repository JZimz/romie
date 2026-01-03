import { hash } from './src/packages/ra-hasher/src/core';
import { getSystemByExtension, getConsoleIdForSystem } from './src/utils/systems';
import path from 'path';

async function testRaHash(romPath: string) {
  console.log(`Testing RA hash for: ${romPath}`);
  console.log('---');

  try {
    // Get system from extension
    const ext = path.extname(romPath);
    const system = getSystemByExtension(ext);

    if (!system) {
      console.error(`Error: Unsupported extension: ${ext}`);
      process.exit(1);
    }

    console.log(`Detected system: ${system.displayName} (${system.code})`);

    // Get console ID
    const consoleId = getConsoleIdForSystem(system.code);

    if (!consoleId) {
      console.error(`Error: No RetroAchievements console ID for system: ${system.code}`);
      process.exit(1);
    }

    console.log(`RA Console ID: ${consoleId}`);
    console.log('---');
    console.log('Generating hash...');

    // Hash the ROM
    const result = await hash({ consoleId, path: romPath });

    console.log('---');
    console.log(`✓ Hash generated successfully!`);
    console.log(`MD5: ${result.ramd5}`);
    if (result.notes) {
      console.log(`Notes: ${result.notes}`);
    }
    console.log('---');
    console.log(`\nLookup URL: https://retroachievements.org/dorequest.php?r=gameinfopage&f=${result.ramd5}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run with: tsx test-ra-hash.ts /path/to/rom
const romPath = process.argv[2];
if (!romPath) {
  console.error('Usage: tsx test-ra-hash.ts <path-to-rom>');
  console.error('\nExamples:');
  console.error('  tsx test-ra-hash.ts ~/roms/game.nes');
  console.error('  tsx test-ra-hash.ts ~/roms/psp/game.iso');
  process.exit(1);
}

testRaHash(romPath);
