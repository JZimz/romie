import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type { SystemCode } from '@/types/system';
import type { DeviceSystemProfile } from '@romie/device-profiles';
import type { StorageDevice } from '@/types/device';
import type { RomRegion } from '@/types/rom';

// Base columns included in all tables
const base = {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  createdAt: integer({ mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer({ mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
};

export const roms = sqliteTable(
  'roms',
  {
    ...base,
    system: text().notNull().$type<SystemCode>(),
    displayName: text().notNull(),
    region: text().notNull().$type<RomRegion | 'Unknown'>(),
    filePath: text().notNull(),
    filename: text().notNull(),
    romFilename: text().notNull(),
    size: integer().notNull(),
    md5: text().notNull(),
    fileCrc32: text().notNull(),
    ramd5: text(),
    verified: integer({ mode: 'boolean' }).notNull().default(false),
    tags: text({ mode: 'json' }).$type<string[]>(),
    favorite: integer({ mode: 'boolean' }),
    notes: text(),
  },
  (table) => [uniqueIndex('roms_md5_idx').on(table.md5), index('roms_system_idx').on(table.system)]
);

export const deviceProfiles = sqliteTable(
  'device_profiles',
  {
    ...base,
    name: text().notNull(),
    romBasePath: text().notNull(),
    systemMappings: text({ mode: 'json' })
      .notNull()
      .$type<Partial<Record<SystemCode, DeviceSystemProfile>>>(),
    version: integer().notNull().default(1),
  },
  (table) => [index('device_profiles_name_idx').on(sql`lower(${table.name})`)]
);

export const devices = sqliteTable(
  'devices',
  {
    ...base,
    name: text().notNull(),
    profileId: text().notNull(),
    // TODO: Add FK constraint after refactoring device profile seeding
    // .references(() => deviceProfiles.id, { onDelete: 'restrict' }),
    deviceInfo: text({ mode: 'json' }).notNull().$type<StorageDevice>(),
  },
  (table) => [index('devices_profile_id_idx').on(table.profileId)]
);

export const settings = sqliteTable('settings', {
  key: text().primaryKey(),
  value: text().notNull(),
});

export const metadata = sqliteTable('metadata', {
  key: text().primaryKey(),
  value: text().notNull(),
});
