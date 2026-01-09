<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Preferences"
    :style="{
      width: '90vw',
      height: '80vh',
      maxWidth: '1000px',
      maxHeight: '700px',
    }"
    @show="handleShow"
  >
    <div class="settings-modal">
      <!-- Appearance Section -->
      <div class="settings-section">
        <h3 class="settings-section__title">Appearance</h3>
        <div class="settings-section__content">
          <div class="setting-item">
            <div class="setting-item__info">
              <label class="setting-item__label">Theme</label>
              <p class="setting-item__description">Sets the default theme for the application</p>
            </div>
            <div class="setting-item__control">
              <Select
                v-model="darkMode"
                :options="themeOptions"
                :fluid="true"
                option-label="label"
                option-value="value"
                placeholder="Select theme"
                size="small"
                @change="handleDarkModeChange"
              />
            </div>
          </div>
        </div>
      </div>

      <Divider />

      <!-- RetroAchievements Section -->
      <div class="settings-section">
        <h3 class="settings-section__title">RetroAchievements</h3>
        <div class="settings-section__content">
          <div class="setting-item">
            <div class="setting-item__info">
              <label class="setting-item__label">Enable Integration</label>
              <p class="setting-item__description">
                Connect to RetroAchievements for enhanced ROM data
              </p>
            </div>
            <div class="setting-item__control">
              <ToggleSwitch v-model="raEnabled" @change="handleRaToggle" />
            </div>
          </div>

          <template v-if="raEnabled && !ff.retroAchievements">
            <div class="setting-item">
              <div class="setting-item__info">
                <label class="setting-item__label" for="ra-username">Username</label>
                <p class="setting-item__description">Your RetroAchievements username</p>
              </div>
              <div class="setting-item__control">
                <InputText
                  id="ra-username"
                  v-model="raUsername"
                  :fluid="true"
                  placeholder="Enter your username"
                  size="small"
                />
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-item__info">
                <label class="setting-item__label" for="ra-api-key">API Key</label>
                <p class="setting-item__description">
                  <a class="settings-link" @click="openRaControlPanel"> Get your API key here </a>
                </p>
              </div>
              <div class="setting-item__control">
                <Password
                  id="ra-api-key"
                  v-model="raApiKey"
                  :fluid="true"
                  placeholder="Enter your API key"
                  size="small"
                  :feedback="false"
                  toggle-mask
                />
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-item__info"></div>
              <div class="setting-item__control">
                <Button
                  label="Save RetroAchievements"
                  size="small"
                  :loading="saving"
                  :disabled="!raUsername || !raApiKey"
                  @click="saveRaConfig"
                />
              </div>
            </div>
          </template>
          <template v-else-if="raEnabled && ff.retroAchievements">
            <div v-if="connectionStatus" class="setting-item">
              <Message
                v-if="connectionStatus.value"
                :severity="connectionStatus.severity"
                size="small"
              >
                <template #icon>
                  <Avatar
                    v-if="connectionStatus.value === 'connected' && raProfile?.userPic"
                    :image="`https://media.retroachievements.org${raProfile.userPic}`"
                    shape="circle"
                  />
                  <i
                    v-else
                    :class="{
                      'pi pi-spin pi-check': connectionStatus.value === 'connected',
                      'pi pi-spin pi-spinner': connectionStatus.value === 'loading',
                      'pi pi-times': connectionStatus.value === 'error',
                    }"
                  ></i>
                </template>
                <span>{{ connectionStatus.label }}</span>
              </Message>
            </div>
          </template>
        </div>
      </div>

      <Divider />

      <!-- Database Management Section -->
      <div class="settings-section">
        <h3 class="settings-section__title">Database Management</h3>
        <div class="settings-section__content">
          <div class="setting-item">
            <div class="setting-item__info">
              <label class="setting-item__label">Export Backup</label>
              <p class="setting-item__description">
                Save a zip file containing your ROMie database (ROMs, playlists, devices, and
                settings).
              </p>
            </div>
            <div class="setting-item__control">
              <Button
                label="Export"
                icon="pi pi-download"
                size="small"
                :loading="exportingBackup"
                :disabled="isDatabaseBusy"
                @click="handleExportBackup"
              />
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-item__info">
              <label class="setting-item__label">Restore Backup</label>
              <p class="setting-item__description">
                Restore from a zip backup. App restarts after import.
              </p>
            </div>
            <div class="setting-item__control">
              <Button
                label="Restore"
                icon="pi pi-upload"
                size="small"
                severity="secondary"
                :loading="importingBackup"
                :disabled="isDatabaseBusy"
                @click="confirmImportBackup"
              />
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-item__info">
              <label class="setting-item__label">Reset Database</label>
              <p class="setting-item__description">
                Clears all ROM entries, playlists, devices, and settings from ROMie. Your actual ROM
                files stay untouched.
              </p>
            </div>
            <div class="setting-item__control">
              <Button
                label="Reset"
                icon="pi pi-trash"
                size="small"
                severity="danger"
                :loading="resettingDatabase"
                :disabled="isDatabaseBusy"
                @click="openResetDialog"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <Dialog
      v-model:visible="resetDialogVisible"
      modal
      header="Reset database"
      append-to="body"
      :style="{ width: '34rem', maxWidth: '90vw' }"
    >
      <div class="reset-dialog">
        <p class="reset-dialog__warning">
          This will delete all your ROM entries, playlists, devices, and settings from ROMie. We
          recommend exporting a backup first.
        </p>

        <div class="reset-dialog__confirm">
          <label class="reset-dialog__label" for="reset-confirm-input"
            >Type DELETE to confirm</label
          >
          <InputText
            id="reset-confirm-input"
            v-model="resetConfirmText"
            :disabled="resettingDatabase"
            placeholder="DELETE"
            size="small"
            :fluid="true"
          />
        </div>

        <div class="reset-dialog__actions">
          <Button
            label="Cancel"
            severity="secondary"
            outlined
            size="small"
            :disabled="resettingDatabase"
            @click="closeResetDialog"
          />
          <Button
            label="Delete and Restart"
            severity="danger"
            size="small"
            :loading="resettingDatabase"
            :disabled="resettingDatabase || resetConfirmText !== 'DELETE'"
            @click="handleResetDatabase"
          />
        </div>
      </div>
    </Dialog>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import log from 'electron-log/renderer';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import Message from 'primevue/message';
import Avatar from 'primevue/avatar';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useFeatureFlagStore } from '@/stores';
import type { AppTheme } from '@/types/settings';
import type { UserProfile } from '@retroachievements/api';

defineExpose({
  show() {
    visible.value = true;
  },
  hide() {
    visible.value = false;
  },
});

const toast = useToast();
const confirm = useConfirm();
const ff = useFeatureFlagStore();
const visible = ref(false);
const saving = ref(false);

const exportingBackup = ref(false);
const importingBackup = ref(false);
const resettingDatabase = ref(false);
const resetDialogVisible = ref(false);
const resetConfirmText = ref('');

const isDatabaseBusy = computed(() =>
  [exportingBackup.value, importingBackup.value, resettingDatabase.value].some(Boolean)
);

// Appearance Settings
const darkMode = ref<AppTheme>('system');
const themeOptions = ref<Array<{ label: string; value: AppTheme }>>([
  { label: 'Use system setting', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
]);

// RetroAchievements Settings
const raEnabled = ref(false);
const hasUnsavedChanges = ref(false);
const raUsername = ref('');
const raApiKey = ref('');

const raProfile = ref<UserProfile | null>(null);
const connectionStatus = ref<{
  label: string;
  value: 'loading' | 'connected' | 'error' | 'invalid';
  severity: 'success' | 'danger' | 'warn' | 'secondary';
} | null>(null);

onMounted(() => {
  loadSettings();
});

async function loadSettings() {
  const { theme } = await window.settings.get();
  const raConfig = await window.ra.getConfig();

  darkMode.value = theme;
  raEnabled.value = !!raConfig;
  if (raConfig) {
    raUsername.value = raConfig.username;
    raApiKey.value = raConfig.apiKey;
  }
}

function openRaControlPanel() {
  window.util.openExternalLink('https://retroachievements.org/controlpanel.php');
}

async function handleDarkModeChange() {
  const isDark = await window.darkMode.value();

  // Toggle if the desired mode doesn't match the current mode
  if (darkMode.value === 'system') {
    window.darkMode.system();
  } else if ((darkMode.value === 'dark') !== isDark) {
    window.darkMode.toggle();
  }

  window.settings.update({ theme: darkMode.value });
}

async function saveRaConfig() {
  if (!raUsername.value || !raApiKey.value) return;
  const raConfig = {
    username: raUsername.value,
    apiKey: raApiKey.value,
  };
  saving.value = true;

  try {
    await window.ra.setConfig(raConfig);
    ff.setRetroAchievements(raConfig);
    testRaConnection();

    hasUnsavedChanges.value = false;
  } catch (error) {
    log.error('Failed to save RA configuration:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save RetroAchievements configuration. Please check your credentials.',
      life: 3000,
    });
  } finally {
    saving.value = false;
  }
}

async function testRaConnection() {
  connectionStatus.value = {
    label: 'Checking authentication...',
    value: 'loading',
    severity: 'secondary',
  };

  try {
    const profile = await window.ra.getUserProfile();

    if (profile) {
      connectionStatus.value = {
        label: `Connected as ${profile.user}`,
        value: 'connected',
        severity: 'success',
      };
      raProfile.value = profile;
    } else {
      connectionStatus.value = {
        label: 'Invalid credentials',
        value: 'invalid',
        severity: 'danger',
      };
    }
  } catch (error) {
    log.error('Failed to test RA connection:', error);
    connectionStatus.value = {
      label: 'Connection error',
      value: 'error',
      severity: 'danger',
    };
  }
}

async function handleShow() {
  // Reload settings to ensure the latest values are displayed
  await loadSettings();

  if (raEnabled.value) {
    testRaConnection();
  }
}

async function handleRaToggle() {
  if (!raEnabled.value) {
    // Disable integration - remove config
    try {
      await window.ra.removeConfig();

      raUsername.value = '';
      raApiKey.value = '';
      connectionStatus.value = null;
      hasUnsavedChanges.value = false;
      ff.setRetroAchievements(null);
    } catch (error) {
      console.error('Failed to remove RA configuration:', error);
    }
  }
}

async function handleExportBackup() {
  exportingBackup.value = true;

  try {
    const result = await window.db.exportBackup();

    if (!result.success) {
      log.error('Database backup export failed:', result.error);
      toast.add({
        severity: 'error',
        summary: 'Export Failed',
        detail: result.userMessage ?? 'Failed to export database backup.',
        life: 4000,
      });
      return;
    }

    if (result.data.canceled) return;

    toast.add({
      severity: 'success',
      summary: 'Backup Exported',
      detail: 'Database backup saved successfully.',
      life: 3000,
    });
  } catch (error) {
    log.error('Failed to export database backup:', error);
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: 'Failed to export database backup.',
      life: 4000,
    });
  } finally {
    exportingBackup.value = false;
  }
}

function confirmImportBackup() {
  confirm.require({
    header: 'Restore database',
    message:
      'Restoring a backup will replace your current database and restart the app. Export a backup first if you want to keep your current data.',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: 'Continue',
      severity: 'warn',
    },
    accept: handleImportBackup,
  });
}

async function handleImportBackup() {
  importingBackup.value = true;

  try {
    const result = await window.db.importBackup();

    if (!result.success) {
      log.error('Database backup restore failed:', result.error);
      toast.add({
        severity: 'error',
        summary: 'Restore Failed',
        detail: result.userMessage ?? 'Failed to restore database backup.',
        life: 4000,
      });
      return;
    }

    if (result.data.canceled) return;

    toast.add({
      severity: 'warn',
      summary: 'Restore Complete',
      detail: 'Database restored. Restarting ROMie...',
      life: 3000,
    });
  } catch (error) {
    log.error('Failed to restore database backup:', error);
    toast.add({
      severity: 'error',
      summary: 'Restore Failed',
      detail: 'Failed to restore database backup.',
      life: 4000,
    });
  } finally {
    importingBackup.value = false;
  }
}

function openResetDialog() {
  resetConfirmText.value = '';
  resetDialogVisible.value = true;
}

function closeResetDialog() {
  resetDialogVisible.value = false;
}

async function handleResetDatabase() {
  resettingDatabase.value = true;

  try {
    const result = await window.db.reset();

    if (!result.success) {
      log.error('Database reset failed:', result.error);
      toast.add({
        severity: 'error',
        summary: 'Reset Failed',
        detail: result.userMessage ?? 'Failed to reset database.',
        life: 4000,
      });
      return;
    }

    toast.add({
      severity: 'warn',
      summary: 'Reset Complete',
      detail: 'Database deleted. Restarting ROMie...',
      life: 3000,
    });
    closeResetDialog();
  } catch (error) {
    log.error('Failed to reset database:', error);
    toast.add({
      severity: 'error',
      summary: 'Reset Failed',
      detail: 'Failed to reset database.',
      life: 4000,
    });
  } finally {
    resettingDatabase.value = false;
  }
}
</script>

<style scoped lang="less">
.settings-modal {
  padding: 1rem;
}

.settings-section {
  margin-bottom: 2rem;

  &__title {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--p-text-color);
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }
}

.setting-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;

  &__info {
    flex: 1;
    min-width: 0;
  }

  &__label {
    display: block;
    font-weight: 500;
    color: var(--p-text-color);
    margin-bottom: 0.25rem;
  }

  &__description {
    margin: 0;
    font-size: 0.875rem;
    color: var(--p-text-muted-color);
    line-height: 1.4;
  }

  &__control {
    flex-shrink: 0;
    min-width: 200px;
  }
}

.settings-link {
  color: var(--p-primary-color);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    cursor: pointer;
  }
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &__placeholder {
    font-size: 0.875rem;
    color: var(--p-text-muted-color);
    font-style: italic;
  }
}

.reset-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__warning {
    margin: 0;
    line-height: 1.4;
    color: var(--p-text-color);
  }

  &__confirm {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__label {
    font-weight: 500;
    color: var(--p-text-color);
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }
}

@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;

    &__control {
      min-width: auto;
    }
  }
}
</style>
