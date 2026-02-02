<template>
  <ul class="sidebar-section">
    <li v-for="item in items" :key="item.id">
      <RouterLink
        :to="item.route"
        class="sidebar-section__item"
        active-class="sidebar-section__item--active"
      >
        <span v-if="item.icon" class="sidebar-section__icon">
          <i :class="item.icon"></i>
        </span>
        <span class="sidebar-section__label">{{ item.label }}</span>
        <Badge
          v-if="item.count"
          :value="formatCompactNumber(item.count)"
          severity="secondary"
          class="sidebar-section__count"
        />
      </RouterLink>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import Badge from 'primevue/badge';
import { formatCompactNumber } from '@/utils/number.utils';

import type { RouteLocationRaw } from 'vue-router';

interface SidebarItem {
  id: string;
  label: string;
  count?: number;
  icon?: string;
  route: RouteLocationRaw;
}

defineProps<{
  items: SidebarItem[];
}>();
</script>

<style scoped lang="less">
.sidebar-section {
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
  }

  &__icon {
    margin-right: 8px;
    opacity: 0.7;
    font-size: 12px;
    color: var(--p-text-muted-color);
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
