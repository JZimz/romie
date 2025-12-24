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

export function registerDeviceIpc() {
  ipcMain.handle('device:list', () => devices.list());
  ipcMain.handle('device:listStorage', listStorage);
  ipcMain.handle('device:listProfiles', listDeviceProfiles);
  ipcMain.handle('device:create', (_, data) => addDevice(data));
  ipcMain.handle('device:remove', (_, id) => removeDevice(id));
  ipcMain.handle('device:update', (_, id, data) => updateDevice(id, data));
  ipcMain.handle('device:checkDeviceMount', (_, deviceId) => checkDeviceMount(deviceId));
  ipcMain.handle('device:uploadProfile', uploadProfile);
}
