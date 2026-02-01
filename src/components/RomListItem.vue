<template>
  <div class="rom-list-item-wrapper">
    <div
      class="rom-list-item"
      :class="{
        'rom-list-item--active': isActive,
        'rom-list-item--unavailable': !available,
      }"
    >
      <SystemBadge :code="system" />
      <div class="rom-list-item__content">
        <span class="rom-list-item__name">{{ name }}</span>
        <span class="rom-list-item__region">{{ region }}</span>
        <i
          v-if="!available"
          v-tooltip.top="'File not found'"
          class="pi pi-exclamation-circle rom-list-item__warning"
        />
      </div>
      <div class="rom-list-item__actions"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SystemBadge from '@/components/SystemBadge.vue';

import type { SystemCode } from '@/types/system';

withDefaults(
  defineProps<{
    id: string;
    name: string;
    system: SystemCode;
    region: string;
    size: number;
    isActive: boolean;
    available?: boolean;
  }>(),
  {
    available: true,
  }
);
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

  &__warning {
    margin-left: 6px;
    color: var(--p-yellow-600);
    font-size: 0.75rem;
  }

  &--unavailable {
    opacity: 0.5;

    .rom-list-item__name {
      color: var(--p-text-muted-color);
    }
  }
}
</style>
