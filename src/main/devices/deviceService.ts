import { dialog } from 'electron';
import logger from 'electron-log/main';
import * as Sentry from '@sentry/electron/main';
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
  return await Sentry.startSpan(
    {
      op: 'device.storage.list',
      name: 'List Storage Devices',
    },
    async (span) => {
      log.debug('[STORAGE] Starting storage device enumeration');

      try {
        const [blockDevices, fileSystems] = await Promise.all([
          Sentry.startSpan({ op: 'device.storage.block', name: 'Get Block Devices' }, () =>
            si.blockDevices()
          ),
          Sentry.startSpan({ op: 'device.storage.fs', name: 'Get Filesystem Info' }, () =>
            si.fsSize()
          ),
        ]);

        log.debug(
          `[STORAGE] Found ${blockDevices.length} block devices, ${fileSystems.length} filesystems`
        );

        const validDevices: StorageDevice[] = [];
        let removableDevicesFound = 0;
        let mountMismatches = 0;

        blockDevices.forEach((device) => {
          const deviceLabel = device.label || device.name || 'Unnamed Device';

          if (device.removable) {
            removableDevicesFound++;
            const fs = fileSystems.find(({ mount }) => mount === device.mount);

            if (fs) {
              validDevices.push({
                ...device,
                label: device.label || 'Unnamed Device',
                size: fs.size,
              });
              log.debug(`[STORAGE] Added removable device: ${deviceLabel} at ${device.mount}`);
            } else {
              mountMismatches++;
              log.warn(
                `[STORAGE] Removable device ${deviceLabel} has no filesystem match (mount: ${device.mount})`
              );
            }
          }
        });

        span.setAttributes({
          'storage.removable_devices_found': removableDevicesFound,
          'storage.valid_devices_found': validDevices.length,
          'storage.mount_mismatches': mountMismatches,
        });

        log.info(`[STORAGE] Found ${validDevices.length} valid removable storage devices`);

        return validDevices;
      } catch (error) {
        span.setStatus({ code: 2, message: 'Storage enumeration failed' });
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    }
  );
}

export async function createDevice(data: Device): Promise<Device> {
  return await Sentry.startSpan(
    {
      op: 'device.create',
      name: 'Create Device',
      attributes: {
        'device.profile_id': data.profileId,
        'device.has_mount': !!data.deviceInfo.mount,
        'device.size_gb': data.deviceInfo.size
          ? Math.round((data.deviceInfo.size / (1024 * 1024 * 1024)) * 100) / 100
          : 0,
      },
    },
    async (span) => {
      try {
        return await addDevice(data);
      } catch (err) {
        span.setStatus({ code: 2, message: 'Device creation failed' });
        span.recordException(err instanceof Error ? err : new Error(String(err)));

        const reason = err instanceof Error ? err.message : 'Unknown error';
        throw new Error(`Failed to create device: ${reason}`);
      }
    }
  );
}

export async function removeDevice(id: string): Promise<void> {
  log.warn('deviceService.removeDevice() is not implemented', id);
}

export async function updateDevice(id: string, data: Partial<Device>): Promise<void> {
  log.warn('deviceService.updateDevice() is not implemented', id, data);
}

export async function checkDeviceMount(deviceId: string): Promise<DeviceMountStatus> {
  return await Sentry.startSpan(
    {
      op: 'device.mount.check',
      name: 'Check Device Mount Status',
    },
    async (span) => {
      try {
        // Get the device to find its mount path
        const deviceList = devices.list();
        const device = deviceList.find((d) => d.id === deviceId);

        if (!device || !device.deviceInfo.mount) {
          span.setAttributes({
            'device.found': !!device,
            'device.has_mount': device ? !!device.deviceInfo.mount : false,
            'mount.accessible': false,
          });
          return { accessible: false };
        }

        span.setAttributes({
          'device.found': true,
          'device.has_mount': true,
          'device.profile_id': device.profileId,
        });

        const mountPath = device.deviceInfo.mount;

        // Check if mount path is accessible
        try {
          await fs.access(mountPath);
          span.setAttributes({ 'mount.accessible': true });
        } catch {
          span.setAttributes({
            'mount.accessible': false,
            'mount.access_check_failed': true,
          });
          return { accessible: false };
        }

        // Get storage info for this mount path
        try {
          const fileSystems = await Sentry.startSpan(
            { op: 'device.mount.fsinfo', name: 'Get Mount Filesystem Info' },
            () => si.fsSize()
          );
          const fsInfo = fileSystems.find((fs) => fs.mount === mountPath);

          if (fsInfo) {
            const freeGB = (fsInfo.available / (1000 * 1000 * 1000)).toFixed(1);
            const totalGB = (fsInfo.size / (1000 * 1000 * 1000)).toFixed(1);

            span.setAttributes({
              'mount.has_storage_info': true,
              'mount.free_gb': parseFloat(freeGB),
              'mount.total_gb': parseFloat(totalGB),
              'mount.usage_percent': Math.round((1 - fsInfo.available / fsInfo.size) * 100),
            });

            return {
              accessible: true,
              freeSpace: `${freeGB} GB`,
              totalSpace: `${totalGB} GB`,
              freeBytes: fsInfo.available,
              totalBytes: fsInfo.size,
            };
          } else {
            span.setAttributes({
              'mount.has_storage_info': false,
              'mount.fs_not_found': true,
            });
          }
        } catch (error) {
          span.recordException(error instanceof Error ? error : new Error(String(error)));
          span.setAttributes({
            'mount.has_storage_info': false,
            'mount.storage_info_error': true,
          });
          log.warn(`Failed to get storage info for ${mountPath}:`, error);
        }

        // Mount is accessible but couldn't get storage info
        return { accessible: true };
      } catch (error) {
        span.setStatus({ code: 2, message: 'Device mount check failed' });
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.setAttributes({ 'mount.accessible': false });

        log.error(`Failed to check device mount for ${deviceId}:`, error);
        return { accessible: false };
      }
    }
  );
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
