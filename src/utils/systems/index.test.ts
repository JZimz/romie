import { describe, it, expect } from 'vitest';
import { determineSystemFromParentFolder, determineSystem } from './index';

import type { RomFile } from '@/types/rom';

describe('determineSystemFromParentFolder', () => {
  it('matches system code aliases (case insensitive)', () => {
    expect(determineSystemFromParentFolder('/roms/PSP/game.iso')).toBe('psp');
    expect(determineSystemFromParentFolder('/roms/psp/game.iso')).toBe('psp');
  });

  it('matches system name aliases with spaces', () => {
    expect(determineSystemFromParentFolder('/roms/PlayStation Portable/game.iso')).toBe('psp');
    expect(determineSystemFromParentFolder('/roms/Game Boy/game.gb')).toBe('gb');
  });

  it('matches arcade folder variations', () => {
    expect(determineSystemFromParentFolder('/roms/ARCADE/game.zip')).toBe('arcade');
    expect(determineSystemFromParentFolder('/roms/fbneo/game.zip')).toBe('arcade');
    expect(determineSystemFromParentFolder('/roms/neogeo/game.zip')).toBe('arcade');
  });

  it('returns null for unrecognized folders', () => {
    expect(determineSystemFromParentFolder('/downloads/stuff/game.zip')).toBeNull();
    expect(determineSystemFromParentFolder('/random/folder/rom.iso')).toBeNull();
  });
});

describe('determineSystem', () => {
  it('returns system for unique extension', () => {
    expect(
      determineSystem({ sourcePath: '/roms/game.nes', romFilename: 'game.nes' } as RomFile)
    ).toBe('nes');
    expect(
      determineSystem({ sourcePath: '/roms/game.gba', romFilename: 'game.gba' } as RomFile)
    ).toBe('gba');
  });

  it('throws for unsupported extension', () => {
    expect(() =>
      determineSystem({ sourcePath: '/roms/game.txt', romFilename: 'game.txt' } as RomFile)
    ).toThrow('Unsupported file extension: .txt');
  });
});
