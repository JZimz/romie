import { defineStore } from 'pinia';
import log from 'electron-log/renderer';
import type { GameInfoAndUserProgress } from '@retroachievements/api';
import type { Rom, RomDatabaseStats } from '@/types/rom';
import type { RomImportResult } from '@/types/electron-api';

interface RomState {
  roms: Rom[];
  /* Extended metadata about the ROM pull from RA available for verified ROMs */
  romMetadata: Record<string, GameInfoAndUserProgress | null>;
  stats: RomDatabaseStats;
  loading: boolean;
  error: string | null;
  selectedRom: Rom | null;
}

export const useRomStore = defineStore('roms', {
  state: (): RomState => ({
    roms: [],
    romMetadata: {},
    stats: {
      totalRoms: 0,
      totalSizeBytes: 0,
      systemCounts: {},
      tagStats: {},
    },
    loading: false,
    error: null,
    selectedRom: null,
  }),

  getters: {
    getRomById: (state) => (id: string) => state.roms.find((rom) => rom.id === id),
  },

  actions: {
    async loadStats() {
      log.info('Loading rom stats..');

      try {
        this.stats = await window.rom.stats();
        log.info('Loaded rom stats');
      } catch (error) {
        log.error(error);
      }
    },
    async loadRoms() {
      log.info('Loading rom data..');
      this.loading = true;

      try {
        this.roms = await window.rom.list();
      } catch (error) {
        log.error(error);
      } finally {
        this.loading = false;
      }
    },
    async loadMetadata(romId: string): Promise<GameInfoAndUserProgress | null> {
      log.debug('Loading rom metadata..');

      // TODO: Add cache invalidation strategy
      if (this.romMetadata[romId] !== undefined) {
        log.debug(`Rom metadata cache hit for ${romId}`);

        return this.romMetadata[romId];
      }

      try {
        const rom = this.getRomById(romId);
        // Validate we have a verified ROM with a hash since these are the only ones
        // that can be looked up on RA
        if (!rom?.verified || !rom?.ramd5) {
          log.warn(`Rom ${romId} not eligible for extended metadata`);
          this.romMetadata[romId] = null;

          return null;
        }

        const romMetadata = await window.ra.getGameInfoAndUserProgress(rom.ramd5);
        this.romMetadata[romId] = romMetadata;
        log.info('Loaded extended ROM metadata');

        return romMetadata;
      } catch (error) {
        log.error(error);
        throw error;
      }
    },
    async removeRoms(ids: string[]) {
      if (ids.length === 0) return;
      log.info(`Removing ${ids.length} ROMs`);
      this.loading = true;

      try {
        await window.rom.remove([...ids]);
        await this.loadRoms();
        await this.loadStats();
      } catch (error) {
        log.error(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async updateRom(id: string, romUpdate: Partial<Rom>) {
      log.info(`Updating ${id}`, romUpdate);
      this.loading = true;

      try {
        await window.rom.update(id, romUpdate);
        await this.loadRoms();
        await this.loadStats();
      } catch (error) {
        log.error(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async scanRomDir(): Promise<RomImportResult> {
      log.info('Initiating rom scan..');
      const scanResults = await window.rom.scan();
      await this.loadRoms();
      await this.loadStats();

      return scanResults;
    },
    async refreshRomAvailability() {
      log.info('Refreshing rom availability..');
      this.loading = true;

      try {
        await window.rom.refresh();
        await this.loadRoms();
        await this.loadStats();
      } catch (error) {
        log.error(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
