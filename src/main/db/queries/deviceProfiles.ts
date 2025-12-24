import { eq, sql } from 'drizzle-orm';
import { db, schema } from '@main/db';
import type { DeviceProfile } from '@romie/device-profiles';

export const deviceProfilesQueries = {
  findById(id: string) {
    return (
      db
        .select()
        .from(schema.deviceProfiles)
        .where(eq(schema.deviceProfiles.id, id))
        .limit(1)
        .get() ?? null
    );
  },

  findByName(name: string) {
    return (
      db
        .select()
        .from(schema.deviceProfiles)
        .where(sql`lower(${schema.deviceProfiles.name}) = lower(${name})`)
        .limit(1)
        .get() ?? null
    );
  },

  list() {
    return db.select().from(schema.deviceProfiles).all();
  },

  insert(profile: Omit<DeviceProfile, 'id' | 'createdAt' | 'updatedAt'>) {
    return db
      .insert(schema.deviceProfiles)
      .values({
        ...profile,
        version: profile.version || 1,
      })
      .returning()
      .get();
  },

  update(id: string, updates: Partial<Omit<DeviceProfile, 'id' | 'createdAt' | 'updatedAt'>>) {
    db.update(schema.deviceProfiles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.deviceProfiles.id, id))
      .run();
  },

  delete(id: string) {
    db.delete(schema.deviceProfiles).where(eq(schema.deviceProfiles.id, id)).run();
  },
};
