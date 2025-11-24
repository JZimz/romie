<template>
  <PageLayout class="device-add-view" title="Add Device">
    <template #subtitle>
      Select an SD card to sync your ROMs. ROMie will automatically organize and copy your games
      into the correct folders for your device’s operating system (e.g., <code>Roms/GBA</code>) when
      you’re ready.
    </template>
    <template v-if="message" #messages>
      <Message v-bind="message">{{ message.content }}</Message>
    </template>
    <template #actions>
      <div class="device-add-view__sd-grid-actions">
        <Button
          :label="loading ? 'Loading devices...' : 'Refresh device list'"
          size="small"
          :loading="loading"
          severity="secondary"
          variant="text"
          icon="pi pi-refresh"
          @click="fetchStorageDevices"
        />
      </div>
    </template>

    <div v-if="!loading" class="device-add-view__sd-grid">
      <div v-if="storageDevices.length === 0">
        No storage devices found. Please insert an SD card and try again.
      </div>
      <Card
        v-for="c in cards"
        v-else
        :key="c.uuid"
        class="device-add-view__sd-card"
        :class="{
          'device-add-view__sd-card--selected': selectedDevice === c,
        }"
        @click="selectCard(c)"
      >
        <template #title>
          <div class="data-row">
            <div>{{ c.label }}</div>

            <Tag severity="secondary">{{ c.fsType }}</Tag>
          </div>
        </template>
        <template #subtitle>
          <div class="data-row">
            <div>{{ c.mount }}</div>
            <div>{{ c.sizeText }}</div>
          </div>
        </template>
        <template #content>
          <div v-if="c.message" class="data-row">
            <Message :severity="c.severity" variant="simple">{{ c.message }}</Message>
          </div>
        </template>
      </Card>
    </div>

    <DeviceAddModal
      v-if="selectedDevice"
      v-model:visible="showDeviceAddModal"
      :storage-device="selectedDevice"
      @created="handleCreate"
    />
  </PageLayout>
</template>

<script setup lang="ts">
import log from 'electron-log/renderer';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDeviceStore } from '@/stores';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Message from 'primevue/message';
import PageLayout from '@/layouts/PageLayout.vue';
import DeviceAddModal from '@/components/DeviceAddModal.vue';

import type { Device, StorageDevice } from '@/types/device';

interface MessageData {
  severity: 'success' | 'info' | 'warn' | 'error';
  content: string;
  closable?: boolean;
}

interface CardData extends StorageDevice {
  sizeText: string;
  message: string | null;
  severity?: 'success' | 'info' | 'warn' | 'error';
}

const router = useRouter();
const toast = useToast();
const deviceStore = useDeviceStore();

const loading = ref(true);
const message = ref<MessageData | null>(null);
const storageDevices = ref<StorageDevice[]>([]);
const selectedDevice = ref<StorageDevice | null>(null);

onMounted(() => {
  fetchStorageDevices();
});

const showDeviceAddModal = ref(false);

const cards = computed<CardData[]>(() => {
  return storageDevices.value.map((d) => {
    // TODO: Add filesystem warnings
    // const okFs = ["FAT32", "MS-DOS FAT32", "exFAT"].includes(d.fsType);
    const existingDevice = deviceStore.devices.find((device) => device.deviceInfo.uuid === d.uuid);
    const message = existingDevice ? `Device already added to ${existingDevice.name}` : null;

    return {
      ...d,
      sizeText: formatBytes(d.size),
      message,
      severity: 'warn',
    };
  });
});

function formatBytes(n: number) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1000)));
  const value = n / Math.pow(1000, i);

  return `${Math.round(value)} ${units[i]}`;
}

async function fetchStorageDevices() {
  loading.value = true;
  message.value = null;

  try {
    const devices = await window.device.listStorage();
    storageDevices.value = devices;
  } catch (error) {
    message.value = {
      severity: 'error',
      content: 'Couldn’t fetch storage devices.',
    };
    log.error('Failed to fetch storage devices:', error);
  } finally {
    loading.value = false;
  }
}

function selectCard(sd: StorageDevice) {
  showDeviceAddModal.value = true;
  selectedDevice.value = sd;
}

function handleCreate(device: Device) {
  showDeviceAddModal.value = false;

  toast.add({
    severity: 'success',
    summary: 'Device Created',
    detail: `Device '${device.name}' has been created successfully.`,
    life: 3000,
  });

  router.push({
    name: 'device-detail',
    params: {
      deviceId: device.id || '1234',
    },
  });
}
</script>

<style scoped lang="less">
.device-add-view {
  &__sd-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
    align-items: stretch;

    .data-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  &__sd-grid-actions {
    padding: 0 8px;
    margin-bottom: var(--space-8);
  }

  &__sd-card {
    cursor: pointer;
    border: solid 1px transparent;

    // TODO: These colors look terrible in light mode
    &:hover {
      background-color: var(--p-surface-800);
      border-color: var(--p-list-option-selected-color);
    }

    &--selected {
      border-color: var(--p-list-option-selected-color);
    }
  }
}
</style>
