<template>
  <div class="rom-list-item-wrapper">
    <div class="rom-list-item" :class="{ 'rom-list-item--active': isActive }">
      <SystemBadge :code="system" />
      <div class="rom-list-item__content">
        <span class="rom-list-item__name">{{ name }}</span>
        <span class="rom-list-item__region">{{ region }}</span>
      </div>
      <div class="rom-list-item__actions"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SystemBadge from '@/components/SystemBadge.vue';

import type { SystemCode } from '@/types/system';

defineProps<{
  id: string;
  name: string;
  system: SystemCode;
  region: string;
  size: number;
  isActive: boolean;
}>();
</script>

<style scoped lang="less">
.rom-list-item-wrapper {
  padding: 0 var(--space-10);
}
.rom-list-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: var(--p-list-padding);
  border-radius: var(--p-list-option-border-radius);
  transition: background-color 0.2s ease-in-out;

  &:hover {
    cursor: pointer;
    background-color: var(--p-list-option-focus-background);
  }

  &--active {
    color: var(--p-list-option-selected-color);
    background-color: var(--p-list-option-selected-background);
  }

  &__content {
    flex-grow: 1;
    display: flex;
    align-items: center;
  }

  &__name {
    font-weight: 500;
    white-space: nowrap;
  }

  &__region {
    margin-left: 8px;
    font-size: var(--p-inputtext-sm-font-size);
    color: var(--p-text-muted-color);
  }

  &__actions {
    flex-shrink: 0;
    margin-left: auto;
  }
}
</style>
