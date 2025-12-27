<template>
  <RomListLayout class="system-view" :system="system" mode="system">
    <template #default="{ filteredRoms, totalRoms, filteredSize, loading }">
      <div class="system-view__content">
        <RomStats
          :filtered="filteredRoms.length"
          :total="totalRoms"
          :size="filteredSize"
          :label="statsLabel"
        />
        <RomList
          class="system-view__list"
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
import { computed, ref } from 'vue';
import RomListLayout from '@/layouts/RomListLayout.vue';
import RomDetailView from '@/views/RomDetailView.vue';
import RomActionView from '@/views/RomActionView.vue';
import RomList from '@/components/RomList.vue';
import RomStats from '@/components/RomStats.vue';
import { getSystemDisplayName } from '@/utils/systems';

import type { SystemCode } from '@/types/system';

const props = defineProps<{ system: SystemCode }>();
const romSelections = ref<string[]>([]);
const statsLabel = computed(() => `${getSystemDisplayName(props.system)} ROMs`);
</script>

<style lang="less" scoped>
.system-view {
  &__content {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  &__list {
    flex: 1;
    min-height: 0;
  }
}
</style>
