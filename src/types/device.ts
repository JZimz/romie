/**
 * Represents a storage device on the system (E.g. SD card, USB drive, etc).
 */
export interface StorageDevice {
  type: string;
  fsType: string;
  mount: string;
  size: number;
  uuid: string;
  label: string;
  removable: boolean;
  protocol: string;
}

/**
 * Represents a device chosen for ROM synchronization in ROMie.
 */
export interface Device {
  id?: string;
  name: string;
  profileId: string;
  deviceInfo: StorageDevice;
  createdAt?: number;
  updatedAt?: number;
  lastSeenAt?: number;
  lastSyncedAt?: number;
  /** @deprecated Use `lastSeenAt` instead */
  addedAt?: number;
}

export interface BiosFile {
  filename: string; // e.g., "gba_bios.bin"
  required: boolean; // true if required, false if optional
  description?: string;
}
