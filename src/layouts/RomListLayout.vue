<template>
  <div class="rom-list-layout">
    <AppToolbar>
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
            <InputIcon>
              <i class="pi pi-search" />
            </InputIcon>
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
        <slot :filtered-roms="filteredRoms" :loading="romStore.loading"></slot>
      </div>
      <div class="rom-list-layout__content-detail">
        <slot name="rom-details"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import FloatLabel from 'primevue/floatlabel';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
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

const romStore = useRomStore();
const searchQuery = ref('');
const showFilters = ref(false);
const filterBySystem = ref([]);
const filterByRegion = ref([]);
const filterByRA = ref(null);

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

const sortedRoms = computed(() => {
  return [...romStore.roms].sort((a, b) => a.displayName.localeCompare(b.displayName));
});

const filteredRoms = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  const selectedRegions = filterByRegion.value;
  const selectedSystems = props.mode === 'system' ? [props.system] : filterBySystem.value;
  const filterTag = props.mode === 'tag' ? props.tag : null;

  return sortedRoms.value.filter((rom) => {
    const { displayName, system, region, tags = [] } = rom;

    const hasSystemMatch =
      !selectedSystems?.length || selectedSystems.some((value) => value === system);
    const hasRegionMatch =
      !selectedRegions?.length || selectedRegions.some((value) => value === region);
    const hasQueryMatch = !query || displayName.toLowerCase().includes(query);

    const hasTagMatch = !filterTag || (tags && tags.includes(filterTag));
    const hasFavoritesMatch = props.mode === 'favorites' ? rom.favorite : true;
    const hasRAMatch =
      !filterByRA.value ||
      (filterByRA.value === 'has-achievements' && (rom.numAchievements ?? 0) > 0) ||
      (filterByRA.value === 'no-achievements' &&
        rom.verified &&
        (rom.numAchievements ?? 0) === 0) ||
      (filterByRA.value === 'unverified' && !rom.verified);

    return (
      hasSystemMatch &&
      hasRegionMatch &&
      hasQueryMatch &&
      hasTagMatch &&
      hasRAMatch &&
      hasFavoritesMatch
    );
  });
});

function toggleFilters() {
  if (showFilters.value) {
    filterByRA.value = null;
    filterByRegion.value = [];
    filterBySystem.value = [];
  }
  showFilters.value = !showFilters.value;
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
