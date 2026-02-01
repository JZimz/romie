<template>
  <div class="rom-list-layout">
    <AppToolbar
      :unavailable-count="unavailableCount"
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
          v-if="hasUnavailableRoms || filterByAvailability !== null"
          id="availability_filter"
          v-model="filterByAvailability"
          class="rom-list-layout__availability-filter"
          :options="[
            { label: 'Available', value: 'available' },
            { label: 'Unavailable', value: 'unavailable' },
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
      <div class="rom-list-layout__content-detail">
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
const filterBySystem = ref([]);
const filterByRegion = ref([]);
const filterByRA = ref(null);
const filterByAvailability = ref<string | null>(null);

const unavailableRoms = computed(() => romStore.roms.filter((rom) => !rom.filePathExists));
const unavailableCount = computed(() => unavailableRoms.value.length);
const hasUnavailableRoms = computed(() => unavailableCount.value > 0);

const searchPlaceholder = computed(() => {
  if (props.mode === 'tag' && props.tag) {
    return `Search in ${props.tag}`;
  }

  if (props.mode === 'favorites') {
    return `Search in your favorites`;
  }

  return `Search in your library`;
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
  const query = searchQuery.value.toLowerCase().trim();
  const selectedRegions = filterByRegion.value;
  const selectedSystems = filterBySystem.value;
  let size = 0;

  const roms = sortedRoms.value.filter((rom) => {
    const { displayName, system, region } = rom;

    const hasSystemMatch =
      !selectedSystems?.length || selectedSystems.some((value) => value === system);
    const hasRegionMatch =
      !selectedRegions?.length || selectedRegions.some((value) => value === region);
    const hasQueryMatch = !query || displayName.toLowerCase().includes(query);
    const hasRAMatch =
      !filterByRA.value ||
      (filterByRA.value === 'has-achievements' && (rom.numAchievements ?? 0) > 0) ||
      (filterByRA.value === 'no-achievements' &&
        rom.verified &&
        (rom.numAchievements ?? 0) === 0) ||
      (filterByRA.value === 'unverified' && !rom.verified);
    const hasAvailabilityMatch =
      !filterByAvailability.value ||
      (filterByAvailability.value === 'unavailable' && !rom.filePathExists) ||
      (filterByAvailability.value === 'available' && rom.filePathExists);
    const shouldInclude =
      hasSystemMatch && hasRegionMatch && hasQueryMatch && hasRAMatch && hasAvailabilityMatch;

    if (shouldInclude) {
      size += rom.size ?? 0;
    }

    return shouldInclude;
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
  filterByAvailability.value = 'unavailable';
}

async function removeUnavailableRoms() {
  const idsToRemove = unavailableRoms.value.map(({ id }) => id);

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
