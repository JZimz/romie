<template>
  <RomListLayout class="tag-view" :tag="tag" mode="tag">
    <template #default="{ filteredRoms, totalRoms, filteredSize, loading }">
      <div class="tag-view__content">
        <RomStats
          :filtered="filteredRoms.length"
          :total="totalRoms"
          :size="filteredSize"
          :label="statsLabel"
        />
        <RomList
          class="tag-view__list"
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
import RomListLayout from '@/layouts/RomListLayout.vue';
import RomDetailView from '@/views/RomDetailView.vue';
import RomActionView from '@/views/RomActionView.vue';
import RomList from '@/components/RomList.vue';
import RomStats from '@/components/RomStats.vue';

const props = defineProps<{ tag: string }>();
const romSelections = ref<string[]>([]);
const statsLabel = computed(() => `ROMs tagged "${props.tag}"`);
</script>

<style lang="less" scoped>
.tag-view {
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
