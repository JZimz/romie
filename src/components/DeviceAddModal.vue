<template>
  <Dialog
    :visible="visible"
    :header="`Add Device (${props.storageDevice.label})`"
    :style="{ width: '50vw' }"
    :modal="true"
    @show="handleShow"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="device-add-form">
      <div class="device-add-form__form-item">
        <label for="name">Device Name</label>
        <InputText id="name" v-model="deviceForm.name" aria-describedby="name-help" />
      </div>
      <div class="device-add-form__form-item">
        <label for="deviceprofile">Device Profile</label>
        <Select
          v-model="deviceForm.profileId"
          v-bind="deviceProfileOptions"
          option-value="value"
          option-label="name"
          placeholder="Select a Device Profile"
        />
        <Message size="small" severity="secondary" variant="simple"
          >Device profiles optimize how ROMie syncs and organizes your games based on your handheld
          device's operating system.</Message
        >
      </div>

      <div class="device-add-form__custom-profile">
        <div class="device-add-form__custom-profile-header">
          <span class="device-add-form__custom-profile-title">Custom Profile</span>
          <Button
            label="Download Template"
            icon="pi pi-download"
            severity="secondary"
            size="small"
            text
            @click="handleTemplateDownload"
          />
        </div>
        <p class="device-add-form__custom-profile-description">
          Don't see your device OS? Create a custom profile by downloading our template, modifying
          it for your device, and uploading it back.
        </p>
        <Message
          v-if="profileMessage"
          class="device-add-form__custom-profile-messages"
          :severity="profileMessage.severity"
          >{{ profileMessage.content }}</Message
        >
        <Button
          :loading="savingProfile"
          label="Upload Custom Profile"
          icon="pi pi-upload"
          severity="contrast"
          outlined
          @click="handleProfileUpload"
        />
      </div>
    </div>
    <template #footer>
      <Button label="Cancel" :disabled="saving" severity="secondary" @click="handleCancel" />
      <Button
        :label="saving ? 'Adding...' : 'Add Device'"
        :loading="saving"
        @click="handleSubmit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import log from 'electron-log/renderer';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { cloneProfile } from '@romie/device-profiles';
import { useDeviceStore } from '@/stores';
import { downloadJson } from '@/utils/file.utils';

import type { Device, StorageDevice } from '@/types/device';

interface ProfileOption {
  name: string;
  value?: string;
  items?: ProfileOption[];
}

const props = defineProps<{
  visible: boolean;
  storageDevice: StorageDevice;
}>();
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'created', device: Device): void;
}>();
const deviceStore = useDeviceStore();

const saving = ref(false);
const savingProfile = ref(false);
const profileMessage = ref<{ severity: string; content: string } | null>(null);
const deviceForm = ref({
  name: '',
  profileId: '',
});

const deviceProfileOptions = computed(() => {
  const builtInProfiles: ProfileOption[] = [];
  const customProfiles: ProfileOption[] = [];

  deviceStore.profiles.forEach((profile) => {
    const option = {
      name: profile.name,
      isBuiltIn: profile.isBuiltIn,
      value: profile.id,
    };
    if (profile.isBuiltIn) {
      builtInProfiles.push(option);
    } else {
      customProfiles.push(option);
    }
  });

  if (customProfiles.length === 0) {
    return {
      options: builtInProfiles,
    };
  }

  return {
    options: [
      { name: 'Standard Profiles', items: builtInProfiles },
      { name: 'Custom Profiles', items: customProfiles },
    ],
    optionGroupLabel: 'name',
    optionGroupChildren: 'items',
  };
});

onMounted(() => {
  deviceStore.loadDeviceProfiles();
});

function handleShow() {
  // Set default values for the form fields
  deviceForm.value.name = props.storageDevice?.label || '';
  deviceForm.value.profileId = 'onion-os';
}

function handleTemplateDownload() {
  const template = cloneProfile('knulli', 'Custom Profile');

  downloadJson(template, 'custom-device-profile.json');
}

async function handleProfileUpload() {
  savingProfile.value = true;
  profileMessage.value = null;

  try {
    const result = await window.device.uploadProfile();

    if (!result.success) {
      profileMessage.value = {
        severity: 'error',
        content: result.userMessage || 'Failed to upload profile.',
      };
      return;
    }
    // If the request was successful but no data was returned then the user canceled the file dialog.
    if (!result.data) return;

    await deviceStore.loadDeviceProfiles();
    deviceForm.value.profileId = result.data.id;
    profileMessage.value = {
      severity: 'success',
      content: `Profile "${result.data.name}" uploaded successfully!`,
    };
  } catch (error) {
    profileMessage.value = {
      severity: 'error',
      content: 'Failed to upload profile.',
    };
    log.error(error);
  } finally {
    savingProfile.value = false;
  }
}

function handleCancel() {
  // Reset the form fields
  deviceForm.value.name = '';
  deviceForm.value.profileId = '';

  // Close the modal
  emit('update:visible', false);
}

async function handleSubmit() {
  saving.value = true;
  const draftDevice: Omit<Device, 'id' | 'createdAt' | 'updatedAt'> = {
    name: deviceForm.value.name,
    profileId: deviceForm.value.profileId,
    deviceInfo: { ...props.storageDevice },
  };

  try {
    const newDevice = await window.device.create(draftDevice);

    await deviceStore.loadDevices();
    emit('created', newDevice);
  } catch (error) {
    log.error(error);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped lang="less">
.device-add-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__form-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__custom-profile {
    padding: 1rem;
    border: 1px solid var(--p-content-border-color);
    border-radius: var(--p-content-border-radius);
    background: var(--p-surface-50);
    margin-top: 0.5rem;

    &-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    &-title {
      font-weight: 600;
      color: var(--p-text-color);
    }

    &-description {
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
      margin: 0 0 1rem 0;
      line-height: 1.4;
    }

    &-messages {
      margin-bottom: 1rem;
    }
  }
}

@media (prefers-color-scheme: dark) {
  .device-add-form__custom-profile {
    background: var(--p-surface-800);
  }
}

.device-add-form__form-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.device-add-form__form-item label {
  font-weight: bold;
}

.device-add-form__form-item input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0.5rem;
}

.device-add-form__form-item select {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0.5rem;
}

.device-add-form__form-item .p-message {
  margin-top: 0.5rem;
}
</style>
