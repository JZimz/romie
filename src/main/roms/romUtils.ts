import { rhash, ConsoleId, type ConsoleIdValue } from 'node-rcheevos';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import CRC32 from 'crc-32';
import type { PathLike } from 'fs';
import type { RomFile, RomRegion } from '../../types/rom';

interface HashInput {
  filePath?: string;
  buffer?: Buffer;
}

// Common region codes found in ROM filenames
export const REGION_CODES: Record<string, RomRegion> = {
  // English/North America
  USA: 'USA',
  US: 'USA',
  U: 'USA',
  'NTSC-U': 'USA',
  'North America': 'USA',
  NA: 'USA',

  // Europe
  EUR: 'Europe',
  Europe: 'Europe',
  E: 'Europe',
  PAL: 'Europe',
  UK: 'Europe',
  Germany: 'Europe',
  France: 'Europe',
  Spain: 'Europe',
  Italy: 'Europe',
  Sweden: 'Europe',
  Netherlands: 'Europe',
  Norway: 'Europe',
  Denmark: 'Europe',
  Portugal: 'Europe',
  Poland: 'Europe',
  Finland: 'Europe',

  // Japan
  JPN: 'Japan',
  Japan: 'Japan',
  J: 'Japan',
  'NTSC-J': 'Japan',
  JP: 'Japan',

  // World/International
  World: 'World',
  W: 'World',
  International: 'World',
  UE: 'World', // USA + Europe
  JU: 'World', // Japan + USA
  JUE: 'World', // Japan + USA + Europe

  // Other regions
  Asia: 'Asia',
  Korea: 'Korea',
  KR: 'Korea',
  China: 'China',
  CH: 'China',
  Australia: 'Australia',
  AU: 'Australia',
  Brazil: 'Brazil',
  BR: 'Brazil',
  Canada: 'Canada',
  CA: 'Canada',
};

/**
 * Extracts region information from a ROM filename
 * Looks for region codes in parentheses like (USA), (Europe), (Japan), etc.
 *
 * @param filename - The ROM filename to extract region from
 * @returns The standardized region code or "Unknown" if no region found
 */
export function extractRegionFromFilename(filename: string): RomRegion | 'Unknown' {
  // Remove file extension for cleaner matching
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');

  // Look for region codes in parentheses: (USA), (Europe), (J), etc.
  const parenthesesMatches = nameWithoutExt.match(/\(([^)]+)\)/g);

  if (parenthesesMatches) {
    // Process each match in parentheses
    for (const match of parenthesesMatches) {
      const content = match.slice(1, -1); // Remove parentheses
      const region = findRegionInText(content);
      if (region !== 'Unknown') {
        return region;
      }
    }
  }

  // Look for region codes in square brackets: [USA], [Europe], [J], etc.
  const bracketMatches = nameWithoutExt.match(/\[([^\]]+)\]/g);

  if (bracketMatches) {
    // Process each match in brackets
    for (const match of bracketMatches) {
      const content = match.slice(1, -1); // Remove brackets
      const region = findRegionInText(content);
      if (region !== 'Unknown') {
        return region;
      }
    }
  }

  return 'Unknown';
}

export function cleanDisplayName(filename: string): string {
  // Remove file extension
  let name = filename.replace(/\.[^/.]+$/, '');

  // Remove everything in parentheses and brackets
  name = name.replace(/\([^)]*\)/g, '');
  name = name.replace(/\[[^\]]*\]/g, '');

  // Replace underscores and hyphens with spaces
  name = name.replace(/[_-]/g, ' ');

  // Clean up extra spaces and trim
  name = name.replace(/\s+/g, ' ').trim();

  // Convert to title case
  name = name.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );

  return name;
}

export function ramd5sum(consoleId: number | null, romFile: RomFile): string | null {
  if (!consoleId) return null;

  const { romPath, romBuffer, romFilename, sourcePath } = romFile;

  // rcheevos can't hash .rvz — it's a Dolphin compressed container, not a raw disc image.
  // It checks for GameCube magic bytes at offset 0x1C and throws on compressed formats.
  if (path.extname(romFilename).toLowerCase() === '.rvz') return null;

  // If we have a buffer then use it unless it's from an arcade game. These files must use
  // path since their hash is based on filename.
  if (romBuffer && consoleId !== ConsoleId.ARCADE) {
    // A fake file path is still needed when using buffer input so the RA hasher can
    // choose the correct hashing algorithm based on file extension.
    return rhash(consoleId as ConsoleIdValue, romFilename, romBuffer);
  }

  // If we have a romPath, then the ROM was extracted from an archive.
  return rhash(consoleId as ConsoleIdValue, romPath || sourcePath);
}

export async function md5sum({ filePath, buffer }: HashInput): Promise<string> {
  if (!buffer) {
    if (!filePath) {
      throw new Error('Either path or buffer must be provided');
    }

    buffer = await fs.readFile(filePath);
  }

  return crypto.createHash('md5').update(buffer).digest('hex').toLowerCase();
}

export async function crc32sum({ filePath, buffer }: HashInput): Promise<string> {
  if (!buffer) {
    if (!filePath) {
      throw new Error('Either path or buffer must be provided');
    }

    buffer = await fs.readFile(filePath);
  }

  const crc = CRC32.buf(buffer);

  return (crc >>> 0).toString(16).toLowerCase().padStart(8, '0');
}

/**
 * Helper function to find region codes within a text string
 * Handles complex region strings like "USA, Europe" or "Rev 1"
 */
function findRegionInText(text: string): RomRegion | 'Unknown' {
  // Clean up the text
  const cleanText = text.trim();

  // Direct exact match first
  if (cleanText in REGION_CODES) {
    return REGION_CODES[cleanText as keyof typeof REGION_CODES];
  }

  // Case-insensitive exact match
  const upperText = cleanText.toUpperCase();
  for (const [key, value] of Object.entries(REGION_CODES)) {
    if (key.toUpperCase() === upperText) {
      return value;
    }
  }

  // Handle comma-separated regions with priority
  if (cleanText.includes(',')) {
    const regions = cleanText.split(',').map((r) => r.trim());
    // Prioritize: USA > Europe > Japan > Others
    const priority = ['USA', 'US', 'U', 'Europe', 'EUR', 'E', 'Japan', 'JPN', 'J'];

    for (const priorityRegion of priority) {
      for (const region of regions) {
        if (region.toUpperCase() === priorityRegion.toUpperCase()) {
          return findRegionInText(region);
        }
      }
    }

    // If no priority match, take the first valid region
    for (const region of regions) {
      const result = findRegionInText(region);
      if (result !== 'Unknown') {
        return result;
      }
    }
  }

  // Handle multi-region codes like "UE" (USA+Europe)
  if (cleanText.length <= 3) {
    for (const [key, value] of Object.entries(REGION_CODES)) {
      if (key === cleanText) {
        return value;
      }
    }
  }

  return 'Unknown';
}

// Helper function to check if a region is valid
export function isValidRegion(region: string): region is RomRegion | 'Unknown' {
  return Object.values(REGION_CODES).includes(region as RomRegion) || region === 'Unknown';
}

export async function fileExists(filePath: PathLike) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}
