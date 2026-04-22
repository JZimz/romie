<template>
  <div class="theme-swatch">
    <div
      class="theme-swatch__preview"
      :style="{
        background: bgColor,
        borderColor: borderColor,
      }"
    >
      <div class="theme-swatch__accent" :style="{ background: accentColor }" />
    </div>
    <span class="theme-swatch__label">{{ label }}</span>
    <span v-if="badge" class="theme-swatch__badge" :data-mode="badge">{{ badge }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { colorThemes, DEFAULT_THEME_ID } from '@/themes/colorThemes';

const props = defineProps<{
  themeId: string;
  mode: 'light' | 'dark';
}>();

const theme = computed(() => colorThemes.find((t) => t.id === props.themeId));

const colors = computed(() => (props.mode === 'dark' ? theme.value?.dark : theme.value?.light));

const bgColor = computed(() => {
  if (!colors.value) return props.mode === 'dark' ? '#1a1a1a' : '#ffffff';
  return colors.value.surface[0];
});

const accentColor = computed(() => {
  if (!colors.value) return '#6366f1';
  return colors.value.primary[400];
});

const borderColor = computed(() => {
  if (!colors.value) return 'var(--p-content-border-color)';
  return colors.value.surface[200];
});

const label = computed(() => {
  if (props.themeId === DEFAULT_THEME_ID) return 'Default';
  return theme.value?.label ?? props.themeId;
});

const badge = computed(() => {
  if (props.themeId === DEFAULT_THEME_ID || !theme.value) return null;
  return theme.value.preferredMode === props.mode ? null : theme.value.preferredMode;
});
</script>

<style scoped lang="less">
.theme-swatch {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &__preview {
    flex-shrink: 0;
    width: 2rem;
    height: 1.25rem;
    border-radius: 0.25rem;
    border: 1px solid;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 0.25rem;
    overflow: hidden;
  }

  &__accent {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__label {
    font-size: 0.875rem;
    color: var(--p-text-color);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__badge {
    font-size: 0.7rem;
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    text-transform: capitalize;
    flex-shrink: 0;

    &[data-mode='dark'] {
      background: color-mix(in srgb, var(--p-surface-600) 20%, transparent);
      color: var(--p-text-muted-color);
    }

    &[data-mode='light'] {
      background: color-mix(in srgb, var(--p-surface-400) 20%, transparent);
      color: var(--p-text-muted-color);
    }
  }
}
</style>
