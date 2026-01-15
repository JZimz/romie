import fs from 'fs/promises';
import path from 'path';
import { ipcMain, BrowserWindow } from 'electron';
import logger from 'electron-log/main';
import { SyncError } from '@/errors';
import type { SyncOptions, SyncStatus, SyncSkipReason, SyncFailReason } from '@/types/electron-api';
import { getDeviceProfile, listRoms } from '../roms/romDatabase';
import { devices } from '@main/db/queries';
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

    const device = await validateDevice(deviceId);
    const profile = await validateProfile(device.profileId);

    // Step 2: Preparation
    if (options.cleanDestination) {
      await cleanDestination(device, profile);
    }

    // Step 3: Get and filter ROMs
    log.debug(`Loading ROM database`);
    const allRoms = await listRoms();
    const filteredRoms = filterRomsForSync(allRoms, tagIds, profile, syncStatus);
    syncStatus.setTotal(filteredRoms.length).notify();

    if (filteredRoms.length === 0) {
      log.warn(`No ROMs found matching criteria`);
      syncStatus.setPhase('done').setCurrentFile('').notify();
      return syncStatus.status;
    }

    // Step 4: Copy ROMs
    await copyRoms(filteredRoms, device, profile, options, syncStatus);

    // Step 5: Clean up macOS hidden files
    const destinationPath = path.join(device.deviceInfo.mount, profile.romBasePath);
    await cleanMacOSHiddenFiles(destinationPath);

    // Complete
    const duration = Date.now() - startTime;

    log.info(`Sync completed successfully in ${duration}ms: ${filteredRoms.length} ROMs synced`);

    syncStatus.setPhase('done').setCurrentFile('').notify();
  } catch (error) {
    const duration = Date.now() - startTime;

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

function cancelSync() {
  log.info(`Sync cancellation requested`);
  syncCancelled = true;
}

//=== INTERNAL FUNCTIONS ===

async function validateDevice(deviceId: string): Promise<Device> {
  log.debug(`Validating device: ${deviceId}`);

  const deviceList = devices.list();
  const device = deviceList.find((d) => d.id === deviceId);

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
  const destinationPath = path.join(device.deviceInfo.mount, profile.romBasePath);

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
    const safeFilename = sanitizeFilename(destinationFilename);

    const destinationPath = path.join(
      device.deviceInfo.mount,
      profile.romBasePath,
      systemMapping.folderName,
      safeFilename
    );

    log.debug(`Processing ROM ${i + 1}/${filteredRoms.length}: ${rom.displayName}`);

    // Create destination directory if needed
    const destinationDir = path.dirname(destinationPath);
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

/**
 * Sanitizes a filename to be compatible with FAT32/exFAT filesystems.
 * Removes characters that are illegal on these filesystems: \ / : * ? " < > |
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[\\/:*?"<>|]/g, '');
}

/**
 * Removes macOS hidden files from a directory tree.
 * Cleans up .DS_Store, ._* AppleDouble files, and system directories.
 */
async function cleanMacOSHiddenFiles(dirPath: string): Promise<void> {
  log.debug(`Cleaning macOS hidden files from: ${dirPath}`);
  let filesRemoved = 0;

  async function cleanDirectory(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Remove macOS system directories
        if (
          entry.isDirectory() &&
          (entry.name === '.Spotlight-V100' ||
            entry.name === '.fseventsd' ||
            entry.name === '.Trashes' ||
            entry.name === '.TemporaryItems')
        ) {
          try {
            await fs.rm(fullPath, { recursive: true, force: true });
            filesRemoved++;
            log.debug(`Removed macOS system directory: ${fullPath}`);
          } catch (error) {
            log.warn(`Failed to remove ${fullPath}: ${(error as Error).message}`);
          }
          continue;
        }

        // Recursively clean subdirectories
        if (entry.isDirectory()) {
          await cleanDirectory(fullPath);
          continue;
        }

        // Remove macOS hidden files
        if (entry.isFile() && (entry.name === '.DS_Store' || entry.name.startsWith('._'))) {
          try {
            await fs.unlink(fullPath);
            filesRemoved++;
            log.debug(`Removed macOS hidden file: ${fullPath}`);
          } catch (error) {
            log.warn(`Failed to remove ${fullPath}: ${(error as Error).message}`);
          }
        }
      }
    } catch (error) {
      log.warn(`Failed to clean directory ${dir}: ${(error as Error).message}`);
    }
  }

  await cleanDirectory(dirPath);
  log.info(`Cleaned ${filesRemoved} macOS hidden files from ${dirPath}`);
}

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
