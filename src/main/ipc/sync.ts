import fs from 'fs/promises';
import path from 'path';
import { ipcMain, BrowserWindow } from 'electron';
import logger from 'electron-log/main';
import * as Sentry from '@sentry/electron/main';
import { SyncError } from '@/errors';
import type { SyncOptions, SyncStatus, SyncSkipReason, SyncFailReason } from '@/types/electron-api';
import { listDevices, getDeviceProfile, listRoms } from '../roms/romDatabase';
import { crc32sum } from '../roms/romUtils';

import type { DeviceProfile } from '@romie/device-profiles';
import type { Device } from '@/types/device';
import type { Rom } from '@/types/rom';

type SyncNotifier = ReturnType<typeof createSyncNotifier>;

const log = logger.scope('sync');
let syncCancelled = false;

//=== PUBLIC API ===
export function registerSyncIpc() {
  ipcMain.handle('sync:start', (_, tagIds, deviceId, options) =>
    startSync(tagIds, deviceId, options)
  );
  ipcMain.handle('sync:cancel', cancelSync);
}

//=== HANDLERS ===
async function startSync(
  tagIds: string[],
  deviceId: string,
  options: SyncOptions
): Promise<SyncStatus> {
  return await Sentry.startSpan(
    {
      op: 'sync.operation',
      name: 'Sync ROMs to Device',
      attributes: {
        'sync.tag_count': tagIds.length,
        'sync.clean_destination': options.cleanDestination,
        'sync.verify_files': options.verifyFiles,
      },
    },
    async (span) => {
      syncCancelled = false;
      const startTime = Date.now();
      const syncStatus = createSyncNotifier();

      log.info(`Starting sync operation for device ${deviceId} with tags: ${tagIds.join(', ')}`);
      log.info(
        `Sync options: cleanDestination=${options.cleanDestination}, verifyFiles=${options.verifyFiles}`
      );

      try {
        // Step 1: Validation
        syncStatus.setPhase('preparing').notify();

        const device = await Sentry.startSpan(
          { op: 'sync.validate', name: 'Validate Device' },
          () => validateDevice(deviceId)
        );
        const profile = await validateProfile(device.profileId);

        span.setAttributes({
          'device.profile_id': device.profileId,
          'device.profile_name': profile.name,
        });

        // Step 1.5: Prepare filesystem (macOS metadata guard + optional cleanup)
        await Sentry.startSpan(
          { op: 'sync.prepare_filesystem', name: 'Prepare Device Filesystem' },
          () => prepareDeviceFilesystem(device, profile, options)
        );

        // Step 2: Preparation
        if (options.cleanDestination) {
          await Sentry.startSpan({ op: 'sync.clean', name: 'Clean Destination' }, () =>
            cleanDestination(device, profile)
          );
        }

        // Step 3: Get and filter ROMs
        log.debug(`Loading ROM database`);
        const allRoms = await listRoms();
        const filteredRoms = filterRomsForSync(allRoms, tagIds, profile, syncStatus);
        syncStatus.setTotal(filteredRoms.length).notify();

        if (filteredRoms.length === 0) {
          log.warn(`No ROMs found matching criteria`);
          syncStatus.setPhase('done').setCurrentFile('').notify();
          span.setAttributes({
            'sync.roms_filtered': 0,
            'sync.roms_total': allRoms.length,
          });
          return syncStatus.status;
        }

        span.setAttributes({
          'sync.roms_filtered': filteredRoms.length,
          'sync.roms_total': allRoms.length,
        });

        // Step 4: Copy ROMs
        await Sentry.startSpan({ op: 'sync.copy', name: 'Copy ROMs to Device' }, () =>
          copyRoms(filteredRoms, device, profile, options, syncStatus)
        );

        // Step 5: Clean up macOS metadata files that can appear as duplicate games
        await Sentry.startSpan(
          { op: 'sync.cleanup_hidden', name: 'Remove macOS metadata files' },
          () => cleanupMacHiddenFiles(device, profile)
        );

        // Complete
        const duration = Date.now() - startTime;
        span.setAttributes({
          'sync.duration_ms': duration,
          'sync.success': true,
        });

        log.info(
          `Sync completed successfully in ${duration}ms: ${filteredRoms.length} ROMs synced`
        );

        syncStatus.setPhase('done').setCurrentFile('').notify();
      } catch (error) {
        const duration = Date.now() - startTime;
        span.setStatus({ code: 2, message: 'Sync operation failed' });
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.setAttributes({
          'sync.duration_ms': duration,
          'sync.success': false,
        });

        const syncError =
          error instanceof SyncError
            ? error
            : new SyncError(`Sync failed: ${(error as Error).message}`, error as Error);

        log.error(`Sync failed after ${duration}ms: ${syncError.message}`);
        if (syncError.cause) {
          log.error(`Root cause:`, syncError.cause);
        }

        syncStatus.setError(syncError).setCurrentFile('').notify();

        throw syncError;
      }

      return syncStatus.status;
    }
  );
}

function cancelSync() {
  log.info(`Sync cancellation requested`);
  syncCancelled = true;
}

//=== INTERNAL FUNCTIONS ===

async function validateDevice(deviceId: string): Promise<Device> {
  log.debug(`Validating device: ${deviceId}`);

  const devices = await listDevices();
  const device = devices.find((d) => d.id === deviceId);

  if (!device) {
    log.error(`Device not found: ${deviceId}`);
    throw new SyncError(`Device with id ${deviceId} not found`);
  }

  if (!device.deviceInfo.mount) {
    log.error(`Device ${device.name} has no mount path`);
    throw new SyncError(`Device ${device.name} has no mount path`);
  }

  // Check if mount path is accessible
  try {
    await fs.access(device.deviceInfo.mount);
    log.info(`Device validated: ${device.name} at ${device.deviceInfo.mount}`);
  } catch (error) {
    log.error(`Mount path not accessible: ${device.deviceInfo.mount}`, error);
    throw new SyncError(`Device mount path ${device.deviceInfo.mount} is not accessible`);
  }

  return device;
}

async function validateProfile(profileId: string): Promise<DeviceProfile> {
  log.debug(`Validating device profile: ${profileId}`);

  const profile = await getDeviceProfile(profileId);

  if (!profile) {
    log.error(`Device profile not found: ${profileId}`);
    throw new SyncError(`Device profile ${profileId} not found`);
  }

  log.info(`Using device profile: ${profile.name}`);
  return profile;
}

async function cleanDestination(device: Device, profile: DeviceProfile): Promise<void> {
  const destinationPath = getRomBasePath(device, profile);

  log.info(`Cleaning destination: ${destinationPath}`);

  try {
    await fs.rm(destinationPath, { recursive: true, force: true });
    log.info(`Destination cleaned successfully`);
  } catch (error) {
    log.error(`Failed to clean destination: ${(error as Error).message}`);
    throw new SyncError(
      `Failed to clean destination ${destinationPath}: ${(error as Error).message}`
    );
  }
}

function getRomBasePath(device: Device, profile: DeviceProfile): string {
  const sanitizedBasePath = profile.romBasePath.replace(/^[/\\]+/, '');
  return path.join(device.deviceInfo.mount, sanitizedBasePath);
}

function getSystemFolderPath(device: Device, profile: DeviceProfile, folderName: string): string {
  return path.join(getRomBasePath(device, profile), folderName);
}

async function prepareDeviceFilesystem(
  device: Device,
  profile: DeviceProfile,
  options: SyncOptions
): Promise<void> {
  await ensureMacMetadataDisabled(device.deviceInfo.mount);

  // When the user is not wiping the whole destination, proactively remove
  // macOS-style metadata files so they don't show up as duplicate games.
  if (!options.cleanDestination) {
    await cleanupMacHiddenFiles(device, profile);
  }
}

async function ensureMacMetadataDisabled(mountPath: string): Promise<void> {
  // Only relevant on macOS; on other platforms this is a no-op.
  if (process.platform !== 'darwin') {
    return;
  }

  const metadataFilePath = path.join(mountPath, '.metadata_never_index');

  try {
    await fs.writeFile(metadataFilePath, '', { flag: 'wx' });
    log.info(`Created .metadata_never_index at ${metadataFilePath}`);
  } catch (error) {
    const err = error as { code?: string; message?: string };

    if (err.code === 'EEXIST') {
      log.debug(`.metadata_never_index already exists at ${metadataFilePath}`);
      return;
    }

    if (err.code === 'ENOENT') {
      log.warn(
        `Failed to create .metadata_never_index at ${metadataFilePath}: mount path does not exist`
      );
      return;
    }

    if (err.code === 'EROFS') {
      log.warn(
        `Failed to create .metadata_never_index at ${metadataFilePath}: filesystem is read-only`
      );
      return;
    }

    log.warn(
      `Failed to create .metadata_never_index at ${metadataFilePath}: ${
        err.message ?? String(error)
      }`
    );
  }
}

async function cleanupMacHiddenFiles(device: Device, profile: DeviceProfile): Promise<void> {
  const romBasePath = getRomBasePath(device, profile);

  const systemFolders = Object.values(profile.systemMappings)
    .filter((mapping): mapping is NonNullable<typeof mapping> => !!mapping)
    .map((mapping) => path.join(romBasePath, mapping.folderName));

  const uniqueFolders = Array.from(new Set(systemFolders));

  let totalRemoved = 0;

  for (const folder of uniqueFolders) {
    totalRemoved += await removeMacHiddenFilesInDirectory(folder);
  }

  if (totalRemoved > 0) {
    log.info(`Removed ${totalRemoved} macOS metadata files from device at ${romBasePath}`);
  } else {
    log.debug(`No macOS metadata files found under ${romBasePath}`);
  }
}

async function removeMacHiddenFilesInDirectory(dir: string): Promise<number> {
  try {
    const entries = await fs.readdir(dir);

    let removed = 0;

    for (const name of entries) {
      const fullPath = path.join(dir, name);

      try {
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          removed += await removeMacHiddenFilesInDirectory(fullPath);
          continue;
        }

        if (!stats.isFile()) {
          continue;
        }

        if (name === '.DS_Store' || name.startsWith('._')) {
          try {
            await fs.unlink(fullPath);
            removed++;
            log.debug(`Removed macOS metadata file: ${fullPath}`);
          } catch (error) {
            const err = error as { message?: string };
            log.warn(
              `Failed to remove macOS metadata file ${fullPath}: ${err.message ?? String(error)}`
            );
          }
        }
      } catch (error) {
        const err = error as { message?: string };
        log.warn(
          `Failed to stat path ${fullPath} while cleaning macOS metadata files: ${
            err.message ?? String(error)
          }`
        );
      }
    }

    return removed;
  } catch (error) {
    const err = error as { code?: string; message?: string };

    if (err.code === 'ENOENT') {
      log.debug(`Skipping hidden file cleanup for missing directory: ${dir}`);
      return 0;
    }

    log.warn(
      `Failed to read directory ${dir} while cleaning macOS metadata files: ${
        err.message ?? String(error)
      }`
    );
    return 0;
  }
}

function filterRomsForSync(
  allRoms: Rom[],
  tagIds: string[],
  profile: DeviceProfile,
  syncStatus: SyncNotifier
): Rom[] {
  log.debug(`Filtering ${allRoms.length} ROMs for tags: ${tagIds.join(', ')}`);

  const filteredRoms = allRoms.filter((rom) => {
    // Check if ROM has any of the target tags
    if (!rom.tags?.some((tag) => tagIds.includes(tag))) {
      return false;
    }

    // Check if system is supported by profile
    const systemMapping = profile.systemMappings[rom.system];
    if (!systemMapping) {
      log.warn(`Unsupported system ${rom.system} for ROM: ${rom.displayName}`);
      syncStatus
        .addSkipped({
          rom,
          reason: 'unsupported_system',
          details: `System ${rom.system} not supported by profile ${profile.name}`,
        })
        .incrementProcessed();
      return false;
    }

    // Check if file extension is supported
    const extension = path.extname(rom.filename);
    if (!systemMapping.supportedFormats?.includes(extension)) {
      log.warn(`Unsupported format ${extension} for ROM: ${rom.displayName}`);
      syncStatus
        .addSkipped({
          rom,
          reason: 'unsupported_format',
          details: `Format ${extension} not supported for system ${rom.system}`,
        })
        .incrementProcessed();
      return false;
    }

    return true;
  });

  log.info(`Filtered to ${filteredRoms.length} ROMs for sync`);
  return filteredRoms;
}

async function copyRoms(
  filteredRoms: Rom[],
  device: Device,
  profile: DeviceProfile,
  options: SyncOptions,
  syncStatus: SyncNotifier
): Promise<void> {
  syncStatus.setPhase('copying').notify();

  log.info(`Starting copy of ${filteredRoms.length} ROMs to ${device.name}`);

  for (let i = 0; i < filteredRoms.length; i++) {
    // TODO: This singleton pattern needs to be removed if we ever support multiple syncs at once
    if (syncCancelled) {
      log.warn(`Sync cancelled at ROM ${i + 1}/${filteredRoms.length}`);
      throw new SyncError('Sync was cancelled');
    }

    const rom = filteredRoms[i];
    const systemMapping = profile.systemMappings[rom.system];
    if (!systemMapping) {
      syncStatus
        .addSkipped({
          rom,
          reason: 'missing_system_mapping',
          details: `No system mapping for ${rom.system} in profile ${profile.name}`,
        })
        .incrementProcessed()
        .notify();
      continue;
    }

    syncStatus.setCurrentFile(rom.displayName).notify();

    const sourceFilename = path.basename(rom.filePath);
    const destinationFilename = options.useCleanNames
      ? `${rom.displayName}${path.extname(sourceFilename)}`
      : sourceFilename;

    const destinationDir = getSystemFolderPath(device, profile, systemMapping.folderName);
    const destinationPath = path.join(destinationDir, destinationFilename);

    log.debug(`Processing ROM ${i + 1}/${filteredRoms.length}: ${rom.displayName}`);

    // Create destination directory if needed
    await fs.mkdir(destinationDir, { recursive: true });

    // Skip if destination exists
    try {
      await fs.access(destinationPath);
      log.debug(`Skipping existing file: ${rom.filename}`);
      syncStatus
        .addSkipped({
          rom,
          reason: 'file_exists',
          details: `File already exists at ${destinationPath}`,
        })
        .incrementProcessed()
        .notify();
      continue; // File already exists, skip
    } catch {
      // File doesn't exist, proceed with copy
    }

    // Copy file
    try {
      log.debug(`Copying: ${rom.filePath} -> ${destinationPath}`);
      await fs.copyFile(rom.filePath, destinationPath);
      log.debug(`Copy completed: ${rom.filename}`);
    } catch (error) {
      log.error(`Copy failed for ${rom.filename}: ${(error as Error).message}`);
      syncStatus
        .addFailed({
          rom,
          error: new SyncError(`Failed to copy ${rom.filename}: ${(error as Error).message}`),
        })
        .incrementProcessed()
        .notify();
      continue;
    }

    // Verify checksum if requested
    if (options.verifyFiles) {
      try {
        log.debug(`Verifying checksum for: ${rom.filename}`);
        const copiedCrc32 = await crc32sum({ filePath: destinationPath });

        if (copiedCrc32 !== rom.fileCrc32) {
          log.error(`Checksum mismatch for ${rom.filename}`);

          // Delete the corrupted file
          try {
            await fs.unlink(destinationPath);
            log.debug(`Deleted corrupted file: ${destinationPath}`);
          } catch (deleteError) {
            log.warn(`Failed to delete corrupted file: ${(deleteError as Error).message}`);
          }

          // Record as failure and continue
          syncStatus
            .addFailed({
              rom,
              error: new SyncError(`Copy verification failed: checksum mismatch`),
            })
            .incrementProcessed()
            .notify();
          continue;
        }
        log.debug(`Checksum verified for: ${rom.filename}`);
      } catch (error) {
        log.error(`Verification failed for ${rom.filename}: ${(error as Error).message}`);

        // Delete the file since we can't verify it
        try {
          await fs.unlink(destinationPath);
          log.debug(`Deleted unverifiable file: ${destinationPath}`);
        } catch (deleteError) {
          log.warn(`Failed to delete unverifiable file: ${(deleteError as Error).message}`);
        }

        // Record as failure and continue
        syncStatus
          .addFailed({
            rom,
            error: new SyncError(`Failed to verify ${rom.filename}: ${(error as Error).message}`),
          })
          .incrementProcessed()
          .notify();
        continue;
      }
    }

    // Update progress
    syncStatus.incrementProcessed().notify();
  }

  log.info(`Copy completed: ${filteredRoms.length} ROMs synced successfully`);
}

//- utilities

function emitProgress(progress: SyncStatus) {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  mainWindow?.webContents.send('sync:progress', progress);
}

function createSyncNotifier() {
  const syncStatus: SyncStatus = {
    phase: 'idle',
    totalFiles: 0,
    filesProcessed: 0,
    filesFailed: [],
    filesSkipped: [],
    progressPercent: 0,
  };

  function notify() {
    syncStatus.progressPercent =
      syncStatus.totalFiles === 0
        ? 0
        : Math.round((syncStatus.filesProcessed / syncStatus.totalFiles) * 100);
    emitProgress(syncStatus);
  }

  const notifier = {
    notify,
    status: syncStatus,
    setError: (e: SyncError) => {
      syncStatus.error = e;
      return notifier;
    },
    setPhase: (phase: SyncStatus['phase']) => {
      syncStatus.phase = phase;
      return notifier;
    },
    setTotal: (totalFiles: number) => {
      syncStatus.totalFiles = totalFiles;
      return notifier;
    },
    setCurrentFile: (currentFile: string) => {
      syncStatus.currentFile = currentFile;
      return notifier;
    },
    incrementProcessed: () => {
      syncStatus.filesProcessed++;
      return notifier;
    },
    addSkipped: (reason: SyncSkipReason) => {
      syncStatus.filesSkipped.push(reason);
      return notifier;
    },
    addFailed: (reason: SyncFailReason) => {
      syncStatus.filesFailed.push(reason);
      return notifier;
    },
  };

  return notifier;
}
