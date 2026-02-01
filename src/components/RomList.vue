<template>
  <VirtualScroller
    v-if="showScroller"
    :items="roms"
    :item-size="24"
    scroll-height="100%"
    class="rom-list"
  >
    <template #item="{ item: rom }">
      <RomListItem
        :id="rom.id"
        style="height: 24px"
        :name="rom.displayName"
        :system="rom.system"
        :region="rom.region"
        :size="rom.size"
        :is-active="romSelections.includes(rom.id)"
        :available="!!rom.filePathExists"
        @click="handleRomClick($event, rom)"
      />
    </template>
  </VirtualScroller>
  <div v-else class="rom-list rom-list--skeleton">
    <div v-for="i in skeletonRowCount" :key="i" class="rom-list__skeleton-row">
      <Skeleton :width="`${skeletonWidths[i - 1]}px`" height="24px" border-radius="8px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import VirtualScroller from 'primevue/virtualscroller';
import Skeleton from 'primevue/skeleton';
import RomListItem from './RomListItem.vue';

import type { Rom } from '@/types/rom';

const props = defineProps<{
  roms: Rom[];
  romSelections: string[];
  compact: boolean;
}>();
const emit = defineEmits<{
  (e: 'rom-selected', romSelections: string[]): void;
}>();

const showScroller = ref(false);
const skeletonRowCount = 15;
const skeletonWidths = [210, 330, 185, 275, 190, 245, 320, 205, 295, 180, 260, 340, 225, 305, 195];
onMounted(() => {
  // I hate this but PrimeVue VirtualScroller has issues if rendered
  // immediately inside a flex container with 100% height. nextTick
  // doesn't seem to help, so we use a small timeout.
  setTimeout(() => {
    showScroller.value = true;
  }, 250);
});

function toggleId(selections: string[], id: string): string[] {
  const idx = selections.indexOf(id);
  if (idx !== -1) {
    // Remove selection
    return [...selections.slice(0, idx), ...selections.slice(idx + 1)];
  } else {
    // Add
    return [...selections, id];
  }
}

function computeRangeSelection(selections: string[], roms: Rom[], clickedId: string): string[] {
  if (selections.length === 0) {
    return [clickedId];
  }

  const lastSelectedId = selections[selections.length - 1];
  const romIds = roms.map((r) => r.id);
  const startIdx = romIds.indexOf(lastSelectedId);
  const endIdx = romIds.indexOf(clickedId);

  if (startIdx !== -1 && endIdx !== -1) {
    const [from, to] = [startIdx, endIdx].sort((a, b) => a - b);
    return romIds.slice(from, to + 1);
  }

  return [clickedId];
}

function handleRomClick(event: MouseEvent, rom: Rom) {
  const romId = rom.id;
  const isToggle = event.ctrlKey || event.metaKey;
  const isRange = event.shiftKey;

  let newSelections: string[];

  if (isToggle) {
    newSelections = toggleId(props.romSelections, romId);
  } else if (isRange) {
    newSelections = computeRangeSelection(props.romSelections, props.roms, romId);
  } else {
    newSelections = [romId];
  }

  emit('rom-selected', newSelections);
}
</script>

<style lang="less" scoped>
.rom-list {
  height: 100%;
  overflow: auto;
  list-style: none;
  margin: 0;
  user-select: none;
  display: flex;
  flex-direction: column;
  gap: var(--p-list-gap);

  &--skeleton {
    padding: var(--space-4) var(--space-10);
  }

  &__skeleton-row {
    height: 24px;
    margin-bottom: var(--p-list-gap);
  }

  :deep(.p-virtualscroller-content) {
    padding-bottom: var(--space-8);
  }
}
</style>
