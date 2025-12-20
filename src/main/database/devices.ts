import { v4 as uuid } from 'uuid';
import logger from 'electron-log/main';
import { getDatabase } from './connection';
import { getDeviceProfileById } from './deviceProfiles';
import { AppError } from '@/errors';

import type { Device } from '@/types/device';

const log = logger.scope('db:devices');

interface DeviceRow {
  id: string;
  name: string;
  profileId: string;
  deviceInfo: string; // Stored as JSON string
  createdAt: number;
  updatedAt: number;
}

export function addDevice(candidate: Device): Device {
  const db = getDatabase();
  const now = Date.now();
  const { name, profileId, deviceInfo } = candidate;

  log.debug(`Adding device: ${name}`);

  if (!deviceInfo.mount) {
    throw AppError.simple('No mount path detected.');
  }

  if (!deviceInfo.size || deviceInfo.size <= 0) {
    throw AppError.simple('Invalid device size.');
  }

  if (!profileId) {
    throw AppError.simple('Missing device profile.');
  }

  // Validate profile exists (built-in or custom)
  const profile = getDeviceProfileById(profileId);
  if (!profile) {
    throw AppError.simple(`Device profile "${profileId}" not found.`);
  }

  const id = uuid();
  const result = db
    .prepare(
      `
    INSERT INTO devices (id, name, profileId, deviceInfo, createdAt, updatedAt)
    VALUES (@id, @name, @profileId, @deviceInfo, @createdAt, @updatedAt)
    RETURNING *
  `
    )
    .get({
      id,
      name,
      profileId,
      deviceInfo: JSON.stringify(deviceInfo),
      createdAt: now,
      updatedAt: now,
    }) as DeviceRow;

  log.info(`Device added: ${name} (${id})`);

  return rowToDevice(result);
}

export function listDevices(): Device[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM devices').all() as DeviceRow[];

  return rows.map((row) => rowToDevice(row));
}

// Helper: Convert DB row to Device type
function rowToDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    name: row.name,
    profileId: row.profileId,
    deviceInfo: JSON.parse(row.deviceInfo),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
