<template>
  <div v-if="rom" class="rom-details">
    <Card class="rom-details__card">
      <template #title>
        <RomTitle
          :rom="rom"
          :rom-metadata-extended="romMetadataExtended"
          :disabled="deleting"
          :updating="updating"
          :loading="loading"
          @favorite="handleFavorite"
        />
      </template>
      <template #subtitle>
        <div class="rom-details__subtitle">
          <div class="rom-details__subtitle-text">{{ systemDisplayName }}</div>
          <div class="rom-details__badges">
            <Tag
              v-if="rom.verified"
              v-tooltip="'Verified ROM with RetroAchievements support'"
              icon="pi pi-verified"
              size="small"
              value="Verified"
            />
          </div>
        </div>
      </template>
      <template #content>
        <div class="rom-details__content">
          <AchievementProgress
            v-if="rom.verified && ff.retroAchievements"
            :loading="loading"
            :total="romMetadataExtended?.numAchievements"
            :num-softcore="romMetadataExtended?.numAwardedToUser"
            :num-hardcore="romMetadataExtended?.numAwardedToUserHardcore"
          />
          <RecentAchievements
            v-if="rom.verified && ff.retroAchievements"
            :loading="loading"
            :achievements="romMetadataExtended?.achievements"
          />
          <ul class="rom-details__metadata">
            <li
              v-for="{ label, value } in romMetadata"
              :key="label"
              class="rom-details__metadata-item"
            >
              <span class="rom-details__metadata-label">{{ label }}:</span>
              <span class="rom-details__metadata-value">{{ value }}</span>
            </li>
            <li
              v-if="rom.ramd5"
              class="rom-details__metadata-item rom-details__metadata-item--hash"
            >
              <span class="rom-details__metadata-label">Hash:</span>
              <div class="rom-details__hash-container">
                <code class="rom-details__hash-value">{{ rom.ramd5 }}</code>
                <Button
                  icon="pi pi-copy"
                  size="small"
                  severity="secondary"
                  variant="text"
                  @click="copyHashToClipboard(rom.ramd5)"
                />
              </div>
            </li>
            <li v-else class="rom-details__metadata-item rom-details__metadata-item--hash">
              <span class="rom-details__metadata-label">MD5:</span>
              <div class="rom-details__hash-container">
                <code class="rom-details__hash-value">{{ rom.md5 }}</code>
                <Button
                  icon="pi pi-copy"
                  size="small"
                  severity="secondary"
                  variant="text"
                  @click="copyHashToClipboard(rom.md5)"
                />
              </div>
            </li>
          </ul>
          <div class="rom-details__tags">
            <TagsEditor :tags="rom?.tags || []" @update="handleTagUpdate" />
          </div>
          <div class="rom-details__actions">
            <Button
              severity="danger"
              label="Delete"
              icon="pi pi-trash"
              size="small"
              :rounded="true"
              :fluid="true"
              :disabled="updating"
              :loading="deleting"
              @click="handleDelete"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import log from 'electron-log/renderer';
import { computed, ref, watch } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import { useRomStore, useFeatureFlagStore } from '@/stores';
import { getSystemDisplayName } from '@/utils/systems';
import TagsEditor from '@/components/TagsEditor.vue';
import RomTitle from '@/components/RomTitle.vue';
import AchievementProgress from '@/components/achievements/AchievementProgress.vue';
import RecentAchievements from '@/components/achievements/RecentAchievements.vue';

import type { GameInfoAndUserProgress } from '@retroachievements/api';

const props = defineProps<{
  romId: string;
}>();
const emit = defineEmits<{
  (e: 'delete'): void;
  (e: 'favorite', favorite: boolean): void;
}>();
const romStore = useRomStore();
const ff = useFeatureFlagStore();
const toast = useToast();

const deleting = ref(false);
const updating = ref(false);
const loading = ref(false);
const romMetadataExtended = ref<GameInfoAndUserProgress | null>(null);

const rom = computed(() => romStore.getRomById(props.romId));
const systemDisplayName = computed(() =>
  rom.value ? getSystemDisplayName(rom.value.system) : null
);
const romMetadata = computed(() =>
  rom.value
    ? [
        { label: 'Size', value: formatSize(rom.value.size) },
        { label: 'Region', value: rom.value.region },
        { label: 'Imported on', value: formatDatetime(rom.value.createdAt.getTime()) },
        { label: 'Filename', value: rom.value.filename },
      ]
    : []
);

watch(
  rom,
  (newValue) => {
    romMetadataExtended.value = null;

    if (newValue?.verified) {
      loadExtendedRomInfo(newValue.id);
    }
  },
  { immediate: true }
);

async function loadExtendedRomInfo(romId: string) {
  if (!ff.retroAchievements) return;

  loading.value = true;
  try {
    romMetadataExtended.value = await romStore.loadMetadata(romId);
  } catch (error) {
    console.error('Failed to load extended ROM info:', error);
  } finally {
    loading.value = false;
  }
}

async function handleTagUpdate(tags: string[]) {
  updating.value = true;

  try {
    await romStore.updateRom(props.romId, { tags });
  } catch (error) {
    console.error('Failed to update tags:', error);
  } finally {
    updating.value = false;
  }
}

async function handleFavorite(value: boolean) {
  updating.value = true;

  try {
    await romStore.updateRom(props.romId, { favorite: value });
  } catch (error) {
    console.error('Failed to update favorite:', error);
  } finally {
    updating.value = false;
  }

  emit('favorite', value);
}

async function handleDelete() {
  const romName = rom.value?.displayName || 'Unknown';
  deleting.value = true;

  try {
    await romStore.removeRom(props.romId);

    toast.add({
      severity: 'success',
      summary: 'Delete Successful',
      detail: `Deleted ${romName}`,
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: `Failed to delete ${romName}`,
      life: 4000,
    });
    log.error('Failed to delete ROM:', error);
  } finally {
    deleting.value = false;
  }

  emit('delete');
}

async function copyHashToClipboard(hash: string) {
  if (!hash) return;

  try {
    await navigator.clipboard.writeText(hash);
    toast.add({
      severity: 'success',
      summary: 'Copied!',
      detail: 'Hash copied to clipboard',
      life: 2000,
    });
  } catch (error) {
    console.error('Failed to copy hash:', error);
  }
}

// Helpers for formatting
function formatSize(size: number): string {
  if (size < 1024) return size + ' bytes';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  return (size / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDatetime(ts: number): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);

  const now = new Date();
  const diffMs = now.getTime() - ts;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Same week (within past 6 days, not today)
  if (diffDays > 0 && diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  // Today
  if (
    now.getFullYear() === d.getFullYear() &&
    now.getMonth() === d.getMonth() &&
    now.getDate() === d.getDate()
  ) {
    return 'Today';
  }

  // This year
  if (now.getFullYear() === d.getFullYear()) {
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' }); // "January 5"
  }

  // Previous years
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }); // "Jan 5, 2024"
}
</script>

<style scoped lang="less">
.rom-details {
  width: 350px;
  height: 100%;
  padding: 12px;

  &__card {
    height: 100%;
  }

  &__subtitle {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: var(--space-6);
  }

  &__metadata {
    list-style: none;
    padding: 0;
    margin: 0;

    &-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      gap: 8px;
      flex-wrap: wrap;
    }

    &-label {
      text-transform: uppercase;
      font-size: 12px;
      opacity: 0.6;
    }

    &-value {
      font-size: 14px;
    }
  }

  &__hash-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    background: var(--p-badge-secondary-background);
    padding: 4px 6px;
    border-radius: 4px;
    word-break: break-all;
  }

  &__actions {
    margin-top: 16px;
  }
}
</style>
