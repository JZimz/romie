import { describe, it, expect } from 'vitest';
import { getVolumeRoot } from './romValidation';

describe('getVolumeRoot', () => {
  describe('macOS', () => {
    it('returns the volume root for /Volumes paths', () => {
      expect(getVolumeRoot('/Volumes/NAS/Roms/SNES/game.sfc', 'darwin')).toBe('/Volumes/NAS');
      expect(getVolumeRoot('/Volumes/USB Drive/roms/game.rom', 'darwin')).toBe(
        '/Volumes/USB Drive'
      );
    });

    it('returns null for local paths', () => {
      expect(getVolumeRoot('/Users/jrs/retro/Roms/N64/game.z64', 'darwin')).toBeNull();
    });
  });

  describe('Linux', () => {
    it('returns the volume root for /mnt paths', () => {
      expect(getVolumeRoot('/mnt/storage/roms/game.rom', 'linux')).toBe('/mnt/storage');
    });

    it('returns the volume root for /run/media paths', () => {
      expect(getVolumeRoot('/run/media/jrs/USB/roms/game.rom', 'linux')).toBe('/run/media/jrs/USB');
    });

    it('returns null for unsupported mount locations', () => {
      expect(getVolumeRoot('/media/jrs/USB/roms/game.rom', 'linux')).toBeNull();
      expect(getVolumeRoot('/srv/roms/game.rom', 'linux')).toBeNull();
    });
  });

  describe('Windows', () => {
    it('returns the drive root for any drive letter', () => {
      expect(getVolumeRoot('C:\\roms\\game.rom', 'win32')).toBe('C:\\');
      expect(getVolumeRoot('D:\\roms\\game.rom', 'win32')).toBe('D:\\');
      expect(getVolumeRoot('F:\\roms\\game.rom', 'win32')).toBe('F:\\');
    });
  });
});
