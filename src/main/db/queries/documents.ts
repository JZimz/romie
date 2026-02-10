import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '@main/db';
import type { Document } from '@/types/document';

export const documentsQueries = {
  findById(id: string) {
    return (
      db.select().from(schema.documents).where(eq(schema.documents.id, id)).limit(1).get() ?? null
    );
  },

  findByPath(filePath: string) {
    return (
      db
        .select()
        .from(schema.documents)
        .where(eq(schema.documents.filePath, filePath))
        .limit(1)
        .get() ?? null
    );
  },

  list() {
    return db.select().from(schema.documents).all();
  },

  insert(document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) {
    return (
      db.insert(schema.documents).values(document).onConflictDoNothing().returning().get() ?? null
    );
  },

  update(id: string, updates: Partial<Omit<Document, 'id' | 'createdAt' | 'updatedAt'>>) {
    db.update(schema.documents)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.documents.id, id))
      .run();
  },

  remove(ids: string | string[]) {
    const idArray = Array.isArray(ids) ? ids : [ids];
    if (idArray.length === 0) return;
    db.delete(schema.documents).where(inArray(schema.documents.id, idArray)).run();
  },
};
