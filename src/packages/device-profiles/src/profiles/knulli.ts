import type { DeviceProfile } from '../types';

export const KNULLI_PROFILE: DeviceProfile = {
  id: 'knulli',
  name: 'KNULLI',
  romBasePath: '/roms/',
  biosBasePath: '/bios/',
  isBuiltIn: true,
  version: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  systemMappings: {
    nes: {
      folderName: 'nes',
      supportedFormats: ['.nes', '.zip', '.7z'],
    },
    snes: {
      folderName: 'snes',
      supportedFormats: ['.sfc', '.snes', '.zip', '.7z'],
    },
    n64: {
      folderName: 'n64',
      supportedFormats: ['.n64', '.v64', '.z64', '.zip', '.7z'],
    },
    gb: {
      folderName: 'gb',
      supportedFormats: ['.gb', '.dmg', '.zip', '.7z'],
    },
    gbc: {
      folderName: 'gbc',
      supportedFormats: ['.gbc', '.gb', '.zip', '.7z'],
    },
    gba: {
      folderName: 'gba',
      supportedFormats: ['.gba', '.zip', '.7z'],
    },
    nds: {
      folderName: 'nds',
      supportedFormats: ['.nds', '.zip', '.7z'],
    },
    genesis: {
      folderName: 'megadrive',
      supportedFormats: ['.md', '.gen', '.smd', '.zip', '.7z'],
    },
    sms: {
      folderName: 'mastersystem',
      supportedFormats: ['.sms', '.zip', '.7z'],
    },
    gg: {
      folderName: 'gamegear',
      supportedFormats: ['.gg', '.zip', '.7z'],
    },
    psx: {
      folderName: 'psx',
      supportedFormats: ['.cue', '.iso', '.chd', '.pbp', '.zip', '.7z'],
    },
    atari2600: {
      folderName: 'atari2600',
      supportedFormats: ['.a26', '.zip', '.7z'],
    },
    lynx: {
      folderName: 'lynx',
      supportedFormats: ['.lnx', '.zip', '.7z'],
    },
    ngp: {
      folderName: 'ngp',
      supportedFormats: ['.ngp', '.ngc', '.zip', '.7z'],
    },
    vb: {
      folderName: 'virtualboy',
      supportedFormats: ['.vb', '.zip', '.7z'],
    },
    arcade: {
      folderName: 'fbneo',
      supportedFormats: ['.zip', '.7z'],
    },
  },
};
