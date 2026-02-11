import { eq, inArray } from 'drizzle-orm';
import { db, schema, getSqlite } from '@main/db';
import type { Document } from '@/types/document';

let ftsReady = false;

function ensureDocumentsFtsIndex() {
  if (ftsReady) return;

  const sqlite = getSqlite();
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      documentId UNINDEXED,
      title,
      filename,
      author,
      subject,
      textContent
    );

    INSERT INTO documents_fts(documentId, title, filename, author, subject, textContent)
    SELECT d.id, d.title, d.filename, ifnull(d.author, ''), ifnull(d.subject, ''), ifnull(d.textContent, '')
    FROM documents d
    WHERE NOT EXISTS (
      SELECT 1 FROM documents_fts f WHERE f.documentId = d.id
    );
  `);

  ftsReady = true;
}

function upsertFtsDocument(document: {
  id: string;
  title: string;
  filename: string;
  author: string | null;
  subject: string | null;
  textContent: string | null;
}) {
  ensureDocumentsFtsIndex();

  const sqlite = getSqlite();
  sqlite.prepare('DELETE FROM documents_fts WHERE documentId = ?').run(document.id);
  sqlite
    .prepare(
      'INSERT INTO documents_fts (documentId, title, filename, author, subject, textContent) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      document.id,
      document.title,
      document.filename,
      document.author ?? '',
      document.subject ?? '',
      document.textContent ?? ''
    );
}

function removeFtsDocuments(ids: string[]) {
  ensureDocumentsFtsIndex();

  const sqlite = getSqlite();
  const stmt = sqlite.prepare('DELETE FROM documents_fts WHERE documentId = ?');
  const tx = sqlite.transaction((docIds: string[]) => {
    for (const id of docIds) stmt.run(id);
  });
  tx(ids);
}

function toFtsQuery(searchQuery: string): string {
  return searchQuery
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `${token.replace(/"/g, '')}*`)
    .join(' AND ');
}

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

  search(searchQuery: string, limit = 100) {
    if (!searchQuery.trim()) {
      return db.select().from(schema.documents).limit(limit).all();
    }

    ensureDocumentsFtsIndex();

    const sqlite = getSqlite();
    const ftsQuery = toFtsQuery(searchQuery);

    return sqlite
      .prepare(
        `
        SELECT d.*
        FROM documents_fts f
        JOIN documents d ON d.id = f.documentId
        WHERE documents_fts MATCH ?
        ORDER BY bm25(documents_fts), d.updatedAt DESC
        LIMIT ?
      `
      )
      .all(ftsQuery, limit) as Document[];
  },

  insert(document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) {
    const inserted =
      db.insert(schema.documents).values(document).onConflictDoNothing().returning().get() ?? null;

    if (inserted) {
      upsertFtsDocument(inserted);
    }

    return inserted;
  },

  update(id: string, updates: Partial<Omit<Document, 'id' | 'createdAt' | 'updatedAt'>>) {
    db.update(schema.documents)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.documents.id, id))
      .run();

    const updated = this.findById(id);
    if (updated) {
      upsertFtsDocument(updated);
    }
  },

  remove(ids: string | string[]) {
    const idArray = Array.isArray(ids) ? ids : [ids];
    if (idArray.length === 0) return;

    db.delete(schema.documents).where(inArray(schema.documents.id, idArray)).run();
    removeFtsDocuments(idArray);
  },
};
