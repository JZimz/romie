// ROM operations
export {
  addRom,
  getRomById,
  listRoms,
  listRomsByTags,
  updateRom,
  removeRomById,
  getRomStats,
} from './roms';

// Settings operations
export { getAppSettings, updateAppSettings } from './appSettings';

// Integration operations
export {
  addRetroAchievementsConfig,
  getRetroAchievementsConfig,
  removeRetroAchievementsConfig,
} from './integrations';

// Device profile operations
export { listDeviceProfiles, getDeviceProfileById, addDeviceProfile } from './deviceProfiles';

// Devices
export { addDevice, listDevices } from './devices';

// Database management
export { getDatabase, closeDatabase } from './connection';
