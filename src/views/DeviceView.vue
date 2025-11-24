<template>
  <PageLayout class="device-view" :title="device?.name">
    <template #subtitle> Sync ROM files to your device </template>

    <div class="device-view__content">
      <!-- Device Status Section -->
      <Card class="device-view__status-card">
        <template #title>Device Status</template>
        <template #content>
          <div class="device-status">
            <div class="device-status__item">
              <i class="device-status__icon pi pi-microchip"></i>
              <span class="device-status__label"
                >{{ device?.deviceInfo?.label || 'unknown' }}:</span
              >
              <Tag
                v-if="deviceStatus?.accessible"
                icon="pi pi-check"
                severity="success"
                value="Connected"
              ></Tag>
              <Tag v-else icon="pi pi-times" severity="danger" value="Disconnected"></Tag>
            </div>
            <div class="device-status__item">
              <i class="device-status__icon pi pi-cog"></i>
              <span class="device-status__label">Device Profile:</span>
              <div class="device-view__profile">
                <Tag :value="deviceProfile?.name" severity="secondary" @click="op.toggle($event)" />
                <Popover ref="op">
                  <div v-if="deviceProfile" class="device-profile-summary">
                    <div class="device-profile-summary__base-path">
                      <strong>Base Directory:</strong>
                      {{ deviceProfile.romBasePath }}
                    </div>
                    <div class="device-profile-summary__mappings">
                      <strong>System folder mappings:</strong>
                      <div
                        v-for="mapping in deviceProfileMappings"
                        :key="mapping.code"
                        class="device-profile-summary__mapping"
                      >
                        <span class="device-profile-summary__system">{{
                          mapping.displayName
                        }}</span>
                        →
                        <code class="device-profile-summary__folder">{{ mapping.folderName }}</code>
                      </div>
                    </div>
                  </div>
                </Popover>
              </div>
            </div>
            <div v-if="deviceStatus?.accessible" class="device-status__item">
              <i class="device-status__icon pi pi-database"></i>
              <span class="device-status__label">Available Space:</span>
              <span class="device-status__value">{{ deviceStatus?.freeSpace }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Tag Selection Section -->
      <Card v-if="syncStatus.phase === 'idle'" class="device-view__tag-card">
        <template #title>Tags to Sync</template>
        <template #subtitle>
          Syncing copies your selected ROMs to the device. Existing ROMs and saves stay safe unless
          you choose to clean the destination first.
        </template>
        <template #content>
          <div class="tag-selection">
            <div class="tag-selection__input">
              <MultiSelect
                v-model="selectedTags"
                :options="availableTags"
                option-label="tag"
                placeholder="Choose tags to sync"
                class="w-full"
                :max-selected-labels="3"
              />
              <div class="tag-selection__pills">
                <Chip
                  v-for="{ tag } in selectedTags"
                  :key="tag"
                  removable
                  @remove="unselectTag(tag)"
                >
                  {{ tag }}
                </Chip>
              </div>
            </div>

            <div class="tag-selection__controls">
              <div class="tag-selection__actions">
                <Button
                  label="Start Sync"
                  icon="pi pi-sync"
                  :disabled="!canStartSync"
                  class="tag-selection__sync-button"
                  @click="startSync"
                />
                <small v-if="totalSelectedRoms > 0" class="tag-selection__action-subtitle">
                  Syncing {{ totalSelectedRoms }} ROMs ({{ formatFileSize(totalSelectedSize) }})
                  will take approximately {{ estimatedSyncTime }}
                </small>
              </div>
              <div class="tag-selection__options">
                <div class="tag-selection__option">
                  <Checkbox
                    v-model="syncOptions.cleanDestination"
                    input-id="clean-destination"
                    binary
                  />
                  <div class="tag-selection__option-content">
                    <label for="clean-destination" class="tag-selection__option-label"
                      >Clean destination before sync</label
                    >
                    <small class="tag-selection__option-subtitle"
                      >Removes everything in <code>{{ deviceProfile?.romBasePath }}</code> before
                      syncing</small
                    >
                  </div>
                </div>
                <div class="tag-selection__option">
                  <Checkbox v-model="syncOptions.useCleanNames" input-id="clean-names" binary />
                  <div class="tag-selection__option-content">
                    <label for="clean-names" class="tag-selection__option-label"
                      >Simplify filenames</label
                    >
                    <small class="tag-selection__option-subtitle"
                      >Copies as "Super Metroid.sfc" instead of "Super Metroid (Japan, USA)
                      (En,Ja).sfc"</small
                    >
                  </div>
                </div>
                <div class="tag-selection__option">
                  <Checkbox v-model="syncOptions.verifyFiles" input-id="verify-files" binary />
                  <div class="tag-selection__option-content">
                    <label for="verify-files" class="tag-selection__option-label"
                      >Verify files after copy</label
                    >
                    <small class="tag-selection__option-subtitle"
                      >Double-checks your ROMs made it safely (a little slower but safer)</small
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Sync Progress Section -->
      <SyncProgress
        v-if="syncStatus.phase !== 'idle'"
        :title="syncStatus.phase === 'done' ? '🎉' : 'Syncing...'"
        :sync-status="syncStatus"
        :sync-summary="syncSummaryMessages"
        :sync-error="syncError"
        :show-sync-results="showSyncResults"
        @toggle-sync-results="showSyncResults = !showSyncResults"
        @cancel-sync="cancelSync"
      >
        <template v-if="syncStatus.phase !== 'done'" #subtitle>
          Syncing {{ totalSelectedRoms }} ROMs ({{ formatFileSize(totalSelectedSize) }}) should take
          approximately {{ estimatedSyncTime }}
        </template>
      </SyncProgress>

      <!-- Sync Results Section -->
      <SyncResults
        v-if="showSyncResults && syncStatus.phase === 'done'"
        :files-failed="syncStatus.filesFailed"
        :files-skipped="syncStatus.filesSkipped"
      />
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import PageLayout from '@/layouts/PageLayout.vue';
import Card from 'primevue/card';
import Chip from 'primevue/chip';
import Tag from 'primevue/tag';
import MultiSelect from 'primevue/multiselect';
import Popover from 'primevue/popover';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import { useDeviceStore, useRomStore } from '@/stores';
import { useSyncLogic } from '@/composables/useSyncLogic';
import SyncProgress from '@/components/device/SyncProgress.vue';
import SyncResults from '@/components/device/SyncResults.vue';

import { getSystemDisplayName } from '@/utils/systems';

import { Device } from '@/types/device';
import { TagStats } from '@/types/rom';
import type { SyncOptions, DeviceMountStatus } from '@/types/electron-api';
import type { SystemCode } from '@/types/system';
import type { DeviceSystemProfile } from '@romie/device-profiles';

const props = defineProps<{
  deviceId: string;
}>();

const op = ref();
const deviceStore = useDeviceStore();
const romStore = useRomStore();
const device = ref<Device | null>(null);
const deviceStatus = ref<DeviceMountStatus | null>(null);
const selectedTags = ref<TagStats[]>([]);

const syncOptions = ref<SyncOptions>({
  cleanDestination: false,
  verifyFiles: true,
  useCleanNames: true,
});

// Extract sync logic to composable
const {
  syncError,
  syncStatus,
  showSyncResults,
  syncSummaryMessages,
  startSync: syncLogicStartSync,
  cancelSync,
} = useSyncLogic(props.deviceId);

watchEffect(async () => {
  device.value = await deviceStore.loadDeviceById(props.deviceId);
  deviceStatus.value = await window.device.checkDeviceMount(props.deviceId);
  deviceStore.loadDeviceProfiles();
});

// Computed properties
const deviceProfile = computed(() => {
  const profile = deviceStore.profiles.find(({ id }) => id === device.value?.profileId);

  return profile || null;
});
const deviceProfileMappings = computed(() => {
  if (!deviceProfile.value) return [];

  return Object.entries(deviceProfile.value.systemMappings).map((entry) => {
    const [code, mapping] = entry as [SystemCode, DeviceSystemProfile];

    return {
      code,
      folderName: mapping.folderName,
      displayName: getSystemDisplayName(code),
    };
  });
});
const availableTags = computed((): TagStats[] => {
  return Object.values(romStore.stats.tagStats);
});
const romsForSelectedTags = computed(() => {
  return romStore.roms.filter((r) => {
    return selectedTags.value.some(({ tag }) => {
      return r.tags?.includes(tag);
    });
  });
});
const totalSelectedRoms = computed(() => {
  return romsForSelectedTags.value.length;
});
const totalSelectedSize = computed(() => {
  return romsForSelectedTags.value.reduce((total, rom) => total + rom.size, 0);
});

const estimatedSyncTime = computed(() => {
  const sizeInGB = totalSelectedSize.value / (1024 * 1024 * 1024);
  const minutes = Math.ceil(sizeInGB * 2); // Rough estimate: 2 minutes per GB
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
});

const canStartSync = computed(() => {
  return (
    deviceStatus.value?.accessible &&
    selectedTags.value.length > 0 &&
    syncStatus.value.phase === 'idle'
  );
});

// Methods

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

async function startSync() {
  const selectedTagIds = selectedTags.value.map(({ tag }) => tag);
  await syncLogicStartSync(selectedTagIds, syncOptions.value);
}

function unselectTag(tagId: string) {
  selectedTags.value = selectedTags.value.filter(({ tag }) => tag !== tagId);
}
</script>

<style lang="less" scoped>
.device-view {
  .error {
    color: var(--p-red-500);
  }
  .success {
    color: var(--p-green-500);
  }

  &__content {
    max-width: 48rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  &__profile {
    cursor: pointer;
  }
}

.tag-selection {
  display: flex;
  flex-direction: column;
  margin-top: var(--space-8);
  gap: var(--space-20);

  &__pills {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
    margin-top: var(--space-6);
  }

  &__controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  &__sync-button {
    align-self: flex-start;
    min-width: 200px;
  }

  &__options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__option {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  &__option-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  &__option-label {
    cursor: pointer;
    font-weight: 500;
    line-height: 1.2;
  }

  &__action-subtitle,
  &__option-subtitle {
    color: var(--p-text-muted-color);
    font-size: 0.85rem;
    line-height: 1.3;
    margin: 0;
  }
}

.device-status {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__icon {
    width: 1.5rem;
    color: var(--primary-color);
  }

  &__label {
    font-weight: 600;
    min-width: 120px;
  }

  &__value {
    font-weight: 500;
  }
}

.device-profile-summary {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 300px;
  max-width: 450px;
  max-height: calc(100vh - 275px);
  overflow-y: auto;

  &__base-path {
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--p-content-border-color);
  }

  &__mappings {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__mapping {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  &__system {
    font-weight: 500;
    min-width: 120px;
  }

  &__folder {
    background: var(--p-surface-100);
    padding: 0.125rem 0.375rem;
    border-radius: var(--p-border-radius-sm);
    font-size: 0.8rem;
    color: var(--p-text-color);
  }
}

@media (prefers-color-scheme: dark) {
  .device-profile-summary__folder {
    background: var(--p-surface-800);
  }
}

@media (max-width: 768px) {
  .device-status {
    gap: 0.75rem;

    &__item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    &__label {
      min-width: auto;
    }
  }

  .tag-selection {
    &__pills {
      flex-direction: column;
    }

    &__sync-button {
      min-width: auto;
      align-self: stretch;
    }

    &__options {
      gap: 1rem;
    }
  }

  .device-profile-summary {
    min-width: 250px;
    max-width: 300px;

    &__system {
      min-width: 100px;
    }
  }
}
</style>
