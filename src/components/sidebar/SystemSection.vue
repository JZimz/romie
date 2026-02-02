<template>
  <draggable
    v-model="draggableItems"
    tag="ul"
    class="system-section"
    item-key="id"
    :animation="150"
    ghost-class="system-section__item--ghost"
    drag-class="system-section__item--drag"
    @start="isDragging = true"
    @end="handleDragEnd"
  >
    <template #item="{ element: item }">
      <li>
        <RouterLink
          :to="item.route"
          class="system-section__item"
          active-class="system-section__item--active"
        >
          <span class="system-section__label">{{ item.label }}</span>
          <Badge
            v-if="item.count"
            :value="formatCompactNumber(item.count)"
            severity="secondary"
            class="system-section__count"
          />
        </RouterLink>
      </li>
    </template>
  </draggable>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import draggable from 'vuedraggable';
import Badge from 'primevue/badge';
import { formatCompactNumber } from '@/utils/number.utils';

import type { RouteLocationRaw } from 'vue-router';

interface SidebarItem {
  id: string;
  label: string;
  count?: number;
  route: RouteLocationRaw;
}

const props = defineProps<{
  items: SidebarItem[];
}>();

const emit = defineEmits<{
  reorder: [ids: string[]];
}>();

const draggableItems = ref<SidebarItem[]>([]);
const isDragging = ref(false);

watch(
  () => props.items,
  (newItems) => {
    if (!isDragging.value) {
      draggableItems.value = [...newItems];
    }
  },
  { immediate: true }
);

function handleDragEnd() {
  isDragging.value = false;
  const newOrder = draggableItems.value.map((item) => item.id);
  emit('reorder', newOrder);
}
</script>

<style scoped lang="less">
.system-section {
  list-style: none;
  padding: 0;
  margin: 0;

  &__item {
    display: flex;
    align-items: center;
    padding: 6px 16px;
    cursor: pointer;
    border-radius: 6px;
    margin: 0 8px;
    transition: all 0.15s ease;
    line-height: 1.4;
    text-decoration: none;
    color: inherit;

    &:hover,
    &:focus {
      background: var(--p-navigation-item-focus-background);
      color: var(--p-navigation-item-focus-color);
    }

    &--active {
      background: var(--p-navigation-item-active-background);
      color: var(--p-navigation-item-active-color);
    }

    &--ghost {
      opacity: 0.5;
      background: var(--p-primary-color);
    }

    &--drag {
      background: var(--p-content-background);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
  }

  &__label {
    flex: 1;
    font-weight: 400;
  }

  &__count {
    font-size: 11px;
    opacity: 0.7;
    font-weight: 500;
    margin-left: auto;
  }
}
</style>
