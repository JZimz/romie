import path from 'node:path';
import { SYSTEM_REGISTRY } from './systemRegistry';
import { SYSTEM_CODES, type SystemType, type SystemCode, type SystemInfo } from '@/types/system';

import type { RomFile } from '@/types/rom';

interface RASystemMapping {
  consoleId: number; // RetroAchievements console ID
  code: SystemCode; // Internal system code
}

export const RA_SYSTEMS: RASystemMapping[] = [
  { consoleId: 1, code: 'genesis' }, // MEGA_DRIVE
  { consoleId: 2, code: 'n64' }, // NINTENDO_64
  { consoleId: 3, code: 'snes' }, // SUPER_NINTENDO
  { consoleId: 4, code: 'gb' }, // GAMEBOY
  { consoleId: 5, code: 'gba' }, // GAMEBOY_ADVANCE
  { consoleId: 6, code: 'gbc' }, // GAMEBOY_COLOR
  { consoleId: 7, code: 'nes' }, // NINTENDO
  { consoleId: 8, code: 'pce' }, // PC_ENGINE
  { consoleId: 11, code: 'sms' }, // MASTER_SYSTEM
  { consoleId: 13, code: 'lynx' }, // ATARI_LYNX
  { consoleId: 14, code: 'ngp' }, // NEOGEO_POCKET
  { consoleId: 15, code: 'gg' }, // GAME_GEAR
  { consoleId: 18, code: 'nds' }, // NINTENDO_DS
  { consoleId: 25, code: 'atari2600' }, // ATARI_2600
  { consoleId: 27, code: 'arcade' }, // ARCADE
  { consoleId: 28, code: 'vb' }, // VIRTUAL_BOY
  { consoleId: 29, code: 'msx' }, // MSX
  { consoleId: 41, code: 'psp' }, // PSP
  { consoleId: 53, code: 'ws' }, // WONDERSWAN
  { consoleId: 78, code: 'ndsi' }, // NINTENDO_DSi
];

const systems = Object.values(SYSTEM_REGISTRY);

// Mapping of RetroArch Console IDs to internal system codes
const RA_SYSTEM_MAPPING = Object.fromEntries(RA_SYSTEMS.map((s) => [s.consoleId, s.code]));
const RA_CONSOLE_MAPPING = Object.fromEntries(RA_SYSTEMS.map((s) => [s.code, s.consoleId]));

export function isSystemCode(code: SystemCode): code is SystemCode {
  return SYSTEM_CODES.includes(code);
}

export function getSystemByExtension(extension: string): SystemInfo[] {
  const ext = extension.toLowerCase();

  return systems.filter((system) => system.extensions.includes(ext));
}

export function getConsoleIdForSystem(code: SystemCode): number | null {
  return RA_CONSOLE_MAPPING[code] || null;
}

export function getSystemInfo(code: SystemCode): SystemInfo {
  const system = SYSTEM_REGISTRY[code];
  if (!system) {
    throw new Error(`Unknown system code: ${code}`);
  }
  return system;
}

export function getAllSupportedExtensions(): string[] {
  return systems.flatMap((system) => system.extensions).sort();
}

export function getSystemsByType(type: SystemType): SystemInfo[] {
  return systems.filter((system) => system.type === type);
}

export function determineSystem(romFile: RomFile): SystemCode {
  const { sourcePath, romFilename } = romFile;
  const fileExtension = path.extname(romFilename);

  const matches = getSystemByExtension(fileExtension);
  if (matches.length === 1) return matches[0].code;

  const system = determineSystemFromParentFolder(sourcePath);
  if (!system) {
    throw new Error(`Unsupported file extension: ${fileExtension}`);
  }

  return system;
}

export function determineSystemFromParentFolder(sourcePath: string): SystemCode | null {
  const parentFolder = path.basename(path.dirname(sourcePath));
  const matchedSystem = systems.find((system) =>
    system.aliases?.some((alias) => alias.toLowerCase() === parentFolder.toLowerCase())
  );

  return matchedSystem ? matchedSystem.code : null;
}

export function determineSystemFromRAConsoleId(consoleId: number): SystemCode | null {
  return RA_SYSTEM_MAPPING[consoleId] || null;
}

/**
 * Returns the human display name for a system code.
 */
export function getSystemDisplayName(code: SystemCode): string {
  return SYSTEM_REGISTRY[code]?.displayName || code;
}

/**
 * Returns the preferred badge abbreviation for a system code.
 */
export function getSystemAbbreviation(code: SystemCode): string {
  switch (code) {
    case 'genesis':
      return 'GEN';
    case 'atari2600':
      return '2600';
    case 'arcade':
      return 'ARC';
    case 'ndsi':
      return 'DSi';
    default:
      return code.toUpperCase();
  }
}
