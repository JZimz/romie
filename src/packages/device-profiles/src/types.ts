// TODO: Fix this. Obviously bad if we ever want to expose this as it's
// own package.
import { SystemCode } from '@/types/system';

export interface SystemMapping {
  folderName: string;
  supportedFormats: string[];
}

export interface ArtworkConfig {
  enabled: boolean;
  pathPattern: string;
  supportedFormats: string[];
  maxWidth: number;
  maxHeight: number;
}

export interface DeviceSystemProfile {
  folderName: string; // e.g., "FC" for NES, "GB" for Game Boy
  supportedFormats: string[]; // e.g., [".nes", ".zip", ".7z"]
  emulators?: string[]; // Available emulator cores
  specialRequirements?: string; // e.g., "ROMs must contain headers"
}

export interface DeviceProfile {
  id: string;
  name: string;
  romBasePath: string; // e.g., "/Roms/"
  biosBasePath?: string; // e.g., "/BIOS/"
  artworkConfig?: ArtworkConfig;
  systemMappings: Partial<Record<SystemCode, DeviceSystemProfile>>;
  isBuiltIn?: boolean;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  version?: number;

  /** @deprecated Use `updatedAt` instead */
  lastModified?: number;
}

export type DeviceProfileDraft = Omit<DeviceProfile, 'id'>;
