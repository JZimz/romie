import type { DeviceProfile } from '../types';

export const RETROARCH_PROFILE: DeviceProfile = {
  id: 'retroarch',
  name: 'RetroArch',
  romBasePath: '/storage/roms/',
  biosBasePath: '/storage/system/',
  isBuiltIn: true,
  version: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  artworkConfig: {
    enabled: true,
    pathPattern: '{romBasePath}/{folderName}/Named_Boxarts/',
    supportedFormats: ['.png', '.jpg'],
    maxWidth: 512,
    maxHeight: 512,
  },
  systemMappings: {
    nes: {
      folderName: 'Nintendo - Nintendo Entertainment System',
      supportedFormats: ['.nes', '.zip', '.7z'],
    },
    snes: {
      folderName: 'Nintendo - Super Nintendo Entertainment System',
      supportedFormats: ['.sfc', '.snes', '.smc', '.zip', '.7z'],
    },
    n64: {
      folderName: 'Nintendo - Nintendo 64',
      supportedFormats: ['.n64', '.v64', '.z64', '.zip', '.7z'],
    },
    gb: {
      folderName: 'Nintendo - Game Boy',
      supportedFormats: ['.gb', '.dmg', '.zip', '.7z'],
    },
    gbc: {
      folderName: 'Nintendo - Game Boy Color',
      supportedFormats: ['.gbc', '.gb', '.zip', '.7z'],
    },
    gba: {
      folderName: 'Nintendo - Game Boy Advance',
      supportedFormats: ['.gba', '.zip', '.7z'],
    },
    nds: {
      folderName: 'Nintendo - Nintendo DS',
      supportedFormats: ['.nds', '.zip', '.7z'],
    },
    ndsi: {
      folderName: 'Nintendo - Nintendo DSi',
      supportedFormats: ['.nds', '.dsi', '.srl', '.zip', '.7z'],
    },
    vb: {
      folderName: 'Nintendo - Virtual Boy',
      supportedFormats: ['.vb', '.zip', '.7z'],
    },
    genesis: {
      folderName: 'Sega - Mega Drive - Genesis',
      supportedFormats: ['.md', '.gen', '.smd', '.zip', '.7z'],
    },
    sms: {
      folderName: 'Sega - Master System - Mark III',
      supportedFormats: ['.sms', '.zip', '.7z'],
    },
    gg: {
      folderName: 'Sega - Game Gear',
      supportedFormats: ['.gg', '.zip', '.7z'],
    },
    psp: {
      folderName: 'Sony - PlayStation Portable',
      supportedFormats: ['.iso', '.cso', '.pbp'],
    },
    atari2600: {
      folderName: 'Atari - 2600',
      supportedFormats: ['.a26', '.bin', '.zip', '.7z'],
    },
    lynx: {
      folderName: 'Atari - Lynx',
      supportedFormats: ['.lnx', '.zip', '.7z'],
    },
    ngp: {
      folderName: 'SNK - Neo Geo Pocket',
      supportedFormats: ['.ngp', '.ngc', '.zip', '.7z'],
    },
    pce: {
      folderName: 'NEC - PC Engine - TurboGrafx-16',
      supportedFormats: ['.pce', '.zip', '.7z'],
    },
    arcade: {
      folderName: 'MAME',
      supportedFormats: ['.zip', '.7z'],
    },
  },
};
