import { dialog } from 'electron';
import logger from 'electron-log/main';
import si from 'systeminformation';
import fs from 'fs/promises';
import { addDevice, addDeviceProfile } from '@main/roms/romDatabase';
import { devices } from '@main/db/queries';
import { AppError } from '@/errors';

import type { Device, StorageDevice } from '@/types/device';
import type { DeviceMountStatus, ApiResult } from '@/types/electron-api';
import type { DeviceProfile, DeviceProfileDraft } from '@romie/device-profiles';

const log = logger.scope('device');

export async function listStorage(): Promise<StorageDevice[]> {
  log.debug('[STORAGE] Starting storage device enumeration');

  const [blockDevices, fileSystems] = await Promise.all([si.blockDevices(), si.fsSize()]);

  log.debug(
    `[STORAGE] Found ${blockDevices.length} block devices, ${fileSystems.length} filesystems`
  );

  const validDevices: StorageDevice[] = [];

  blockDevices.forEach((device) => {
    const deviceLabel = device.label || device.name || 'Unnamed Device';

    if (device.removable) {
      const fs = fileSystems.find(({ mount }) => mount === device.mount);

      if (fs) {
        validDevices.push({
          ...device,
          label: device.label || 'Unnamed Device',
          size: fs.size,
        });
        log.debug(`[STORAGE] Added removable device: ${deviceLabel} at ${device.mount}`);
      } else {
        log.warn(
          `[STORAGE] Removable device ${deviceLabel} has no filesystem match (mount: ${device.mount})`
        );
      }
    }
  });

  log.info(`[STORAGE] Found ${validDevices.length} valid removable storage devices`);

  return validDevices;
}

export async function createDevice(data: Device): Promise<Device> {
  try {
    return await addDevice(data);
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to create device: ${reason}`);
  }
}

export async function removeDevice(id: string): Promise<void> {
  // eslint-disable-next-line drizzle/enforce-delete-with-where
  devices.delete(id);
}

export async function updateDevice(id: string, data: Partial<Device>): Promise<void> {
  log.warn('deviceService.updateDevice() is not implemented', id, data);
}

export async function checkDeviceMount(deviceId: string): Promise<DeviceMountStatus> {
  try {
    // Get the device to find its mount path
    const deviceList = devices.list();
    const device = deviceList.find((d) => d.id === deviceId);

    if (!device || !device.deviceInfo.mount) {
      return { accessible: false };
    }

    const mountPath = device.deviceInfo.mount;

    // Check if mount path is accessible
    try {
      await fs.access(mountPath);
    } catch {
      return { accessible: false };
    }

    // Get storage info for this mount path
    try {
      const fileSystems = await si.fsSize();
      const fsInfo = fileSystems.find((fs) => fs.mount === mountPath);

      if (fsInfo) {
        const freeGB = (fsInfo.available / (1000 * 1000 * 1000)).toFixed(1);
        const totalGB = (fsInfo.size / (1000 * 1000 * 1000)).toFixed(1);

        return {
          accessible: true,
          freeSpace: `${freeGB} GB`,
          totalSpace: `${totalGB} GB`,
          freeBytes: fsInfo.available,
          totalBytes: fsInfo.size,
        };
      }
    } catch (error) {
      log.warn(`Failed to get storage info for ${mountPath}:`, error);
    }

    // Mount is accessible but couldn't get storage info
    return { accessible: true };
  } catch (error) {
    log.error(`Failed to check device mount for ${deviceId}:`, error);
    return { accessible: false };
  }
}

export async function uploadProfile(): Promise<ApiResult<DeviceProfile | null>> {
  log.info('Prompting user to select device profile JSON file');
  const { filePaths, canceled } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    title: 'Select Device Profile JSON File',
  });

  if (canceled || filePaths.length === 0) {
    return { success: true, data: null };
  }

  const filePath = filePaths[0];
  log.info(`User selected profile file: ${filePath}`);

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const profileData = JSON.parse(fileContent) as DeviceProfileDraft;
    const profile = await addDeviceProfile(profileData);

    return { success: true, data: profile };
  } catch (error) {
    let message;
    let userMessage;

    if (error instanceof SyntaxError) {
      message = error.message;
      userMessage = 'Invalid file format. Device profiles should be valid JSON.';
    } else if (error instanceof AppError) {
      message = error.message;
      userMessage = error.userMessage;
    } else {
      message = error instanceof Error ? error.message : 'Unknown error';
      userMessage = 'An unexpected error occurred while uploading the profile.';
    }
    log.error(userMessage, error);

    return { success: false, error: message, userMessage };
  }
}
