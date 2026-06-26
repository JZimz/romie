import { ipcMain } from 'electron';
import { scanRomDirectory } from '@main/roms/romService';
import { listRoms, removeRomById, getRomStats, updateRom } from '@main/roms/romDatabase';
import { checkRomAvailability } from '@main/roms/romValidation';
import type { Rom } from '@/types/rom';

export function registerRomIpc() {
  ipcMain.handle('rom:scan', scanRomDirectory);
  ipcMain.handle('rom:list', listRoms);
  ipcMain.handle('rom:remove', (_, id: string, deleteFile: boolean) =>
    removeRomById(id, deleteFile === true)
  );
  ipcMain.handle('rom:update', (_, id: string, data: Partial<Rom>) => updateRom(id, data));
  ipcMain.handle('rom:stats', () => getRomStats());
  ipcMain.handle('rom:refresh', checkRomAvailability);
}
