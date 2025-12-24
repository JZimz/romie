import type { DeviceProfile } from '../types';

export const MUOS_PROFILE: DeviceProfile = {
  id: 'muos',
  name: 'muOS',
  romBasePath: '/ROMS/',
  biosBasePath: '/MUOS/bios/',
  isBuiltIn: true,
  version: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  artworkConfig: {
    enabled: true,
    pathPattern: '/MUOS/info/catalogue/{folderName}/box/',
    supportedFormats: ['.png'],
    maxWidth: 640,
    maxHeight: 480,
  },
  systemMappings: {
    nes: {
      folderName: 'nes',
      supportedFormats: ['.nes', '.zip', '.7z'],
    },
    snes: {
      folderName: 'snes',
      supportedFormats: ['.sfc', '.snes', '.zip', '.7z'],
    },
    genesis: {
      folderName: 'md',
      supportedFormats: ['.md', '.gen', '.smd', '.zip', '.7z'],
    },
    psx: {
      folderName: 'psx',
      supportedFormats: ['.cue', '.iso', '.chd', '.pbp', '.zip', '.7z'],
    },
    n64: {
      folderName: 'n64',
      supportedFormats: ['.n64', '.z64', '.v64', '.zip', '.7z'],
    },
    gb: {
      folderName: 'gb',
      supportedFormats: ['.gb', '.gbc', '.dmg', '.zip', '.7z'],
    },
    gbc: {
      folderName: 'gbc',
      supportedFormats: ['.gbc', '.gb', '.zip', '.7z'],
    },
    gba: {
      folderName: 'gba',
      supportedFormats: ['.gba', '.bin', '.zip', '.7z'],
    },
    nds: {
      folderName: 'nds',
      supportedFormats: ['.nds', '.zip', '.7z'],
    },
    ngp: {
      folderName: 'ngp',
      supportedFormats: ['.ngp', '.ngc', '.zip', '.7z'],
    },
    arcade: {
      folderName: 'arcade',
      supportedFormats: ['.zip', '.7z'],
    },
    atari2600: {
      folderName: 'atari2600',
      supportedFormats: ['.a26', '.bin', '.zip', '.7z'],
    },
    sms: {
      folderName: 'sms',
      supportedFormats: ['.sms', '.zip', '.7z'],
    },
    gg: {
      folderName: 'gg',
      supportedFormats: ['.gg', '.zip', '.7z'],
    },
    lynx: {
      folderName: 'lynx',
      supportedFormats: ['.lnx', '.zip', '.7z'],
    },
    vb: {
      folderName: 'vb',
      supportedFormats: ['.vb', '.zip', '.7z'],
    },
  },
};
