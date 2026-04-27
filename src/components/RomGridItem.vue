<template>
  <div
    class="rom-grid-item"
    :class="{ 'rom-grid-item--unavailable': !available }"
    :style="{
      width: itemSize + 'px',
      '--system-color': systemColor,
      '--item-size': itemSize + 'px',
    }"
    @click="$emit('click', $event)"
  >
    <div
      class="rom-grid-item__art"
      :class="{ 'rom-grid-item--active': isActive }"
      :style="{ width: itemSize + 'px', height: itemSize + 'px' }"
    >
      <img
        v-if="artworkUrl"
        :src="artworkUrl"
        :alt="rom.displayName"
        class="rom-grid-item__image"
        loading="lazy"
        decoding="async"
      />
      <span v-else class="rom-grid-item__watermark">{{ abbr }}</span>
      <i
        v-if="!available"
        v-tooltip.top="'File not found'"
        class="pi pi-exclamation-circle rom-grid-item__warning"
      />
    </div>
    <div class="rom-grid-item__info">
      <span class="rom-grid-item__name">{{ rom.displayName }}</span>
      <span class="rom-grid-item__system">{{ systemName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getSystemColor } from '@/utils/system.utils';
import { getSystemAbbreviation, getSystemDisplayName } from '@/utils/systems';
import { useArtworkCache, artworkVersion } from '@/composables/useArtworkCache';
import type { Rom } from '@/types/rom';

const props = withDefaults(
  defineProps<{
    rom: Rom;
    isActive: boolean;
    itemSize: number;
    available?: boolean;
  }>(),
  { available: true }
);

defineEmits<{ (e: 'click', event: MouseEvent): void }>();

const systemColor = computed(() => getSystemColor(props.rom.system));
const abbr = computed(() => getSystemAbbreviation(props.rom.system));
const systemName = computed(() => getSystemDisplayName(props.rom.system));

const artworkUrl = ref<string | null>(null);
const { resolve } = useArtworkCache();

watch(
  [() => props.rom.id, artworkVersion],
  async ([id]) => {
    artworkUrl.value = await resolve(id);
  },
  { immediate: true }
);
</script>

<style scoped lang="less">
.rom-grid-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s ease;

  &--unavailable {
    opacity: 0.45;
  }

  &__art {
    position: relative;
    border-radius: var(--p-border-radius-md);
    overflow: hidden;
    background: var(--p-surface-100);
    border: 2px solid transparent;

    @media (prefers-color-scheme: dark) {
      background: var(--p-surface-800);
    }
    transition: border-color 0.15s ease;
    flex-shrink: 0;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--system-color);
      opacity: 0.14;
      pointer-events: none;
      z-index: 1;
    }

    &:hover {
      border-color: var(--p-surface-400);
    }

    &.rom-grid-item--active {
      border-color: var(--p-primary-color) !important;
    }
  }

  &__image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: calc(var(--item-size) * 0.3);
    font-weight: 900;
    color: var(--system-color);
    opacity: 0.2;
    letter-spacing: -0.03em;
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 0 2px;
  }

  &__name {
    font-size: 0.86rem;
    font-weight: 600;
    color: var(--p-text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.2;
  }

  &__system {
    font-size: 0.75rem;
    color: var(--p-text-muted-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__warning {
    position: absolute;
    top: 4px;
    right: 4px;
    color: var(--p-yellow-500);
    font-size: 0.8rem;
    background: rgba(0, 0, 0, 0.45);
    border-radius: 50%;
    padding: 2px;
  }
}
</style>
