import { eq, count, sum, inArray } from 'drizzle-orm';
import { db, schema } from '@main/db';
import type { Rom } from '@/types/rom';
import type { SystemCode } from '@/types/system';

export const romsQueries = {
  findById(id: string) {
    return db.select().from(schema.roms).where(eq(schema.roms.id, id)).limit(1).get() ?? null;
  },

  findByMd5(md5: string) {
    return db.select().from(schema.roms).where(eq(schema.roms.md5, md5)).limit(1).get() ?? null;
  },

  list() {
    return db.select().from(schema.roms).all();
  },

  listBySystem(system: SystemCode) {
    return db.select().from(schema.roms).where(eq(schema.roms.system, system)).all();
  },

  insert(rom: Omit<Rom, 'id' | 'createdAt' | 'updatedAt' | 'numAchievements'>) {
    return db.insert(schema.roms).values(rom).returning().get();
  },

  update(id: string, updates: Partial<Omit<Rom, 'id' | 'createdAt' | 'updatedAt'>>) {
    db.update(schema.roms)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.roms.id, id))
      .run();
  },

  remove(ids: string | string[]) {
    const idArray = Array.isArray(ids) ? ids : [ids];
    if (idArray.length === 0) return;
    db.delete(schema.roms).where(inArray(schema.roms.id, idArray)).run();
  },

  count() {
    const result = db.select({ value: count() }).from(schema.roms).get();
    return result?.value ?? 0;
  },

  countBySystem(system: SystemCode) {
    const result = db
      .select({ value: count() })
      .from(schema.roms)
      .where(eq(schema.roms.system, system))
      .get();
    return result?.value ?? 0;
  },

  getTotalSize() {
    const result = db
      .select({ value: sum(schema.roms.size) })
      .from(schema.roms)
      .get();
    return Number(result?.value ?? 0);
  },

  getSystemCounts() {
    const results = db
      .select({
        system: schema.roms.system,
        count: count(),
      })
      .from(schema.roms)
      .groupBy(schema.roms.system)
      .all();

    return results.reduce(
      (acc, { system, count }) => {
        acc[system as SystemCode] = count;
        return acc;
      },
      {} as Partial<Record<SystemCode, number>>
    );
  },

  getTagStats() {
    const roms = db
      .select({
        size: schema.roms.size,
        tags: schema.roms.tags,
      })
      .from(schema.roms)
      .all();

    const tagStats: Record<
      string,
      {
        tag: string;
        romCount: number;
        totalSizeBytes: number;
      }
    > = {};

    roms.forEach((rom) => {
      if (rom.tags?.length) {
        rom.tags.forEach((tag) => {
          const safeKey = `tag:${tag}`;
          if (!tagStats[safeKey]) {
            tagStats[safeKey] = {
              tag,
              romCount: 0,
              totalSizeBytes: 0,
            };
          }
          tagStats[safeKey].romCount++;
          tagStats[safeKey].totalSizeBytes += rom.size;
        });
      }
    });

    return tagStats;
  },
};
