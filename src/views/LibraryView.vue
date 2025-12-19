<template>
  <RomListLayout class="library-view" mode="all">
    <template #default="{ filteredRoms, loading, focusList }">
      <div class="library-view__content">
        <div class="library-view__summary">
          {{ librarySummary }}
        </div>
        <RomList
          ref="romListRef"
          class="library-view__list"
          :loading="loading"
          :roms="filteredRoms"
          :rom-selections="romSelections"
          :compact="false"
          @rom-selected="romSelections = $event"
        />
      </div>
    </template>
    <template #rom-details>
      <RomDetailView
        v-if="romSelections.length === 1"
        :rom-id="romSelections[0]"
        @delete="romSelections = []"
      />
      <RomActionView
        v-else-if="romSelections.length > 1"
        :rom-selections="romSelections"
        @delete="romSelections = []"
      />
    </template>
  </RomListLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRomStore } from '@/stores';
import RomListLayout from '@/layouts/RomListLayout.vue';
import RomDetailView from '@/views/RomDetailView.vue';
import RomActionView from '@/views/RomActionView.vue';
import RomList from '@/components/RomList.vue';
import { formatBytes, formatNumber } from '@/utils/number.utils';
import { pluralize } from '@/utils/string.utils';

const romStore = useRomStore();
const romSelections = ref<string[]>([]);

// TODO: Empty state: “Your ROM library is empty. Time to add some games!”
const librarySummary = computed(() => {
  const { totalSizeBytes, totalRoms, systemCounts } = romStore.stats;
  const totalSystems = Object.keys(systemCounts).length;

  return `You have a ${formatBytes(totalSizeBytes)} ROM library with ${formatNumber(totalRoms)} ${pluralize(totalRoms, 'ROM')} across ${formatNumber(totalSystems)} ${pluralize(totalSystems, 'system')}.`;
});
</script>

<style lang="less" scoped>
.library-view {
  &__content {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0; // allow the list to shrink inside flex parent
  }

  &__summary {
    font-size: var(--font-size-sm);
    color: var(--p-text-muted-color);
    padding: var(--space-4) var(--space-10);
    padding-top: var(--space-2);
  }

  &__list {
    flex: 1;
    min-height: 0;
  }
}
</style>
