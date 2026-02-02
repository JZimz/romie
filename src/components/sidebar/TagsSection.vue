<template>
  <ul class="tags-section">
    <li v-for="item in items" :key="item.id">
      <RouterLink
        v-slot="{ isActive }"
        :to="item.route"
        class="tags-section__item"
        active-class="tags-section__item--active"
      >
        <Tag :severity="isActive ? 'contrast' : 'secondary'" :value="item.label"></Tag>
      </RouterLink>
    </li>
    <li v-if="items.length === 0" class="tags-section__empty">No tags yet</li>
  </ul>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import Tag from 'primevue/tag';

import type { RouteLocationRaw } from 'vue-router';

interface SidebarItem {
  id: string;
  label: string;
  route: RouteLocationRaw;
}

defineProps<{
  items: SidebarItem[];
}>();
</script>

<style scoped lang="less">
.tags-section {
  list-style: none;
  padding: 0 14px;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  &__item {
    padding: 0;
    margin: 0;
  }

  &__empty {
    font-size: var(--font-size-sm);
    color: var(--p-text-muted-color);
  }
}
</style>
