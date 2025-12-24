import { eq } from 'drizzle-orm';
import { db, schema } from '@main/db';

export const settingsQueries = {
  get(key: string): string | null {
    return (
      db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1).get()?.value ??
      null
    );
  },

  set(key: string, value: string) {
    db.insert(schema.settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: schema.settings.key,
        set: { value },
      })
      .run();
  },

  remove(key: string) {
    db.delete(schema.settings).where(eq(schema.settings.key, key)).run();
  },

  getAll() {
    const results = db.select().from(schema.settings).all();

    return results.reduce(
      (acc, { key, value }) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );
  },

  setMany(settings: Record<string, string>) {
    for (const [key, value] of Object.entries(settings)) {
      this.set(key, value);
    }
  },
};
