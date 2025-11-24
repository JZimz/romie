<template>
  <div class="rom-title">
    <div v-if="rom.verified && ff.retroAchievements" class="rom-title__icon-wrapper">
      <Skeleton
        v-if="!iconLoaded && !iconError"
        width="3.25rem"
        height="3.25rem"
        border-radius="var(--radius-sm)"
      />
      <img
        v-show="iconLoaded"
        class="rom-title__icon"
        :src="iconUrl"
        @load="iconLoaded = true"
        @error="iconError = true"
      />
    </div>
    <span class="rom-title__text">{{ rom.displayName }}</span>
    <div class="rom-title__actions">
      <Button
        severity="secondary"
        variant="text"
        rounded
        aria-label="Favorite"
        :disabled="disabled"
        :loading="updating"
        :icon="rom.favorite ? 'pi pi-heart-fill' : 'pi pi-heart'"
        @click="emit('favorite', !rom.favorite)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';
import { useFeatureFlagStore } from '@/stores';

import type { Rom } from '@/types/rom';
import type { GameInfoAndUserProgress } from '@retroachievements/api';

const props = defineProps<{
  rom: Rom;
  romMetadataExtended: GameInfoAndUserProgress | null;
  /* Actions should be disabled */
  disabled: boolean;
  /* RA favorite update is being processed */
  updating: boolean;
  /* RA data is being loaded */
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'favorite', favorite: boolean): void;
}>();

const ff = useFeatureFlagStore();
const iconLoaded = ref(false);
const iconError = ref(false);

watch(
  () => props.rom.id,
  () => {
    iconLoaded.value = false;
    iconError.value = false;
  }
);

const iconUrl = computed(() => {
  if (props.romMetadataExtended?.imageIcon) {
    return `https://media.retroachievements.org/${props.romMetadataExtended.imageIcon}`;
  }
  return '';
});
</script>

<style scoped lang="less">
.rom-title {
  display: flex;
  align-items: center;
  gap: var(--space-4);

  &__icon {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    display: block;
    height: 3.25rem;
    width: 3.25rem;
    border-radius: var(--radius-sm);
  }
  &__text {
    flex-grow: 1;
  }
  &__actions {
    align-self: flex-start;
  }
}
</style>
