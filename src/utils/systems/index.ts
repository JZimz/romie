import { SYSTEM_REGISTRY } from './systemRegistry';
import { SYSTEM_CODES, type SystemType, type SystemCode, type SystemInfo } from '@/types/system';

interface RASystemMapping {
  consoleId: number; // RetroArch console ID
  code: SystemCode; // Internal system code
}

const RA_SYSTEMS: RASystemMapping[] = [
  { consoleId: 1, code: 'genesis' },
  { consoleId: 2, code: 'n64' },
  { consoleId: 3, code: 'snes' },
  { consoleId: 4, code: 'gb' },
  { consoleId: 5, code: 'gba' },
  { consoleId: 6, code: 'gbc' },
  { consoleId: 7, code: 'nes' },
  { consoleId: 11, code: 'sms' },
  { consoleId: 13, code: 'lynx' },
  { consoleId: 14, code: 'ngp' },
  { consoleId: 15, code: 'gg' },
  { consoleId: 18, code: 'nds' },
  { consoleId: 25, code: 'atari2600' },
  { consoleId: 27, code: 'arcade' },
  { consoleId: 28, code: 'vb' },
  { consoleId: 41, code: 'psp' },
];

const systems = Object.values(SYSTEM_REGISTRY);

// Mapping of RetroArch Console IDs to internal system codes
const RA_SYSTEM_MAPPING = Object.fromEntries(RA_SYSTEMS.map((s) => [s.consoleId, s.code]));
const RA_CONSOLE_MAPPING = Object.fromEntries(RA_SYSTEMS.map((s) => [s.code, s.consoleId]));

export function isSystemCode(code: SystemCode): code is SystemCode {
  return SYSTEM_CODES.includes(code);
}

export function getSystemByExtension(extension: string): SystemInfo | undefined {
  const ext = extension.toLowerCase();

  return systems.find((system) => system.extensions.includes(ext));
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

export function determineSystemFromExtension(fileExtension: string): SystemCode {
  const system = getSystemByExtension(fileExtension);
  if (!system) {
    throw new Error(`Unsupported file extension: ${fileExtension}`);
  }

  return system.code;
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
    default:
      return code.toUpperCase();
  }
}
