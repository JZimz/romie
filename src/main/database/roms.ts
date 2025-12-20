import { getDatabase } from './connection';
import logger from 'electron-log/main';
import { loadHashDatabase, lookupRomByHashSync } from '../roms/romLookup';
import type { Rom, RomRegion, RomDatabaseStats, TagStats } from '@/types/rom';
import type { SystemCode } from '@/types/system';

const log = logger.scope('db:roms');

// Database row type (internal to this module)
interface RomRow {
  id: string;
  displayName: string;
  system: string;
  region: string;
  filePath: string;
  filename: string;
  romFilename: string;
  size: number;
  md5: string;
  fileCrc32: string | null;
  ramd5: string | null;
  verified: number; // 0 or 1
  tags: string; // JSON string
  favorite: number; // 0 or 1
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

const ROM_IMMUTABLE_FIELDS: (keyof Rom)[] = [
  'id',
  'filename',
  'romFilename',
  'filePath',
  'size',
  'createdAt',
  'updatedAt',
  'md5',
  'ramd5',
  'fileCrc32',
  'numAchievements',
];

export function addRom(rom: Rom): void {
  const db = getDatabase();
  const now = Date.now();
  log.debug(`Adding ROM: ${rom.filename} (${rom.romFilename})`);

  // Check for duplicates
  const existing = db.prepare('SELECT id, filename FROM roms WHERE md5 = ?').get(rom.md5) as
    | { id: string; filename: string }
    | undefined;

  if (existing) {
    log.warn(`Duplicate ROM rejected: ${rom.filename} (matches ${existing.filename})`);
    throw new Error(`ROM "${rom.filename}" already exists (duplicate of "${existing.filename}")`);
  }

  const stmt = db.prepare(`
    INSERT INTO roms (
      id, filename, romFilename, filePath, size, md5, ramd5, fileCrc32,
      system, verified, tags, displayName, region,
      favorite, notes, createdAt, updatedAt
    ) VALUES (
      @id, @filename, @romFilename, @filePath, @size, @md5, @ramd5, @fileCrc32,
      @system, @verified, @tags, @displayName, @region,
      @favorite, @notes, @createdAt, @updatedAt
    )
  `);

  stmt.run({
    ...rom,
    verified: rom.verified ? 1 : 0,
    tags: JSON.stringify(rom.tags || []),
    favorite: rom.favorite ? 1 : 0,
    notes: rom.notes || null,
    createdAt: now,
    updatedAt: now,
  });

  log.info(`ROM added: ${rom.filename} (${rom.romFilename})`);
}

export function getRomById(id: string): Rom | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM roms WHERE id = ?').get(id) as RomRow | undefined;

  if (!row) {
    return null;
  }

  return rowToRom(row);
}

export async function listRoms(): Promise<Rom[]> {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM roms').all() as RomRow[];

  return enrichRoms(rows);
}

export async function listRomsByTags(tagIds: string[]): Promise<Rom[]> {
  if (tagIds.length === 0) {
    return [];
  }

  const db = getDatabase();

  // Build placeholders for IN clause
  const placeholders = Array(tagIds.length).fill('?').join(', ');

  // Query ROMs that have any of the specified tags
  const rows = db
    .prepare(
      `
      SELECT DISTINCT roms.*
      FROM roms, json_each(roms.tags)
      WHERE json_each.value IN (${placeholders})
    `
    )
    .all(...tagIds) as RomRow[];

  return enrichRoms(rows);
}

export function updateRom(id: string, updates: Partial<Rom>): void {
  log.debug(`Updating ROM: ${id}`);
  const db = getDatabase();
  const now = Date.now();

  // Remove immutable fields
  const mutableUpdates = { ...updates };
  ROM_IMMUTABLE_FIELDS.forEach((key) => delete mutableUpdates[key]);

  const fields = Object.keys(mutableUpdates) as Array<keyof Rom>;

  if (fields.length === 0) {
    log.debug('No mutable fields to update');
    return;
  }

  // Build dynamic UPDATE query
  const setClauses = fields.map((field) => `${field} = @${field}`).join(', ');

  const stmt = db.prepare(`
    UPDATE roms
    SET ${setClauses}, updatedAt = @updatedAt
    WHERE id = @id
  `);

  // Prepare values for named parameters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: Record<string, any> = {
    id,
    updatedAt: now,
  };

  // Convert Rom type values to database values
  fields.forEach((field) => {
    const value = mutableUpdates[field];

    if (field === 'tags') {
      values[field] = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      values[field] = value ? 1 : 0;
    } else {
      values[field] = value ?? null;
    }
  });

  const result = stmt.run(values);

  // Verify ROM was actually updated
  if (result.changes === 0) {
    throw new Error(`ROM with id ${id} not found`);
  }

  log.info(`ROM updated: ${id} (${fields.length} fields changed)`);
}

export function removeRomById(id: string): void {
  log.debug(`Removing ROM: ${id}`);
  const db = getDatabase();
  const rom = getRomById(id);

  if (!rom) {
    throw new Error(`ROM with id ${id} not found`);
  }

  db.prepare('DELETE FROM roms WHERE id = ?').run(id);
  log.info(`ROM removed: ${id}`);
}

export function getRomStats(): RomDatabaseStats {
  const db = getDatabase();

  // Use .pluck() for single values
  const totalRoms = (db.prepare('SELECT COUNT(*) FROM roms').pluck().get() as number) || 0;
  const totalSize = (db.prepare('SELECT SUM(size) FROM roms').pluck().get() as number) || 0;

  const systemCounts = db
    .prepare(
      `
    SELECT system, COUNT(*) as count
    FROM roms
    GROUP BY system
  `
    )
    .all() as Array<{ system: string; count: number }>;

  // Tag stats using JSON extraction
  const tagStatsRaw = db
    .prepare(
      `
    SELECT
      json_each.value as tag,
      COUNT(*) as count,
      SUM(roms.size) as totalSize
    FROM roms, json_each(roms.tags)
    WHERE roms.tags != '[]'
    GROUP BY tag
  `
    )
    .all() as Array<{ tag: string; count: number; totalSize: number }>;

  const tagStats: Record<string, TagStats> = {};
  tagStatsRaw.forEach(({ tag, count, totalSize }) => {
    tagStats[`tag:${tag}`] = {
      tag,
      romCount: count,
      totalSizeBytes: totalSize,
    };
  });

  return {
    totalRoms,
    totalSizeBytes: totalSize,
    systemCounts: Object.fromEntries(systemCounts.map(({ system, count }) => [system, count])),
    tagStats,
  };
}

// Helper: Convert DB row to Rom type
function rowToRom(row: RomRow): Rom {
  return {
    id: row.id,
    displayName: row.displayName,
    system: row.system as SystemCode,
    region: row.region as RomRegion | 'Unknown',
    filePath: row.filePath,
    filename: row.filename,
    romFilename: row.romFilename,
    size: row.size,
    md5: row.md5,
    fileCrc32: row.fileCrc32 ?? '',
    ramd5: row.ramd5 ?? null,
    verified: row.verified === 1,
    tags: JSON.parse(row.tags || '[]'),
    favorite: row.favorite === 1,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Helper: Enrich ROMs with derived properties from external sources
async function enrichRoms(rows: RomRow[]): Promise<Rom[]> {
  // Preload game database once
  await loadHashDatabase();

  // Map rows to ROMs with derived properties
  return rows.map((row) => {
    const rom = rowToRom(row);

    if (!rom.verified || !rom.ramd5) {
      return rom;
    }

    const game = lookupRomByHashSync(rom.ramd5);

    return {
      ...rom,
      numAchievements: game?.numAchievements ?? 0,
    };
  });
}
