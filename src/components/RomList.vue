<template>
  <div
    ref="listContainer"
    class="rom-list"
    tabindex="0"
    role="listbox"
    aria-label="ROM list"
    @keydown="handleKeydown"
    @focus="hasFocus = true"
    @blur="hasFocus = false"
  >
    <VirtualScroller
      v-if="showScroller"
      ref="scrollerRef"
      :items="roms"
      :item-size="24"
      scroll-height="100%"
      class="rom-list__scroller"
    >
      <template #item="{ item: rom }">
        <RomListItem
          :id="rom.id"
          style="height: 24px"
          :name="rom.displayName"
          :system="rom.system"
          :region="rom.region"
          :size="rom.size"
          :date-added="rom.importedAt"
          :is-active="romSelections.includes(rom.id)"
          @click="handleRomClick($event, rom)"
        />
      </template>
    </VirtualScroller>
    <div v-else class="rom-list__skeleton">
      <div v-for="i in skeletonRowCount" :key="i" class="rom-list__skeleton-row">
        <Skeleton :width="`${skeletonWidths[i - 1]}px`" height="24px" border-radius="8px" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
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
const hasFocus = ref(false);
const skeletonRowCount = 15;
const skeletonWidths = [210, 330, 185, 275, 190, 245, 320, 205, 295, 180, 260, 340, 225, 305, 195];
const scrollerRef = ref<InstanceType<typeof VirtualScroller> | null>(null);
const listContainer = ref<HTMLElement | null>(null);

const jumpIndexMap = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {};
  props.roms.forEach((rom, index) => {
    const first = rom.displayName?.trim().charAt(0)?.toLowerCase();
    if (first && map[first] === undefined) {
      map[first] = index;
    }
  });
  return map;
});

const currentIndex = computed(() => {
  if (!props.romSelections.length) return -1;
  return props.roms.findIndex((rom) => rom.id === props.romSelections[0]);
});

onMounted(() => {
  // PrimeVue VirtualScroller needs a tick to measure height correctly inside flex layouts.
  setTimeout(() => {
    showScroller.value = true;
  }, 250);

  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});

function focusList() {
  listContainer.value?.focus();
}

function clampIndex(index: number) {
  if (!props.roms.length) return -1;
  return Math.min(Math.max(index, 0), props.roms.length - 1);
}

function selectIndex(index: number) {
  const clamped = clampIndex(index);
  if (clamped === -1) return;
  const rom = props.roms[clamped];
  emit('rom-selected', [rom.id]);
  scrollerRef.value?.scrollToIndex(clamped, 'auto');
}

watch(
  () => [props.roms.map((r) => r.id), props.romSelections.slice()],
  () => {
    const available = new Set(props.roms.map((r) => r.id));
    const validSelections = props.romSelections.filter((id) => available.has(id));

    if (validSelections.length !== props.romSelections.length) {
      if (!validSelections.length && props.roms.length) {
        emit('rom-selected', [props.roms[0].id]);
      } else {
        emit('rom-selected', validSelections);
      }
    }
  }
);

function handleKeydown(event: KeyboardEvent) {
  // Local handler when the list itself has focus.
  if (!hasFocus.value) return;
  handleNavigationKeys(event, { focusAfter: false });
}

function handleGlobalKeydown(event: KeyboardEvent) {
  // Allow arrow navigation even when an item is already highlighted but the list isn't focused.
  if (!props.romSelections.length) return;
  const target = event.target as HTMLElement | null;
  const tag = target?.tagName?.toLowerCase() || '';
  const isEditable = target?.isContentEditable;
  if (['input', 'textarea', 'select', 'option', 'button'].includes(tag) || isEditable) return;

  handleNavigationKeys(event, { focusAfter: true });
}

function handleNavigationKeys(event: KeyboardEvent, options: { focusAfter: boolean }) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const key = event.key.toLowerCase();
  const pageStep = 10;

  switch (key) {
    case 'arrowdown':
      event.preventDefault();
      if (options.focusAfter) focusList();
      selectIndex((currentIndex.value ?? -1) + 1);
      return;
    case 'arrowup':
      event.preventDefault();
      if (options.focusAfter) focusList();
      selectIndex((currentIndex.value ?? props.roms.length) - 1);
      return;
    case 'home':
      event.preventDefault();
      if (options.focusAfter) focusList();
      selectIndex(0);
      return;
    case 'end':
      event.preventDefault();
      if (options.focusAfter) focusList();
      selectIndex(props.roms.length - 1);
      return;
    case 'pageup':
      event.preventDefault();
      if (options.focusAfter) focusList();
      selectIndex((currentIndex.value ?? 0) - pageStep);
      return;
    case 'pagedown':
      event.preventDefault();
      if (options.focusAfter) focusList();
      selectIndex((currentIndex.value ?? 0) + pageStep);
      return;
    default:
      break;
  }

  if (key.length === 1 && /[a-z0-9]/.test(key)) {
    const targetIndex = jumpIndexMap.value[key];
    if (typeof targetIndex === 'number') {
      event.preventDefault();
      if (options.focusAfter) focusList();
      selectIndex(targetIndex);
    }
  }
}

defineExpose({ focusList });

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
  outline: none;
}

.rom-list__scroller {
  flex: 1;
  min-height: 0;

  :deep(.p-virtualscroller-content) {
    padding-bottom: var(--space-8);
  }
}

.rom-list__skeleton {
  padding: var(--space-4) var(--space-10);
}

.rom-list__skeleton-row {
  height: 24px;
  margin-bottom: var(--p-list-gap);
}
</style>
