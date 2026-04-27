<template>
  <div ref="containerRef" class="rom-grid">
    <VirtualScroller
      v-if="showScroller"
      :items="rows"
      :item-size="rowHeight"
      scroll-height="100%"
      class="rom-grid__scroller"
    >
      <template #item="{ item: row }">
        <div class="rom-grid__row" :style="{ height: rowHeight + 'px' }">
          <RomGridItem
            v-for="rom in row"
            :key="rom.id"
            :rom="rom"
            :item-size="itemSize"
            :is-active="romSelections.includes(rom.id)"
            :available="!!rom.filePathExists || !!rom.volumeDisconnected"
            @click="handleRomClick($event, rom)"
          />
        </div>
      </template>
    </VirtualScroller>
    <div v-else class="rom-grid__skeleton">
      <Skeleton
        v-for="i in skeletonCount"
        :key="i"
        class="rom-grid__skeleton-item"
        border-radius="var(--p-border-radius-md)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import VirtualScroller from 'primevue/virtualscroller';
import Skeleton from 'primevue/skeleton';
import RomGridItem from './RomGridItem.vue';

import type { Rom } from '@/types/rom';

const PADDING = 16;
const GAP = 12;
const TEXT_HEIGHT = 52; // title + badge below art card

const props = defineProps<{
  roms: Rom[];
  romSelections: string[];
  itemSize: number;
}>();

const emit = defineEmits<{
  (e: 'rom-selected', romSelections: string[]): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const showScroller = ref(false);
const skeletonCount = 24;

const itemsPerRow = computed(() =>
  Math.max(1, Math.floor((containerWidth.value - 2 * PADDING + GAP) / (props.itemSize + GAP)))
);

const rows = computed(() => {
  const result: Rom[][] = [];
  for (let i = 0; i < props.roms.length; i += itemsPerRow.value) {
    result.push(props.roms.slice(i, i + itemsPerRow.value));
  }
  return result;
});

const rowHeight = computed(() => props.itemSize + TEXT_HEIGHT + GAP);

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (!containerRef.value) return;
  resizeObserver = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    containerWidth.value = width;
    if (height > 0) showScroller.value = true;
  });
  resizeObserver.observe(containerRef.value);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});

function toggleId(selections: string[], id: string): string[] {
  const idx = selections.indexOf(id);
  return idx !== -1
    ? [...selections.slice(0, idx), ...selections.slice(idx + 1)]
    : [...selections, id];
}

function computeRangeSelection(selections: string[], roms: Rom[], clickedId: string): string[] {
  if (selections.length === 0) return [clickedId];
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
  const isToggle = event.ctrlKey || event.metaKey;
  const isRange = event.shiftKey;
  let newSelections: string[];

  if (isToggle) {
    newSelections = toggleId(props.romSelections, rom.id);
  } else if (isRange) {
    newSelections = computeRangeSelection(props.romSelections, props.roms, rom.id);
  } else {
    newSelections =
      props.romSelections.length === 1 && props.romSelections[0] === rom.id ? [] : [rom.id];
  }

  emit('rom-selected', newSelections);
}
</script>

<style lang="less" scoped>
.rom-grid {
  height: 100%;

  &__scroller {
    height: 100%;
  }

  &__row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 0 16px;
  }

  &__skeleton {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px 16px 16px;
    height: 100%;
    overflow: hidden;
    align-content: flex-start;
  }

  &__skeleton-item {
    width: 140px;
    height: 140px;
    flex-shrink: 0;
  }

  :deep(.p-virtualscroller-content) {
    padding-top: 12px;
    padding-bottom: 16px;
  }
}
</style>
