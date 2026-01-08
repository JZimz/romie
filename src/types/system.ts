export const SYSTEM_CODES = [
  'nes',
  'snes',
  'vb',
  'n64',
  'gb',
  'gbc',
  'gba',
  'nds',
  'ngp',
  'genesis',
  'sms',
  'gg',
  'psx',
  'psp',
  'lynx',
  'atari2600',
  'arcade',
] as const;

export type SystemCode = (typeof SYSTEM_CODES)[number];

export type SystemType = 'console' | 'handheld' | 'arcade';

export interface SystemInfo {
  code: SystemCode;
  displayName: string;
  fullName: string;
  type: SystemType;
  extensions: string[];
  aliases?: string[];
  requiresBios?: boolean;
  biosFiles?: string[];
  manufacturer?: string;
  releaseYear?: number;
}
