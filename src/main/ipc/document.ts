import { ipcMain } from 'electron';
import { scanDocumentDirectory } from '@main/documents/documentService';
import { documents } from '@main/db/queries';

export function registerDocumentIpc() {
  ipcMain.handle('document:scan', scanDocumentDirectory);
  ipcMain.handle('document:list', () => documents.list());
  ipcMain.handle('document:search', (_, query: string, limit?: number) =>
    documents.search(query, limit)
  );
  ipcMain.handle('document:remove', (_, id: string | string[]) => documents.remove(id));
  ipcMain.handle('document:update', (_, id, data) => documents.update(id, data));
}
