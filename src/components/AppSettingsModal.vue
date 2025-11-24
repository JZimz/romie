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
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
const ff = useFeatureFlagStore();
const visible = ref(false);
const saving = ref(false);

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
