import type { Rom } from '@/types/rom';

export type AchievementFilter = 'has-achievements' | 'no-achievements' | 'unverified' | null;
export type AvailabilityFilter = 'available' | 'missing' | 'disconnected' | null;

export const byQuery = (query: string) => (rom: Rom) =>
  !query || rom.displayName.toLowerCase().includes(query.toLowerCase());

export const bySystems = (systems: string[]) => (rom: Rom) =>
  !systems?.length || systems.includes(rom.system);

export const byRegions = (regions: string[]) => (rom: Rom) =>
  !regions?.length || regions.includes(rom.region);

export const byAchievements = (filter: AchievementFilter) => (rom: Rom) => {
  if (!filter) return true;
  switch (filter) {
    case 'has-achievements':
      return (rom.numAchievements ?? 0) > 0;
    case 'no-achievements':
      return rom.verified && (rom.numAchievements ?? 0) === 0;
    case 'unverified':
      return !rom.verified;
  }
};

export const byAvailability = (filter: AvailabilityFilter) => (rom: Rom) => {
  if (!filter) return true;
  if (filter === 'disconnected') return !!rom.volumeDisconnected;
  if (filter === 'available') return !!rom.filePathExists;
  if (filter === 'missing') return !rom.filePathExists && !rom.volumeDisconnected;

  return false;
};

export const combineFilters = (...predicates: Array<(rom: Rom) => boolean>) => {
  return (rom: Rom) => predicates.every((p) => p(rom));
};
