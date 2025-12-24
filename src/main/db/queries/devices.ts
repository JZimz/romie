import { eq } from 'drizzle-orm';
import { db, schema } from '@main/db';
import type { Device } from '@/types/device';

export const devicesQueries = {
  findById(id: string) {
    return db.select().from(schema.devices).where(eq(schema.devices.id, id)).limit(1).get() ?? null;
  },

  list() {
    return db.select().from(schema.devices).all();
  },

  insert(device: Omit<Device, 'id' | 'createdAt' | 'updatedAt'>) {
    return db.insert(schema.devices).values(device).returning().get();
  },

  update(id: string, updates: Partial<Omit<Device, 'id' | 'createdAt' | 'updatedAt'>>) {
    db.update(schema.devices)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.devices.id, id))
      .run();
  },

  delete(id: string) {
    db.delete(schema.devices).where(eq(schema.devices.id, id)).run();
  },
};
