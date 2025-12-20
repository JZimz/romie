import { ipcMain } from 'electron';
import { scanRomDirectory } from '@main/roms/romService';
import { listRoms, updateRom, removeRomById, getRomStats } from '@main/database/roms';

export function registerRomIpc() {
  ipcMain.handle('rom:scan', scanRomDirectory);
  ipcMain.handle('rom:list', listRoms);
  ipcMain.handle('rom:remove', (_, id) => removeRomById(id));
  ipcMain.handle('rom:update', (_, id, data) => updateRom(id, data));
  ipcMain.handle('rom:stats', () => getRomStats());
}
