<template>
  <Card class="sync-results">
    <template #title>Sync Results</template>
    <template #subtitle>Every single problem, because you asked for it.</template>
    <template #content>
      <div class="sync-results__problems">
        <!-- Failed files -->
        <div v-for="failure in filesFailed" :key="failure.rom.id" class="sync-problem">
          <i class="pi pi-times sync-problem__icon sync-problem__icon--error"></i>
          <span class="sync-problem__name">{{ failure.rom.displayName }}</span>
          <span class="sync-problem__reason">{{ failure.error.message }}</span>
        </div>

        <!-- Skipped files -->
        <div v-for="skip in filesSkipped" :key="skip.rom.id" class="sync-problem">
          <i class="pi pi-minus-circle sync-problem__icon sync-problem__icon--skip"></i>
          <span class="sync-problem__name">{{ skip.rom.displayName }}</span>
          <span class="sync-problem__reason">{{ skip.details }}</span>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import Card from 'primevue/card';
import type { SyncFailReason, SyncSkipReason } from '@/types/electron-api';

withDefaults(
  defineProps<{
    filesFailed?: SyncFailReason[];
    filesSkipped?: SyncSkipReason[];
  }>(),
  {
    filesFailed: () => [],
    filesSkipped: () => [],
  }
);
</script>

<style scoped lang="less">
.sync-problems {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.sync-problem {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-4);

  &__icon {
    flex-shrink: 0;

    &--error {
      color: var(--p-red-500);
    }

    &--skip {
      color: var(--p-yellow-500);
    }
  }

  &__name {
    font-weight: 500;
    min-width: 200px;
  }

  &__reason {
    color: var(--p-text-muted-color);
    font-size: var(--text-sm);
  }
}
</style>
