import { ipcMain } from 'electron';
import { scanRomDirectory } from '@main/roms/romService';
import { listRoms, removeRomById, getRomStats, updateRom } from '@main/roms/romDatabase';
import { checkRomAvailability } from '@main/roms/romValidation';

export function registerRomIpc() {
  ipcMain.handle('rom:scan', scanRomDirectory);
  ipcMain.handle('rom:list', listRoms);
  ipcMain.handle('rom:remove', (_, id) => removeRomById(id));
  ipcMain.handle('rom:update', (_, id, data) => updateRom(id, data));
  ipcMain.handle('rom:stats', () => getRomStats());
  ipcMain.handle('rom:refresh', checkRomAvailability);
}
