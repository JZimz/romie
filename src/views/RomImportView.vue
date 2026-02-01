<template>
  <PageLayout class="rom-import" title="ROM Import" subtitle="Add ROM files to your library">
    <template #actions>
      <div class="rom-import__actions">
        <Button
          size="large"
          severity="primary"
          icon="pi pi-search-plus"
          :label="scanLabel"
          :loading="processingState === 'scanning'"
          :disabled="isProcessing || isRefreshing"
          @click="handleScan"
        />
        <Button
          class="rom-import__refresh-button"
          size="large"
          severity="secondary"
          icon="pi pi-refresh"
          label="Refresh Library"
          :loading="isRefreshing"
          :disabled="isRefreshing || isProcessing"
          @click="handleRefresh"
        />
        <div class="rom-import__supported-info">
          <strong>Supported file extensions:</strong> {{ supportedExtensions }}
        </div>
      </div>
    </template>

    <div class="rom-import__content">
      <div v-if="isProcessing" class="rom-import__progress">
        <span v-if="currentFile">
          <i class="pi pi-file"></i>
          Processing {{ currentFile }}...
        </span>
        <span v-else>Preparing files...</span>
      </div>
      <div v-if="!isProcessing && result" class="rom-import__results">
        <div class="rom-import__results-summary">
          <h3 v-if="result.successes > 0" class="rom-import__result-header">
            <i class="pi pi-check-circle success-icon"></i>
            {{ result.successes }} ROM{{ result.successes === 1 ? '' : 's' }}
            were added successfully
          </h3>
          <h3 v-else class="rom-import__result-header">
            <i class="pi pi-times error-icon"></i>
            No ROMs were imported successfully
          </h3>
        </div>

        <div v-if="result.warnings.length > 0" class="rom-import__results-summary">
          <h3 class="rom-import__result-header">
            <i class="pi pi-exclamation-triangle warning-icon"></i>
            {{ result.warnings.length }}
            {{ result.warnings.length === 1 ? 'duplicate' : 'duplicates' }}
            ignored
            <!-- <div class="rom-import__result-header-text">Duplicates detected by filename check</div> -->
            <div class="rom-import__result-header-subtitle">
              Duplicates detected by file content check (MD5 hash)
            </div>
          </h3>
          <div class="rom-import__result-content">
            <ul>
              <li v-for="message in result.warnings" :key="message">
                {{ message }}
              </li>
            </ul>
          </div>
        </div>

        <div v-if="result.errors.length > 0" class="rom-import__results-summary">
          <h3 class="rom-import__result-header">
            <i class="pi pi-exclamation-circle error-icon"></i>
            {{ result.errors.length }}
            {{ result.errors.length === 1 ? 'file' : 'files' }} could not be imported
          </h3>
          <div class="rom-import__result-content">
            <ul>
              <li v-for="message in result.errors" :key="message">
                {{ message }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import log from 'electron-log/renderer';
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useRomStore } from '@/stores';
import PageLayout from '@/layouts/PageLayout.vue';
import { getAllSupportedExtensions } from '@/utils/systems';

import type { RomImportResult } from '@/types/electron-api';

const romStore = useRomStore();
const toast = useToast();
const processingState = ref<'idle' | 'scanning'>('idle');
const currentFile = ref('');
const isRefreshing = ref(false);

const result = ref<{
  errors: string[];
  warnings: string[];
  successes: number;
  total: number;
} | null>(null);

const supportedExtensions = getAllSupportedExtensions().join(', ');

const isProcessing = computed(() => processingState.value !== 'idle');

const scanLabel = computed(() => {
  if (processingState.value === 'scanning') return 'Scanning directory...';
  return 'Scan folder';
});

function showGenericError(operation: string) {
  toast.add({
    severity: 'error',
    summary: 'Sorry, something went wrong',
    detail: `We couldn't complete the ${operation}. Please try again.`,
    life: 4000,
  });
}

async function handleScan() {
  processingState.value = 'scanning';
  result.value = null;
  currentFile.value = '';

  const unsubscribeImportStatus = window.rom.onImportProgress((status) => {
    currentFile.value = status.currentFile;
  });

  try {
    const result = await romStore.scanRomDir();
    processImportResult(result);
  } catch (error) {
    showGenericError('scan');
    log.error('ROM import scan failed:', error);
  } finally {
    processingState.value = 'idle';
    unsubscribeImportStatus();
  }
}

async function handleRefresh() {
  isRefreshing.value = true;

  try {
    await romStore.refreshRomAvailability();
    toast.add({
      severity: 'success',
      summary: 'Library Refreshed',
      detail: 'ROM file availability has been updated.',
      life: 3000,
    });
  } catch (error) {
    showGenericError('refresh');
    log.error('ROM library refresh failed:', error);
  } finally {
    isRefreshing.value = false;
  }
}

function processImportResult(importResult: RomImportResult) {
  log.debug('Processing import result');
  if (importResult.canceled) return;

  const errors: string[] = [];
  const warnings: string[] = [];

  importResult.failed.forEach((error) => {
    if (error.reason.includes('already exists (duplicate of')) {
      const fileName = error.file.split(/[/\\]/).pop() || error.file;

      warnings.push(fileName);
    } else {
      errors.push(`${error.file}: ${error.reason}`);
    }
  });

  result.value = {
    successes: importResult.totalProcessed,
    errors,
    warnings,
    total: importResult.totalProcessed
      ? importResult.totalProcessed
      : importResult.imported.length + importResult.failed.length,
  };
}
</script>

<style scoped lang="less">
.rom-import {
  &__actions {
    padding: 0 var(--space-10);
  }

  &__refresh-button {
    margin-left: var(--space-6);
  }

  &__result-header {
    &-subtitle {
      margin-left: 22px;
      font-size: var(--font-size-sm);
      color: var(--p-text-muted-color);
    }
  }

  &__supported-info {
    color: var(--p-text-muted-color);
    font-size: var(--font-size-sm);
    max-width: 275px;
    margin-top: 6px;
  }

  &__progress,
  &__results {
    margin-top: 2rem;
  }

  &__results-summary {
    margin-top: 1rem;

    .pi {
      margin-right: 4px;
    }

    .success-icon {
      color: var(--p-green-400);
    }

    .warning-icon {
      color: var(--p-yellow-400);
    }

    .error-icon {
      color: var(--p-red-400);
    }
  }
}
</style>
