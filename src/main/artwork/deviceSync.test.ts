import { describe, it, expect } from 'vitest';
import { resolveArtworkDir } from './deviceSync';

describe('resolveArtworkDir', () => {
  it('expands {romBasePath} and {folderName} (Onion-style)', () => {
    const dir = resolveArtworkDir(
      '/Volumes/MIYOO',
      {
        romBasePath: '/Roms/',
        artworkConfig: {
          enabled: true,
          pathPattern: '{romBasePath}/{folderName}/Imgs/',
          supportedFormats: ['.png'],
          maxWidth: 360,
          maxHeight: 250,
        },
      },
      'FC'
    );
    expect(dir).toBe('/Volumes/MIYOO/Roms/FC/Imgs/');
  });

  it('handles patterns without {romBasePath} (muOS-style)', () => {
    const dir = resolveArtworkDir(
      '/Volumes/MUOS',
      {
        romBasePath: '/ROMS/',
        artworkConfig: {
          enabled: true,
          pathPattern: '/MUOS/info/catalogue/{folderName}/box/',
          supportedFormats: ['.png'],
          maxWidth: 640,
          maxHeight: 480,
        },
      },
      'nes'
    );
    expect(dir).toBe('/Volumes/MUOS/MUOS/info/catalogue/nes/box/');
  });

  it('returns null when artworkConfig is missing', () => {
    const dir = resolveArtworkDir('/mnt', { romBasePath: '/roms/' }, 'nes');
    expect(dir).toBeNull();
  });

  it('returns null when artworkConfig is disabled', () => {
    const dir = resolveArtworkDir(
      '/mnt',
      {
        romBasePath: '/roms/',
        artworkConfig: {
          enabled: false,
          pathPattern: '{romBasePath}/{folderName}/Imgs/',
          supportedFormats: ['.png'],
          maxWidth: 0,
          maxHeight: 0,
        },
      },
      'nes'
    );
    expect(dir).toBeNull();
  });
});
