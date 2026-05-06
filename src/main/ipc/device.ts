import { ipcMain } from 'electron';
import {
  listStorage,
  updateDevice,
  removeDevice,
  checkDeviceMount,
  uploadProfile,
} from '@main/devices/deviceService';

import { listDeviceProfiles, addDevice } from '@main/roms/romDatabase';
import { devices } from '@main/db/queries';
import type { Device } from '@/types/device';

export function registerDeviceIpc() {
  ipcMain.handle('device:list', () => devices.list());
  ipcMain.handle('device:listStorage', listStorage);
  ipcMain.handle('device:listProfiles', listDeviceProfiles);
  ipcMain.handle('device:create', (_, data: Device) => addDevice(data));
  ipcMain.handle('device:remove', (_, id: string) => removeDevice(id));
  ipcMain.handle('device:update', (_, id: string, data: Partial<Device>) => updateDevice(id, data));
  ipcMain.handle('device:checkDeviceMount', (_, deviceId: string) => checkDeviceMount(deviceId));
  ipcMain.handle('device:uploadProfile', uploadProfile);
}
