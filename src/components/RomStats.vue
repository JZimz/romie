<template>
  <div class="rom-stats">
    <template v-if="isFiltered">
      Showing {{ formattedCount }} of {{ formattedTotal }} {{ label }}
      <span v-if="size" class="rom-stats__size">({{ formattedSize }})</span>
    </template>
    <template v-else>
      {{ formattedTotal }} {{ label }}
      <span v-if="size" class="rom-stats__size">({{ formattedSize }})</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatBytes, formatNumber } from '@/utils/number.utils';

const props = withDefaults(
  defineProps<{
    total: number;
    filtered?: number;
    size?: number;
    label?: string;
  }>(),
  {
    label: 'ROMs',
  }
);

const isFiltered = computed(() => props.filtered !== undefined && props.filtered !== props.total);

const formattedCount = computed(() => formatNumber(props.filtered ?? 0));
const formattedTotal = computed(() => formatNumber(props.total));
const formattedSize = computed(() => formatBytes(props.size ?? 0));
</script>

<style lang="less" scoped>
.rom-stats {
  font-size: var(--font-size-sm);
  padding: var(--space-4) var(--space-12);
  padding-top: var(--space-2);

  &__size {
    color: var(--p-text-muted-color);
  }
}
</style>
