<template>
  <div class="rom-list-layout">
    <AppToolbar
      :unavailable-count="missingCount"
      @filter-unavailable="showUnavailableFilter"
      @remove-unavailable="removeUnavailableRoms"
    >
      <template #actions>
        <div class="rom-list-layout__header-actions">
          <!-- TODO: Add this back once grid view is implemented
        <SelectButton
          v-model="listMode"
          :options="listModeOptions"
          optionValue="value"
          dataKey="value"
          size="small"
          aria-labelledby="custom"
        >
          <template #option="slotProps">
            <i :class="slotProps.option.icon"></i>
          </template>
        </SelectButton> -->
        </div>
      </template>
      <template #search>
        <div class="rom-list-layout__search">
          <IconField class="rom-list-layout__header-item">
            <InputIcon class="pi pi-search" />
            <InputText v-model="searchQuery" size="small" :placeholder="searchPlaceholder" />
          </IconField>
          <Button
            class="rom-list-layout__header-item"
            :icon="`pi pi-filter${showFilters ? '-slash' : ''}`"
            size="small"
            severity="secondary"
            aria-label="Filters"
            @click="toggleFilters"
          />
        </div>
      </template>
    </AppToolbar>
    <div v-if="showFilters" class="rom-list-layout__filters">
      <FloatLabel variant="on">
        <Select
          v-if="hasMissingRoms || hasDisconnectedRoms || filterByAvailability !== null"
          id="availability_filter"
          v-model="filterByAvailability"
          class="rom-list-layout__availability-filter"
          :options="[
            { label: 'Available', value: 'available' },
            { label: 'Missing', value: 'missing' },
            { label: 'Disconnected', value: 'disconnected' },
          ]"
          option-label="label"
          option-value="value"
          show-clear
          size="small"
        />
        <label for="availability_filter">Status</label>
      </FloatLabel>
      <FloatLabel variant="on">
        <Select
          id="achievements_filter"
          v-model="filterByRA"
          :options="[
            { label: 'Available', value: 'has-achievements' },
            { label: 'None', value: 'no-achievements' },
            { label: 'Not Supported', value: 'unverified' },
          ]"
          option-label="label"
          option-value="value"
          show-clear
          size="small"
        />
        <label for="achievements_filter">RA</label>
      </FloatLabel>
      <FloatLabel variant="on">
        <MultiSelect
          id="system_filter"
          v-model="filterBySystem"
          :options="filterSystems"
          :filled="true"
          :disabled="props.mode === 'system'"
          option-label="label"
          option-value="value"
          size="small"
        />
        <label for="system_filter">System</label>
      </FloatLabel>
      <FloatLabel variant="on">
        <MultiSelect
          id="region_filter"
          v-model="filterByRegion"
          :options="filterRegions"
          :filled="true"
          option-label="label"
          option-value="value"
          size="small"
        />
        <label for="region_filter">Region</label>
      </FloatLabel>
    </div>
    <div class="rom-list-layout__content">
      <div class="rom-list-layout__content-list">
        <slot
          :filtered-roms="filteredRoms.roms"
          :filtered-size="filteredRoms.size"
          :total-roms="sortedRoms.length"
          :loading="romStore.loading"
        ></slot>
      </div>
      <div v-if="$slots['rom-details']" class="rom-list-layout__content-detail">
        <slot name="rom-details"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import log from 'electron-log/renderer';
import Button from 'primevue/button';
import FloatLabel from 'primevue/floatlabel';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import { useRomStore } from '@/stores';
import AppToolbar from '@/components/AppToolbar.vue';
import { getSystemDisplayName } from '@/utils/systems';
import {
  byQuery,
  bySystems,
  byRegions,
  byAchievements,
  byAvailability,
  combineFilters,
  type AchievementFilter,
  type AvailabilityFilter,
} from '@/utils/romFilters';

import type { Rom } from '@/types/rom';
import type { SystemCode } from '@/types/system';

const props = defineProps<{
  mode: 'all' | 'tag' | 'favorites' | 'system';
  system?: SystemCode;
  tag?: string;
}>();

const toast = useToast();
const romStore = useRomStore();
const searchQuery = ref('');
const showFilters = ref(false);
const filterBySystem = ref<string[]>([]);
const filterByRegion = ref<string[]>([]);
const filterByRA = ref<AchievementFilter>(null);
const filterByAvailability = ref<AvailabilityFilter>(null);

const missingRoms = computed(() =>
  romStore.roms.filter((rom) => !rom.filePathExists && !rom.volumeDisconnected)
);
const missingCount = computed(() => missingRoms.value.length);
const hasMissingRoms = computed(() => missingCount.value > 0);
const hasDisconnectedRoms = computed(() =>
  romStore.roms.some(({ volumeDisconnected }) => volumeDisconnected)
);

const searchPlaceholder = computed(() => {
  switch (props.mode) {
    case 'tag':
      return props.tag ? `Search ${props.tag}` : 'Search your library';
    case 'favorites':
      return 'Search your favorites';
    case 'system':
      return props.system ? `Search ${getSystemDisplayName(props.system)}` : 'Search your library';
    default:
      return 'Search your library';
  }
});

const filterSystems = computed(() => {
  const systems = getUniqueRomValues('system');

  return systems
    .filter((system) => !!system)
    .map((system) => ({
      value: system,
      label: getSystemDisplayName(system),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const filterRegions = computed(() => {
  const regions = getUniqueRomValues('region');

  return regions
    .filter(Boolean)
    .map((region) => ({
      value: region,
      label: region,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

const romsForMode = computed(() => {
  if (props.mode === 'favorites') {
    return romStore.roms.filter((rom) => rom.favorite);
  }

  if (props.mode === 'system' && props.system) {
    return romStore.roms.filter((rom) => rom.system === props.system);
  }

  if (props.mode === 'tag') {
    const tag = props.tag;
    if (!tag) return romStore.roms;
    return romStore.roms.filter((rom) => (rom.tags || []).includes(tag));
  }

  return romStore.roms;
});

// TODO: Consider doing sort in the database query instead.
const sortedRoms = computed(() => {
  return [...romsForMode.value].sort((a, b) => a.displayName.localeCompare(b.displayName));
});

const filteredRoms = computed(() => {
  const predicate = combineFilters(
    byQuery(searchQuery.value.trim()),
    bySystems(filterBySystem.value),
    byRegions(filterByRegion.value),
    byAchievements(filterByRA.value),
    byAvailability(filterByAvailability.value)
  );

  let size = 0;
  const roms = sortedRoms.value.filter((rom) => {
    const matches = predicate(rom);
    if (matches) size += rom.size ?? 0;
    return matches;
  });

  return { roms, size };
});

function toggleFilters() {
  if (showFilters.value) {
    filterByRA.value = null;
    filterByRegion.value = [];
    filterBySystem.value = [];
    filterByAvailability.value = null;
  }
  showFilters.value = !showFilters.value;
}

function showUnavailableFilter() {
  showFilters.value = true;
  filterByAvailability.value = 'missing';
}

async function removeUnavailableRoms() {
  const idsToRemove = missingRoms.value.map(({ id }) => id);

  try {
    await romStore.removeRoms(idsToRemove);
    filterByAvailability.value = null;
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Unavailable ROMs removed.',
      life: 3000,
    });
  } catch (err) {
    log.error('Failed to remove roms', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to remove ROMs.',
    });
  }
}

function getUniqueRomValues<T extends keyof Rom>(field: T) {
  return Array.from(new Set(romStore.roms.map((rom) => rom[field]).filter(Boolean)));
}
</script>

<style lang="less" scoped>
.rom-list-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;

  &__search {
    display: flex;
    align-items: center;
    gap: 8px;

    :deep(.p-inputicon) {
      z-index: calc(var(--z-index-ui-elements) + 1);
    }
  }

  &__filters {
    padding: 4px 16px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  &__availability-filter {
    min-width: 85px;
  }

  &__content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;

    &-list {
      flex: 1;
      min-width: 0;
    }

    &-detail {
      width: clamp(320px, 28%, 520px);
      flex-shrink: 0;
    }
  }

  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 1.2rem;
  }
}
</style>
